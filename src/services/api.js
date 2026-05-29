/**
 * 圆桌会 API 服务
 * DeepSeek API 直连 + 响应解析
 */

const DEEPSEEK_URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

const SYSTEM_PROMPT = `你是一个群聊里的多位AI人物。像微信群聊一样自然对话。

## 人物创建
当用户提出一个话题时，你先简短宣布参会人物（每人一句话姓名+立场），然后大家开始像朋友群聊一样自然地讨论。不需要MBTI，不需要正式格式。

## 发言格式（重要！）
每个人物发言格式：
名字：发言内容

主持人发言格式：
主持人：发言内容

每段发言要像真人聊天一样自然、有锋芒。引用经典观点但不要背书腔。可以质疑、开玩笑、跑题再拉回来。像深夜朋友群聊。

## 讨论节奏
- 每轮选2-3人发言即可，不用所有人都说
- 有人说完，其他人可以接话、反驳、补充
- 主持人偶尔引导一下深层问题
- 每段发言控制在手机屏幕能看完的长度（3-5句话）
- 讨论3-4轮后主持人可以做个简短小结

## 用户互动
用户可能会：
- 继续讨论 → 接着聊
- 提出质疑 → 人物回应
- 换个话题 → 重新开聊
- 要求总结 → 主持人总结
- 邀请新人物 → 新人物加入群聊
- 查看之前的观点 → 回顾讨论

你要像真人群聊一样自然回应。`;

function getApiKey() {
  const key = localStorage.getItem('deepseek_api_key');
  if (!key) throw new Error('未设置 API Key。请点击左上角 ⚙️ 设置。');
  return key;
}

export function setApiKey(key) { localStorage.setItem('deepseek_api_key', key.trim()); }
export function getStoredApiKey() { return localStorage.getItem('deepseek_api_key') || ''; }

/**
 * 流式调用 DeepSeek
 */
export async function* streamChat(messages) {
  const apiKey = getApiKey();
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, system: SYSTEM_PROMPT, messages, max_tokens: 8192, stream: true }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "content_block_delta") {
            const text = data.delta?.text || "";
            if (text) yield { text };
          } else if (data.type === "message_stop") {
            yield { done: true };
          }
        } catch {}
      }
    }
  }
}

/**
 * 解析 AI 回复为消息列表
 * 格式：名字：内容 / 主持人：内容
 */
export function parseResponse(text) {
  const messages = [];
  const lines = text.split("\n");
  let currentName = null;
  let currentContent = [];

  function flushMessage() {
    if (currentName && currentContent.length) {
      const content = currentContent.join("\n").trim();
      if (content) {
        messages.push({
          type: "speech",
          name: currentName,
          content,
        });
      }
    }
    currentContent = [];
  }

  for (const line of lines) {
    // Match "名字：内容" or "名字: 内容"
    const match = line.match(/^(.{1,8})[：:]\s*(.+)/);
    if (match && !line.startsWith("http") && line.length < 200) {
      flushMessage();
      currentName = match[1].trim();
      currentContent = [match[2]];
    } else if (currentName) {
      currentContent.push(line);
    }
  }
  flushMessage();
  return messages;
}
