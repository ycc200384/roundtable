/**
 * 圆桌会 API 服务
 * 直接调用 DeepSeek API（Anthropic 兼容接口）
 * SSE 流式消费 + 响应解析 + 头像生成
 */

const DEEPSEEK_URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro[1m]";

const SYSTEM_PROMPT = `你是一位极具洞察力的圆桌讨论主持人。目标是引导代表人物进行以"求真"为目标的深度对话。

## 流程
1. 选人：选3-5位真实历史/当代人物，展示姓名、MBTI、立场
2. 开场：提出定义性问题，每人用此格式发言：
【人物名】【行动标签】：内容
**简言之**：一句话
3. 辩论循环：动态发言→主持人综述+ASCII框架图→展示指令
4. 指令菜单：【主持】：(指令: 可 / 止 / 深入此节 / 引入新人物)
5. 止：结束，生成知识网络+开放问题

## 铁律
- 人物发言：【人物名】【行动标签】：内容
- 主持人：【主持】：内容
- 指令：【主持】：(指令: 可 / 止 / 深入此节 / 引入新人物)
- 每段人物发言结尾：**简言之**：一句话
- ASCII图用盒形字符`;

function getApiKey() {
  const key = localStorage.getItem('deepseek_api_key');
  if (!key) {
    throw new Error('未设置 API Key。请点击左上角 ⚙️ 设置。');
  }
  return key;
}

export function setApiKey(key) {
  localStorage.setItem('deepseek_api_key', key.trim());
}

export function getStoredApiKey() {
  return localStorage.getItem('deepseek_api_key') || '';
}

/**
 * Get avatar URL for a figure name using DiceBear (free, cute anime style)
 */
export function getAvatarUrl(name, seed) {
  // Use lorelei style - cute, anime-like, distinct per seed
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed || name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,b5e8d5`;
}

const FIGURE_PALETTE = [
  { bg: '#FFE0B2', border: '#FFB74D', text: '#4E342E', bgDark: '#3d2e1e', borderDark: '#8D6E3A', textDark: '#FFCC80' },
  { bg: '#C8E6C9', border: '#81C784', text: '#1B5E20', bgDark: '#1e3a1e', borderDark: '#4A7C4F', textDark: '#A5D6A7' },
  { bg: '#BBDEFB', border: '#64B5F6', text: '#0D47A1', bgDark: '#1a2a3d', borderDark: '#3A6DA5', textDark: '#90CAF9' },
  { bg: '#F8BBD0', border: '#F06292', text: '#880E4F', bgDark: '#3d1e2a', borderDark: '#8D3A5C', textDark: '#F48FB1' },
  { bg: '#D1C4E9', border: '#9575CD', text: '#311B92', bgDark: '#2a1e3d', borderDark: '#6A4C93', textDark: '#B39DDB' },
  { bg: '#B2EBF2', border: '#4DD0E1', text: '#004D40', bgDark: '#1a3035', borderDark: '#3A8A95', textDark: '#80DEEA' },
  { bg: '#FFECB3', border: '#FFD54F', text: '#3E2723', bgDark: '#3d3520', borderDark: '#8D7A2E', textDark: '#FFE082' },
  { bg: '#FFCCBC', border: '#FF8A65', text: '#BF360C', bgDark: '#3d221a', borderDark: '#8D4A35', textDark: '#FFAB91' },
];

const ACTION_LABELS = ['陈述', '质疑', '补充', '反驳', '修正', '综合'];
const TERMINAL_CHARS = /[─│┌┐└┘├┤┬┴┼╭╮╰╯╔╗╚╝║═▄▀█▌▐░▒▓↑↓←→↔►◄▼▲◆◇○●◎◉╱╲╳]/;

/**
 * Stream chat response directly from DeepSeek API
 */
export async function* streamChat(topic, history) {
  const apiKey = getApiKey();

  const messages = [];
  for (const msg of history) {
    if (msg.content) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  if (messages.length === 0 && topic) {
    messages.push({ role: "user", content: `议题：${topic}\n请开始圆桌讨论。` });
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      system: SYSTEM_PROMPT,
      messages,
      max_tokens: 8192,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 错误 (${response.status}): ${err}`);
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
        } catch {
          // Skip non-JSON
        }
      }
    }
  }
}

/**
 * Parse AI response text into structured messages
 */
export function parseResponse(text) {
  const messages = [];
  const lines = text.split('\n');
  let currentMessage = null;
  let inAsciiBlock = false;
  let asciiBuffer = [];

  function flushMessage() {
    if (!currentMessage) return;
    if (inAsciiBlock) {
      currentMessage.type = 'ascii';
      currentMessage.content = asciiBuffer.join('\n');
      inAsciiBlock = false;
      asciiBuffer = [];
    }
    // Trim and deduplicate
    if (currentMessage.content && currentMessage.content.trim()) {
      messages.push(currentMessage);
    }
    currentMessage = null;
  }

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Detect figure speech: 【Name】【Action】：content
    const figureMatch = trimmedLine.match(/^【(.+?)】【(.+?)】：(.*)/);
    // Detect moderator speech
    const moderatorMatch = trimmedLine.match(/^【主持】：(.*)/);

    // Detect ASCII diagram: box-drawing chars or dense whitespace patterns
    const hasTerminalChar = TERMINAL_CHARS.test(line);
    const isDenseSpaceLine = /^[\s]{8,}[^\s]/.test(line) && !figureMatch && !moderatorMatch;
    const isAsciiLine = hasTerminalChar || isDenseSpaceLine;

    if (figureMatch) {
      // Check if previous line was part of a regular message (multi-line speech)
      if (currentMessage && !inAsciiBlock && currentMessage.type !== 'ascii') {
        // This is a new figure speech, flush previous
        flushMessage();
      }
      if (inAsciiBlock) {
        flushMessage();
      }
      currentMessage = {
        type: 'figure',
        name: figureMatch[1],
        action: figureMatch[2],
        content: figureMatch[3],
      };
    } else if (moderatorMatch) {
      if (currentMessage) flushMessage();
      currentMessage = {
        type: 'moderator',
        content: moderatorMatch[1],
      };
    } else if (isAsciiLine && currentMessage?.type !== 'ascii') {
      if (currentMessage) flushMessage();
      inAsciiBlock = true;
      asciiBuffer = [line];
      currentMessage = { type: 'ascii', content: '' };
    } else if (inAsciiBlock) {
      if (isAsciiLine || isDenseSpaceLine || trimmedLine === '') {
        asciiBuffer.push(line);
      } else {
        // End of ASCII block
        flushMessage();
        // Re-process this line as regular content
        if (trimmedLine) {
          currentMessage = { type: 'moderator', content: trimmedLine };
        }
      }
    } else if (currentMessage) {
      // Append to current message content
      if (trimmedLine) {
        currentMessage.content += '\n' + trimmedLine;
      } else {
        currentMessage.content += '\n';
      }
    } else if (trimmedLine) {
      // Stray text without a recognized prefix - treat as moderator
      currentMessage = { type: 'moderator', content: trimmedLine };
    }
  }

  // Flush remaining
  if (currentMessage) {
    if (inAsciiBlock) {
      currentMessage.type = 'ascii';
      currentMessage.content = asciiBuffer.join('\n');
    }
    if (currentMessage.content && currentMessage.content.trim()) {
      messages.push(currentMessage);
    }
  }

  // Deduplicate consecutive identical messages
  return deduplicateMessages(messages);
}

function deduplicateMessages(messages) {
  if (messages.length < 2) return messages;
  const result = [messages[0]];
  for (let i = 1; i < messages.length; i++) {
    const prev = result[result.length - 1];
    const curr = messages[i];
    const isDuplicate =
      prev.type === curr.type &&
      prev.name === curr.name &&
      prev.content === curr.content;
    if (!isDuplicate) {
      result.push(curr);
    }
  }
  return result;
}

/**
 * Detect if messages contain a command prompt
 */
export function detectCommandPrompt(messages) {
  for (const msg of messages) {
    if (msg.type === 'moderator' && msg.content.includes('指令:')) {
      return true;
    }
  }
  return false;
}

/**
 * Assign a color index to a figure name
 */
export function assignFigureColor(name, existingColors) {
  if (existingColors[name] !== undefined) return existingColors[name];
  const usedIndices = new Set(Object.values(existingColors));
  for (let i = 0; i < FIGURE_PALETTE.length; i++) {
    if (!usedIndices.has(i)) return i;
  }
  return Object.keys(existingColors).length % FIGURE_PALETTE.length;
}

export function getFigureColor(index, darkMode) {
  const palette = FIGURE_PALETTE[index % FIGURE_PALETTE.length];
  if (!darkMode) {
    return {
      bg: palette.bg,
      border: palette.border,
      text: palette.text,
    };
  }
  return {
    bg: palette.bgDark,
    border: palette.borderDark,
    text: palette.textDark,
  };
}

export { FIGURE_PALETTE, ACTION_LABELS };
