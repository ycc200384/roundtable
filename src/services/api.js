/**
 * 圆桌会 API — 李继刚"圆桌讨论"技能适配
 * 系统提示词 = 原版 skill 内容（未修改）
 * 前端只负责：解析 → 气泡展示
 */

const URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

// ↓ 以下内容直接来自 ljg-roundtable SKILL.md，未修改框架逻辑
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
   以主持人身份开场，展示参会人物列表，然后提出**定义性问题**：
   「在深入探讨之前，我们应当如何定义 [议题核心概念]？它的核心要素是什么？」

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
   发言结束后，主持人做三件事：
   - 提炼本轮核心争议点（不是面面俱到，而是找到最深的裂缝）
   - 生成 ASCII 思考框架图（拓扑图/矩阵/光谱/树形——选最贴合本轮结构的形式）
   - 提出下一层引导问题（从核心争议中生长出来的更深问题）

   ASCII 图的设计原则：
   - 高度概括本轮讨论的结构，不是复述内容
   - 标出正/负反馈环、因果链、张力维度
   - 形式不固定：可以是 2x2 矩阵、光谱轴、因果环路、层级树——哪种最见骨用哪种

   4c. 用户指令
   综述后展示指令菜单：
   【主持】：(指令: 可 / 止 / 深入此节 / 引入新人物)

   指令含义：
   - 可：接受下一层问题，继续推进
   - 止：结束讨论，进入总结
   - 深入此节：不推进新问题，继续围绕当前争议点深挖
   - 引入新人物：用户指定一位新人物加入（主持人介绍并请其就当前话题表态）

5. **结束：生成知识网络**
   用户发出 止 指令后：
   - 主持人做全局总结
   - 生成完整知识网络 ASCII 图：标出所有关键概念、立场、争议点及其关系
   - 列出未解决的开放问题（讨论中暴露但未穷尽的方向）

### 主持人行为准则
- 理性之锚：冷静客观，不偏向任何一方
- 挖深不铺广：每轮只追一条最深的裂缝，不面面俱到
- 求真 > 和谐：鼓励尖锐但有建设性的交锋，拒绝表面共识
- 元认知：在综述中暴露讨论的结构（假设、前提、推理链），不只复述内容

### 参会者行为准则
- 必须忠于其真实思想体系发言，不是泛泛而谈
- 引用/化用其经典著作或知名观点
- 发言有锋芒：质疑要见骨，补充要推进，不说正确的废话
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

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() || "";

    for (const l of lines) {
      const s = l.trim();
      if (!s.startsWith("data:")) continue;

      try {
        const d = JSON.parse(s.slice(5).trim());

        // Anthropic format: content_block_delta → delta.text
        if (d.type === "content_block_delta") {
          const t = d.delta?.text || "";
          if (t) yield { text: t };
        }
        // Anthropic format: content_block_start → content_block.text (initial)
        else if (d.type === "content_block_start") {
          const t = d.content_block?.text || "";
          if (t) yield { text: t };
        }
        // OpenAI/alternate format: choices[0].delta.content
        else if (d.choices?.[0]?.delta?.content) {
          yield { text: d.choices[0].delta.content };
        }
        // Generic text field
        else if (d.text && !d.type) {
          yield { text: d.text };
        }
        // Stream end
        if (d.type === "message_stop" || d.type === "message_delta" && d.delta?.stop_reason) {
          yield { done: true };
        }
      } catch { /* skip non-JSON or unknown formats */ }
    }
  }
  // Stream finished
  yield { done: true };
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match 【主持】：content
    const modMatch = line.match(/^【主持】：(.*)/);
    // Match 【Name】【Action】：content
    const figMatch = line.match(/^【(.+?)】【(.+?)】：(.*)/);

    if (modMatch) {
      if (current && current.content.trim()) messages.push({ ...current });
      current = { type: "speech", name: "主持人", content: modMatch[1] };
    } else if (figMatch) {
      if (current && current.content.trim()) messages.push({ ...current });
      current = {
        type: "speech",
        name: figMatch[1].trim(),
        content: figMatch[3], // strip the 【】 prefix, keep the speech
      };
    } else if (current) {
      current.content += "\n" + line;
    }
  }

  // Check if text appears done (last line looks complete)
  const done = fullText.match(/开放问题|知识网络|全局总结|指令:.*可.*止/) != null;
  if (current && current.content.trim()) {
    messages.push({ ...current, isComplete: !done ? undefined : true });
  }

  let streamingMsg = null;
  // If the last message seems incomplete, pull it out as streaming
  if (!done && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last.name && last.content && !last.content.trim().endsWith("**简言之**")) {
      streamingMsg = messages.pop();
      streamingMsg.isStreaming = true;
    }
  }

  return { messages, streamingMsg };
}
