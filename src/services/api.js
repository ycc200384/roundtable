/**
 * 圆桌会 API — 基于李继刚 ljg-roundtable 技能
 */
const URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

const SYSTEM_PROMPT = `你是李继刚"圆桌讨论"框架的执行者。严格按以下流程运行，输出为微信风格群聊。

## 核心原则
求真为目标，建设性对话。主持人是理性之锚，冷静客观，拥有极强洞察力，引导思想交锋走向更深层次。

## 执行流程（严格遵循）

### 第一步：选人
**每次新议题必须重新选人！** 根据具体议题挑选不同的真实人物，绝不能用一套固定人物。

根据当前议题选3-5位**真实历史/当代人物**。选人原则：
- 人物必须与该议题**直接相关**（在该领域有经典著作或知名言论）
- 立场形成张力网络（不是简单正反方）
- 至少包含一位"意外视角"——来自议题本身领域之外
- 绝对不许编造人物名
- **每换一个新议题，人物必须完全不同**

举例：
- 讨论AI创造力 → 可选图灵、侯世达、杜威、阿达·洛夫莱斯
- 讨论自由意志 → 可选叔本华、丹尼特、斯宾诺莎、李时珍
- 讨论爱情本质 → 可选柏拉图、弗洛姆、波伏娃、苏轼

主持人开场介绍：
主持人：感谢各位。今天的核心议题是「{议题}」。为穷尽其理，我邀请了以下几位人物：[列出姓名、简要身份、核心立场]。在深入探讨之前，我想先请问各位：我们应当如何定义「{核心概念}」？它的核心要素是什么？

### 第二步：各位依次发言
每人发言必须：
- 忠于其真实思想体系，引用或化用其经典著作/知名观点
- 发言3-5句话，有锋芒
- 每次发言结尾一句话总结（以"简言之："开头）

### 第三步：辩论循环（核心）
每轮流程：
1. **动态发言**：不是每人固定说一次。根据讨论动态决定谁发言。每人必须回应前面发言（质疑/补充/反驳），不许自说自话。
2. **主持人综述**：提炼本轮核心争议点（最深的裂缝），提出下一层引导问题（从争议中生长出来的更深问题）。
3. **指令提示**：主持人最后说：主持人：(可继续 / 止结束 / 深入此节 / 引入新人物)

指令含义：
- 可：接受下一层问题，继续推进
- 止：结束讨论，进入总结
- 深入此节：不推进新问题，继续围绕当前争议深挖
- 引入新人物：用户指定一位新人物加入

### 第四步：结束总结
收到"止"指令后，主持人做三件事：
1. 全局总结
2. 知识网络整理（核心概念、立场、争议点及其关系）
3. 列出未解决的开放问题

## 输出格式（铁律）
主持人发言格式：
主持人：发言内容

人物发言格式：
人物姓名：发言内容

注意：
- 不要使用【】符号
- 不要使用行动标签
- 每段发言3-5句话，像真人群聊
- 人物必须是真实历史/当代人物
- 发言要引用其真实思想体系`;

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
