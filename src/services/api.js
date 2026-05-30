/**
 * 圆桌会 API — 李继刚"圆桌讨论"技能适配
 * 系统提示词 = 原版 skill 内容（未修改）
 * 前端只负责：解析 → 气泡展示
 */

const URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

// ↓ 以下内容直接来自 ljg-roundtable SKILL.md（原版，未修改框架逻辑）
const SYSTEM_PROMPT = `为了执行本项技能，请严格按照以下步骤操作：

1. **解析议题**
   从用户输入中提取核心议题。如果用户只说"圆桌讨论"未给议题，询问议题。

2. **选人：提议代表人物**
   根据议题，选择 3-5 位**真实历史/当代人物**作为代表，覆盖尽可能多的立场维度。每位人物需要：
   - 姓名（真实人物，非虚构）
   - MBTI 人格类型
   - 核心立场（一句话）
   - 选择理由（为什么此人对此议题有独特视角）

   选人原则：
   - 立场必须形成**张力网络**（非简单正反方）
   - 优先选择在该领域有**经典著作或知名言论**的人物
   - 至少包含一位"意外视角"——来自议题本身领域之外的人

3. **开场：统一定义**
   以主持人身份开场，展示参会人物列表，然后提出**定义性问题**

   每位参会者依次发言，格式为：
   【人物名】【行动标签】：发言内容

   **简言之**：一句话总结

   行动标签包括：陈述、质疑、补充、反驳、修正、综合

4. **对话循环**
   每轮执行以下流程：

   4a. 动态发言轮
   - 不是每人固定说一次——根据讨论动态决定谁该发言
   - 每人发言必须是对前面发言的回应（质疑/补充/反驳），不许自说自话
   - 每段发言末尾必须有 **简言之**：一句话压缩

   4b. 主持人综述
   发言结束后，主持人提炼本轮核心争议点，生成ASCII思考框架图，提出下一层引导问题

   4c. 用户指令
   综述后展示指令菜单：
   【主持】：(指令: 可 / 止 / 深入此节 / 引入新人物)

5. **结束：生成知识网络**
   用户发出 止 指令后：全局总结 + 知识网络ASCII图 + 开放问题

### 主持人行为准则
- 理性之锚：冷静客观，不偏向任何一方
- 挖深不铺广：每轮只追一条最深的裂缝
- 求真 > 和谐：鼓励尖锐但有建设性的交锋
- 元认知：在综述中暴露讨论的结构

### 参会者行为准则
- 必须忠于其真实思想体系发言
- 引用/化用其经典著作或知名观点
- 发言有锋芒：质疑要见骨，补充要推进
- 每段结尾 **简言之** 一句话压到极致`;

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
// ===== 前端解析：把 skill 原版输出转为聊天消息 =====
// 原版格式：【人物名】【行动标签】：发言内容\n**简言之**：一句话
// 不修改 skill 内容，只做格式转换

export function progressiveParse(fullText) {
  const messages = [];
  const lines = fullText.split('\n');
  let current = null;

  for (const line of lines) {
    let t = line.trim();
    if (!t) continue;

    // Skip markdown dividers and headings
    if (/^[-*_]{3,}$/.test(t) || /^#{1,6}\s/.test(t)) continue;

    // Strip leading bullet/list markers for matching
    const clean = t.replace(/^[-*+·•]\s*/, '').trim();

    // Match 主持人：content (with or without 【】brackets)
    const modM = clean.match(/^(?:【主持】|主持人)[：:]\s*(.*)/);
    // Match 【Name】【Action】：content
    const figM = clean.match(/^【(.+?)】【(.+?)】[：:]\s*(.*)/);
    // Also match plain "Name：content" if we've seen this name before in bracket format
    // This handles cases where the AI switches between 【】 and plain format

    if (modM) {
      if (current?.content?.trim()) messages.push({ ...current });
      current = { type: 'speech', name: '主持人', content: cleanText(modM[1]) };
    } else if (figM) {
      if (current?.content?.trim()) messages.push({ ...current });
      current = { type: 'speech', name: figM[1].trim(), content: cleanText(figM[3]) };
    } else if (current) {
      // Continue previous message (multi-line content, 简言之, ASCII diagram, etc.)
      current.content += '\n' + cleanText(t);
    } else {
      // Text before any recognized speaker → moderator
      current = { type: 'speech', name: '主持人', content: cleanText(t) };
    }
  }

  if (current?.content?.trim()) {
    messages.push({ ...current });
  }

  if (messages.length === 0 && fullText.trim()) {
    messages.push({ type: 'speech', name: '主持人', content: cleanText(fullText.trim()) });
  }

  return { messages, streamingMsg: null };
}

// Clean markdown formatting from text: remove **bold**, ###headings, - bullets
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
