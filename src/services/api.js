/**
 * 圆桌会 API — 基于李继刚 ljg-roundtable 技能
 */
const URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

const SYSTEM_PROMPT = `你是李继刚"圆桌讨论"技能驱动的对话引擎。严格按以下框架运行，但输出为自然群聊格式。

## 核心框架（不可偏离）

### 1. 选人
根据议题选3-5位**真实历史/当代人物**。必须：真实人物（如尼采、王阳明、鲁迅、波伏娃），立场形成张力网络，至少一位意外视角。

主持人用自然语言介绍参会者：
主持人：今天讨论「{议题}」。我邀请了 [列出3-5人，每人一句话简介+立场]

### 2. 开场
主持人提出定义性问题，然后各位依次发言。

### 3. 辩论循环
- 发言必须回应前面的人，引用其经典观点
- 主持人在适当时候做简短综述，提炼核心争议点
- 主持人偶尔提出深层引导问题
- 像真人群聊：有锋芒、可质疑、可赞同

### 4. 用户互动
用户可能：继续讨论/质疑/换角度/要求总结/请新人物加入
自然回应，保持对话流畅。

## 输出格式（铁律）
名字：发言内容

主持人发言：
主持人：发言内容

每段发言3-5句话，像真人聊天。不要用【】符号，不要行动标签。
不要编造人物名。必须使用真实历史/当代人物。`;

function getApiKey() {
  const key = localStorage.getItem('deepseek_api_key');
  if (!key) throw new Error('未设置 API Key');
  return key;
}
export function setApiKey(k) { localStorage.setItem('deepseek_api_key', k.trim()); }
export function getStoredApiKey() { return localStorage.getItem('deepseek_api_key') || ''; }

export async function* streamChat(messages) {
  const apiKey = getApiKey();
  const resp = await fetch(URL, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, system: SYSTEM_PROMPT, messages, max_tokens: 8192, stream: true }),
  });
  if (!resp.ok) { const e = await resp.text(); throw new Error(`API ${resp.status}`); }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() || "";
    for (const l of lines) {
      if (l.startsWith("data: ")) try {
        const d = JSON.parse(l.slice(6));
        if (d.type === "content_block_delta") { const t = d.delta?.text; if (t) yield { text: t }; }
        else if (d.type === "message_stop") yield { done: true };
      } catch {}
    }
  }
}

/**
 * 渐进式解析：边流边拆名字：内容
 * 返回当前已完成的完整消息 + 当前正在输入的消息
 */
export function progressiveParse(fullText) {
  const messages = [];
  const lines = fullText.split("\n");
  let current = null;

  for (const line of lines) {
    const match = line.match(/^(.{1,10})[：:]\s*(.+)/);
    if (match && !line.startsWith("http")) {
      if (current && current.content.trim()) messages.push(current);
      current = { type: "speech", name: match[1].trim(), content: match[2] };
    } else if (current) {
      current.content += "\n" + line;
    }
  }

  if (current && current.content.trim()) {
    messages.push({ ...current, isComplete: true });
  }

  // The last message might be incomplete (still streaming)
  // Mark all except the last as complete
  if (messages.length > 0) {
    messages[messages.length - 1] = { ...messages[messages.length - 1], isComplete: true };
  }

  // Return the current streaming line if any
  const lastLine = lines[lines.length - 1] || "";
  const streamingMatch = lastLine.match(/^(.{1,10})[：:]\s*(.+)/);
  let streamingMsg = null;
  if (streamingMatch && !lastLine.startsWith("http")) {
    streamingMsg = { type: "speech", name: streamingMatch[1].trim(), content: streamingMatch[2], isStreaming: true };
  }

  return { messages, streamingMsg };
}
