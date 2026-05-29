import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import CommandBar from './components/CommandBar';
import TopicInput from './components/TopicInput';
import LoadingDots from './components/LoadingDots';
import { streamChat, parseResponse, detectCommandPrompt, assignFigureColor, setApiKey, getStoredApiKey } from './services/api';

const initialState = {
  topic: '',
  messages: [],
  history: [],
  isStreaming: false,
  showCommands: false,
  darkMode: false,
  figureColors: {},
  streamText: '',
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TOPIC':
      return {
        ...state,
        topic: action.topic,
        messages: [],
        history: [],
        figureColors: {},
        error: null,
      };

    case 'START_STREAM':
      return {
        ...state,
        isStreaming: true,
        showCommands: false,
        error: null,
        streamText: '',
      };

    case 'APPEND_STREAM':
      return { ...state, streamText: state.streamText + action.text };

    case 'FINISH_STREAM': {
      const parsed = action.parsed || [];
      const showCommands = !!action.showCommands;
      const fullText = action.content || '';

      const newHistory = [...state.history];
      if (fullText.trim()) {
        newHistory.push({ role: 'assistant', content: fullText.trim() });
      }

      const figureColors = { ...state.figureColors };
      for (const msg of parsed) {
        if (msg.type === 'figure' && figureColors[msg.name] === undefined) {
          figureColors[msg.name] = assignFigureColor(msg.name, figureColors);
        }
      }

      return {
        ...state,
        messages: parsed,
        history: newHistory,
        isStreaming: false,
        showCommands,
        streamText: '',
        figureColors,
      };
    }

    case 'SET_ERROR':
      return { ...state, isStreaming: false, error: action.error };

    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };

    case 'RESET':
      return { ...initialState, darkMode: state.darkMode };

    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    const saved = localStorage.getItem('roundtable_dark_mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return { ...init, darkMode: saved !== null ? saved === 'true' : prefersDark };
  });

  const chatEndRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState(getStoredApiKey());
  const [hasApiKey, setHasApiKey] = useState(!!getStoredApiKey());

  function handleSaveKey() {
    const trimmed = keyInput.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setHasApiKey(true);
      setShowSettings(false);
    }
  }

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
    localStorage.setItem('roundtable_dark_mode', state.darkMode);
  }, [state.darkMode]);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.streamText]);

  const sendMessage = useCallback(async (topic, command) => {
    const current = stateRef.current;

    let reqHistory;
    if (command) {
      const cmdContent = command.startsWith('引入新人物：') ? command : command;
      reqHistory = [...current.history, { role: 'user', content: cmdContent }];
    } else {
      reqHistory = [];
    }

    dispatch({ type: 'START_STREAM' });

    try {
      let fullText = '';
      for await (const chunk of streamChat(topic, reqHistory)) {
        if (chunk.text) {
          fullText += chunk.text;
          dispatch({ type: 'APPEND_STREAM', text: chunk.text });
        }
      }

      const parsed = parseResponse(fullText);
      const showCommands = detectCommandPrompt(parsed);

      dispatch({
        type: 'FINISH_STREAM',
        parsed,
        showCommands,
        content: fullText,
        history: reqHistory,
      });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message || '连接失败' });
    }
  }, []);

  function handleSendTopic(topic) {
    dispatch({ type: 'SET_TOPIC', topic });
    sendMessage(topic, null);
  }

  function handleCommand(command) {
    sendMessage(state.topic, command);
  }

  function handleReset() {
    dispatch({ type: 'RESET' });
  }

  const hasContent = state.messages.length > 0 || state.isStreaming;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Header
        darkMode={state.darkMode}
        onToggleDark={() => dispatch({ type: 'TOGGLE_DARK' })}
        onReset={handleReset}
        onSettings={() => setShowSettings(!showSettings)}
      />

      <div className="chat-scroll" style={{ flex: 1 }}>
        {/* Settings panel */}
        {showSettings && (
          <div style={{
            padding: '20px 16px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '8px',
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              ⚙️ DeepSeek API Key
            </div>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="sk-..."
              style={{
                width: '100%', height: '40px', padding: '0 12px',
                borderRadius: '10px', border: '1.5px solid var(--border-subtle)',
                fontSize: '0.875rem', fontFamily: 'monospace',
                background: 'var(--bg-chat)', color: 'var(--text-primary)',
                marginBottom: '8px',
              }}
            />
            <button
              onClick={handleSaveKey}
              style={{
                height: '36px', padding: '0 20px', borderRadius: '10px',
                border: 'none', background: '#2D2A26', color: '#fff',
                fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              }}
            >保存</button>
          </div>
        )}

        {!hasContent && hasApiKey && (
          <div className="empty-state">
            <div className="empty-state__icon">🏛️</div>
            <div className="empty-state__title">开启一场思想对话</div>
            <div className="empty-state__desc">
              输入任何议题，AI 将邀请<br />
              多位历史人物展开圆桌辩论
            </div>
          </div>
        )}

        {!hasContent && !hasApiKey && (
          <div className="empty-state">
            <div className="empty-state__icon">🔑</div>
            <div className="empty-state__title">首次使用，请设置 API Key</div>
            <div className="empty-state__desc" style={{ marginBottom: '16px' }}>
              点击右上角 ⚙️ 设置你的 DeepSeek API Key<br />
              只需设置一次，保存在浏览器中
            </div>
            <button onClick={() => setShowSettings(true)}
              style={{
                padding: '12px 28px', borderRadius: '12px', border: 'none',
                background: '#2D2A26', color: '#fff', fontSize: '0.95rem',
                fontWeight: 600, cursor: 'pointer',
              }}
            >⚙️ 设置 API Key</button>
          </div>
        )}

        {state.messages.map((msg, i) => (
          <ChatBubble
            key={i}
            message={msg}
            colorIndex={msg.type === 'figure' ? (state.figureColors[msg.name] || 0) : 0}
            darkMode={state.darkMode}
          />
        ))}

        {state.isStreaming && state.streamText && (
          <div className="figure-bubble" style={{ opacity: 1 }}>
            <div className="figure-bubble__content"
              style={{
                backgroundColor: state.darkMode ? '#1f2937' : '#F3F4F6',
                color: state.darkMode ? '#D1D5DB' : '#4B5563',
                maxWidth: '92%',
                fontSize: '0.9375rem',
                lineHeight: 1.65,
                padding: '10px 14px',
                borderRadius: '16px',
              }}
            >
              {state.streamText}
            </div>
          </div>
        )}

        {state.isStreaming && !state.streamText && <LoadingDots />}

        {state.error && (
          <div className="moderator-bubble">
            <div className="moderator-bubble__content" style={{ color: '#DC2626' }}>
              ⚠️ {state.error}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <CommandBar
        visible={state.showCommands && !state.isStreaming}
        disabled={state.isStreaming}
        onCommand={handleCommand}
        darkMode={state.darkMode}
      />

      {(!state.showCommands || state.isStreaming) && (
        <TopicInput
          onSend={handleSendTopic}
          disabled={state.isStreaming}
          placeholder={hasContent ? '输入新议题或插话...' : '输入讨论话题...'}
        />
      )}
    </div>
  );
}
