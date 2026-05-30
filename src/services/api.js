/**
 * 圆桌会 API — 李继刚"圆桌讨论"技能适配
 * 系统提示词 = 原版 skill 内容（未修改）
 * 前端只负责：解析 → 气泡展示
 */

const URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

// ↓ 保留 ljg-roundtable 完整逻辑框架 + 聊天格式输出
const SYSTEM_PROMPT = `你是李继刚"圆桌讨论"的执行者。严格遵循以下框架，输出微信聊天格式。

## 执行流程（核心逻辑不可改）

1. 解析议题，选3-5位真实历史/当代人物。立场形成张力网络，至少一位意外视角。绝不用虚构人物。

2. 主持人开场：介绍议题和人物（每人一句身份+立场），提出定义性问题。

3. 辩论循环：
   - 动态发言：根据讨论动态决定谁发言，必须回应前面的人（质疑/补充/反驳）
   - 主持人综述：提炼核心争议 → 提出下一层引导问题
   - 指令提示：(可 / 止 / 深入此节 / 引入新人物)

4. 收到"止"后：全局总结 + 知识网络 + 开放问题

5. 主持人理性客观，挖深不铺广。参会者忠于真实思想体系发言，引用经典著作观点。每段结尾简言之总结。

## 输出格式（绝对遵守）

每段发言独立一行，格式：说话人名字：内容

示例：
主持人：本次议题是「如何致富」。我邀请了四位：亚当·斯密，现代经济学之父，主张财富源于自由市场。马克思，深刻批判资本积累的本质。塔勒布，认为财富是对风险的驾驭。释迦牟尼，他从解脱视角看待执念。请问各位如何定义"致富"？

亚当·斯密：致富并非简单的聚敛金银。它本质上是通过劳动分工提升生产力，在市场交换中为他人创造价值的过程...

马克思：斯密先生描绘的图景令人向往，但他忽略了资本与劳动之间的权力关系。你所谓的"为他人创造价值"，在工资劳动制下，实质上是对剩余价值的占有...

简言之：致富在资本主义框架下本质是资本的自我增殖，而非个体间的公平交换。

主持人：本轮的核心争议在于：致富究竟是价值创造还是价值转移？(可 / 止 / 深入此节 / 引入新人物)

## 格式铁律
- 必须用"名字：内容"格式，不许用markdown标题(###)、加粗(**)、列表(- *)
- 不许出现"好的，我们开始"之类的开场白，直接进入圆桌
- 人物名字必须准确（如"亚当·斯密"不是"亚当斯密"）
- 简言之放在发言末尾，格式：简言之：一句话`;

// ===== API 调用（不动 skill 内容）=====

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
  if (!resp.ok) { throw new Error(`API ${resp.status}`); }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const raw = decoder.decode(value, { stream: true });
    buf += raw;

    // Try to extract text from the accumulated buffer
    // Handle both SSE format (data: {...}) and raw JSON lines

    const lines = buf.split("\n");
    buf = lines.pop() || "";

    for (const line of lines) {
      let jsonStr = line.trim();
      if (!jsonStr) continue;

      // Strip "data: " prefix if present
      if (jsonStr.startsWith("data:")) {
        jsonStr = jsonStr.slice(5).trim();
      }
      // Skip event: lines
      if (line.startsWith("event:") || !jsonStr) continue;
      if (jsonStr === "[DONE]") { yield { done: true }; continue; }

      // Try JSON parse
      try {
        const d = JSON.parse(jsonStr);
        let text = extractText(d);
        if (text) yield { text };

        if (d.type === "message_stop" || d.stop_reason || d.choices?.[0]?.finish_reason) {
          yield { done: true };
        }
      } catch {
        // Not JSON - if it looks like readable text, yield it
        if (jsonStr.length > 2 && !jsonStr.startsWith("{") && !jsonStr.startsWith("[")) {
          yield { text: jsonStr };
        }
      }
    }
  }
  yield { done: true };

  function extractText(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 10) return null;
    // Direct text properties
    if (typeof obj.text === "string" && obj.text) return obj.text;
    if (typeof obj.content === "string" && obj.content) return obj.content;
    // Anthropic: delta.text
    if (obj.delta?.text) return obj.delta.text;
    // OpenAI: choices[0].delta.content
    if (obj.choices?.[0]?.delta?.content) return obj.choices[0].delta.content;
    if (obj.choices?.[0]?.text) return obj.choices[0].text;
    // Content block
    if (obj.content_block?.text) return obj.content_block.text;
    // Deep search
    for (const v of Object.values(obj)) {
      const r = extractText(v, depth + 1);
      if (r) return r;
    }
    return null;
  }
}

// ===== 前端解析：把原版输出转为聊天消息 =====

/**
 * 解析 AI 原始输出为聊天消息
 * 输入格式：【人物名】【行动标签】：内容
 * 输出格式：{ type:"speech", name:"孔子", content:"发言内容（去标签）" }
 */
export function progressiveParse(fullText) {
  const messages = [];
  const lines = fullText.split("\n");
  let current = null;

  // Known figure names collected so we can recognize "Name：" patterns
  const knownNames = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    // Match 【主持】：content  or  主持人：content
    const modMatch = t.match(/^(?:【主持】|主持人)[：:]\s*(.*)/);
    // Match 【Name】【Action】：content
    const figMatch = t.match(/^【(.+?)】【(.+?)】[：:]\s*(.*)/);
    // Match known figure name followed by ：（plain format, no brackets）
    let plainMatch = null;
    for (const name of knownNames) {
      if (t.startsWith(name + '：') || t.startsWith(name + ':')) {
        plainMatch = { name, content: t.slice(name.length + 1).trim() };
        break;
      }
    }

    if (modMatch) {
      if (current?.content.trim()) messages.push({ ...current });
      current = { type: "speech", name: "主持人", content: modMatch[1] };
    } else if (figMatch) {
      if (current?.content.trim()) messages.push({ ...current });
      const name = figMatch[1].trim();
      knownNames.add(name);
      current = { type: "speech", name, content: figMatch[3] };
    } else if (plainMatch) {
      if (current?.content.trim()) messages.push({ ...current });
      current = { type: "speech", name: plainMatch.name, content: plainMatch.content };
    } else if (current) {
      // Continue previous message
      current.content += "\n" + line;
    } else if (t) {
      // Stray text with no speaker yet → start as moderator
      current = { type: "speech", name: "主持人", content: t };
    }
  }

  if (current?.content.trim()) {
    messages.push({ ...current });
  }

  if (messages.length === 0 && fullText.trim()) {
    messages.push({ type: "speech", name: "主持人", content: fullText.trim() });
  }

  return { messages, streamingMsg: null };
}
