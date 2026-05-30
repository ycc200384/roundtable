/**
 * 圆桌会 API — 李继刚"圆桌讨论"技能适配
 * 系统提示词 = 原版 skill 内容（未修改）
 * 前端只负责：解析 → 气泡展示
 */

const URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

// ↓ 保留 ljg-roundtable 完整逻辑框架 + 聊天格式输出
const SYSTEM_PROMPT = `你是李继刚"圆桌讨论"框架的执行引擎。输出格式：微信聊天。禁止markdown。禁止**加粗**。禁止###标题。禁止-列表。禁止---分隔线。

## 执行流程

1. 选3-5位真实历史/当代人物。立场张力网络。至少一位意外视角。绝不虚构人物名。

2. 主持人开场：用聊天语言介绍议题和人物（每人只用一句说清身份和立场）。然后提出定义性问题让各位回答。

3. 辩论循环：
   - 人物根据动态发言，必须回应前人的话（质疑/补充/反驳）。不许自说自话。
   - 主持人综述：提炼核心争议，提出下一层引导问题。
   - 指令提示：(可 / 止 / 深入此节 / 引入新人物)

4. 收到止后：全局总结，知识网络，开放问题。

5. 主持人理性客观，挖深不铺广。参会者忠于真实思想体系，引用经典观点。每段结尾必加"简言之：一句话"。

## 输出格式（绝对铁律）

每一段发言单独一行。格式：名字：内容

主持人介绍人物时这样写：
主持人：今天讨论「如何致富」。我邀请了四位。亚当斯密，现代经济学之父，主张财富源于自由市场。马克思，资本论的作者，批判资本积累的本质。塔勒布，黑天鹅的作者，认为财富是对风险的洞察。释迦牟尼，从解脱视角看待执念。我先提一个问题：如何定义致富？

亚当斯密：致富是通过劳动分工提升生产力，在市场交换中为他人创造价值。不是简单聚敛金银，而是让整个社会的生产力得到解放。简言之：致富的本质是为社会创造更多价值。

马克思：斯密先生描绘的图景很美好，但他忽略了资本与劳动之间的权力关系。你所谓的为他人创造价值，在工资劳动制下本质上是剩余价值的占有。简言之：致富在资本主义下是资本对劳动的剥削。

主持人：本轮核心争议在于：致富是价值创造还是价值转移？斯密说创造，马克思说转移。这个裂缝值得我们深挖。(可 / 止 / 深入此节 / 引入新人物)

禁止使用：**、*、###、---、- 列表、> 引用、[]()链接、代码块。
禁止说"好的，让我们开始"之类开场白。直接开始圆桌。
用你自然的语言写出每个人的发言，不要复制粘贴上面的例子。`;

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
  const rawMessages = [];
  const lines = fullText.split("\n");
  let current = null;
  const knownNames = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let t = line.trim();
    if (!t) continue;
    if (/^[-*_]{3,}$/.test(t)) continue; // --- dividers skip

    // Strip markdown from the line first for matching
    const plain = stripMarkdown(t);

    // Match speaker：content patterns in the cleaned text
    // 主持人： / **主持人**： / 【主持】：
    const modMatch = plain.match(/^(?:主持人|【主持】)[：:]\s*(.+)/);
    // Known figure name：content
    let figMatch = null;
    for (const name of knownNames) {
      if (plain.startsWith(name + '：') || plain.startsWith(name + ':')) {
        figMatch = { name, content: plain.slice(name.length + 1).trim() };
        break;
      }
    }
    // New figure: "Name（MBTI）：content" or "Name：content" or "**Name**：content"
    // But NOT主持人
    if (!modMatch && !figMatch) {
      const newFig = plain.match(/^(.{1,12})[：:]\s*(.+)/);
      if (newFig && newFig[1] !== '主持人' && !knownNames.has(newFig[1])) {
        const candidate = newFig[1].trim();
        // Only treat as new figure if it looks like a person name (Chinese/English, 2-6 chars)
        if (candidate.length >= 2 && candidate.length <= 8) {
          knownNames.add(candidate);
          figMatch = { name: candidate, content: newFig[2].trim() };
        }
      }
    }

    if (modMatch) {
      if (current?.content.trim()) rawMessages.push({ ...current });
      current = { type: "speech", name: "主持人", content: modMatch[1] };
    } else if (figMatch) {
      if (current?.content.trim()) rawMessages.push({ ...current });
      current = { type: "speech", name: figMatch.name, content: figMatch.content };
    } else if (current) {
      current.content += "\n" + plain;
    } else if (plain && !plain.startsWith('#') && plain.length > 3) {
      current = { type: "speech", name: "主持人", content: plain };
    }
  }

  if (current?.content.trim()) rawMessages.push({ ...current });
  if (rawMessages.length === 0 && fullText.trim()) {
    rawMessages.push({ type: "speech", name: "主持人", content: stripMarkdown(fullText.trim()) });
  }

  // Split long messages into smaller bubbles + final cleanup
  const messages = [];
  for (const msg of rawMessages) {
    const parts = splitLongMessage(msg);
    messages.push(...parts);
  }
  return { messages, streamingMsg: null };
}

// Strip ALL markdown: bold, italic, bullets, headings, links, (MBTI) tags
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\([A-Z]{4}\)/g, '')  // (INTP) (MBTI) tags
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Split messages at sentence boundaries for natural chat feel.
// Moderator messages get split more aggressively (1-2 sentences per bubble).
// Figure messages only split if very long.
function splitLongMessage(msg) {
  const text = msg.content;
  const sentences = text.split(/(?<=[。！？])\s*/).filter(s => s.trim());
  if (sentences.length <= 1) return [msg];

  const isMod = msg.name === '主持人';
  const groupSize = isMod ? 2 : 4; // moderator: 2 sentences/bubble, figures: 4

  const parts = [];
  let buf = '';
  for (const s of sentences) {
    const combined = buf ? buf + s : s;
    if (buf && combined.length > (isMod ? 120 : 300)) {
      parts.push({ ...msg, content: buf.trim() });
      buf = s;
    } else {
      buf = combined;
    }
  }
  if (buf.trim()) parts.push({ ...msg, content: buf.trim() });
  return parts.length > 0 ? parts : [msg];
}
