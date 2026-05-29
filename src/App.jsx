import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import TopicInput from './components/TopicInput';
import LoadingDots from './components/LoadingDots';
import HistoryDrawer from './components/HistoryDrawer';
import { streamChat, parseResponse, setApiKey, getStoredApiKey } from './services/api';
import { saveConversation } from './services/storage';

const initialState = {
  conversationId: null,
  topic: '',
  messages: [],
  history: [],
  isStreaming: false,
  darkMode: false,
  streamText: '',
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_CONVERSATION':
      return {
        ...state,
        conversationId: action.data.id,
        topic: action.data.topic || '',
        messages: action.data.messages || [],
        history: action.data.history || [],
        error: null,
      };
    case 'SET_TOPIC':
      return { ...state, topic: action.topic };
    case 'NEW_SESSION':
      return { ...state, conversationId: null, topic: '', messages: [], history: [], error: null };
    case 'START_STREAM':
      return { ...state, isStreaming: true, error: null, streamText: '' };
    case 'APPEND_STREAM':
      return { ...state, streamText: state.streamText + action.text };
    case 'FINISH_STREAM': {
      const parsed = action.parsed || [];
      const fullText = action.content || '';
      const newHistory = [...state.history];
      if (fullText.trim()) newHistory.push({ role: 'assistant', content: fullText.trim() });
      return {
        ...state,
        messages: [...state.messages, ...parsed],
        history: newHistory,
        isStreaming: false,
        streamText: '',
      };
    }
    case 'SET_ERROR':
      return { ...state, isStreaming: false, error: action.error };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
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
  const [showHistory, setShowHistory] = useState(false);

  function handleSaveKey() {
    const trimmed = keyInput.trim();
    if (trimmed) { setApiKey(trimmed); setHasApiKey(true); setShowSettings(false); }
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

  // Auto save conversation
  useEffect(() => {
    if (state.messages.length > 0 && state.topic) {
      const timer = setTimeout(() => {
        saveConversation({
          id: state.conversationId,
          topic: state.topic,
          messages: state.messages,
          history: state.history,
        }).then((saved) => {
          if (saved.id !== stateRef.current.conversationId) {
            // Update conversationId for new conversations
            stateRef.current = { ...stateRef.current, conversationId: saved.id };
          }
        }).catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.messages]);

  const sendMessage = useCallback(async (userText) => {
    const current = stateRef.current;
    const isFirstMsg = current.history.length === 0;
    const topic = isFirstMsg ? userText : (current.topic || userText);

    if (isFirstMsg) dispatch({ type: 'SET_TOPIC', topic });
    const newHistory = [...current.history, { role: 'user', content: userText }];

    dispatch({ type: 'START_STREAM' });

    try {
      let fullText = '';
      for await (const chunk of streamChat(newHistory)) {
        if (chunk.text) { fullText += chunk.text; dispatch({ type: 'APPEND_STREAM', text: chunk.text }); }
      }
      const parsed = parseResponse(fullText);
      dispatch({ type: 'FINISH_STREAM', parsed, content: fullText });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message || '连接失败' });
    }
  }, []);

  function handleNewSession() {
    dispatch({ type: 'NEW_SESSION' });
  }

  function handleSelectConversation(conv) {
    dispatch({ type: 'LOAD_CONVERSATION', data: conv });
    setShowHistory(false);
  }

  const hasContent = state.messages.length > 0 || state.isStreaming;

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      <HistoryDrawer
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleSelectConversation}
        currentId={state.conversationId}
      />

      <Header
        darkMode={state.darkMode}
        onToggleDark={() => dispatch({ type: 'TOGGLE_DARK' })}
        onReset={handleNewSession}
        onSettings={() => setShowSettings(!showSettings)}
        onHistory={() => setShowHistory(true)}
        hasHistory={true}
      />

      {/* Settings */}
      {showSettings && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>DeepSeek API Key</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="sk-..."
              style={{ flex: 1, height: '38px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid var(--border-subtle)', fontSize: '0.85rem', fontFamily: 'monospace', background: 'var(--bg-chat)', color: 'var(--text-primary)' }} />
            <button onClick={handleSaveKey}
              style={{ padding: '0 18px', borderRadius: '10px', border: 'none', background: '#2D2A26', color: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>保存</button>
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
        {/* Topic banner */}
        {state.topic && (
          <div style={{ textAlign: 'center', padding: '12px 24px 8px' }}>
            <span style={{
              display: 'inline-block', fontSize: '0.75rem', color: 'var(--text-muted)',
              background: 'var(--bubble-moderator-bg)', padding: '4px 14px',
              borderRadius: '12px', letterSpacing: '0.02em',
            }}>
              {state.topic}
            </span>
          </div>
        )}

        {!hasContent && !hasApiKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🏛️</div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>圆桌会</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              与思想者对话<br />输入任何议题开始
            </div>
            <button onClick={() => setShowSettings(true)}
              style={{ padding: '10px 24px', borderRadius: '20px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              ⚙️ 设置 API Key
            </button>
          </div>
        )}

        {!hasContent && hasApiKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🏛️</div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>圆桌会</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              与思想者对话<br />输入任何议题开始
            </div>
          </div>
        )}

        {state.messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} darkMode={state.darkMode}
            style={{ animationDelay: `${Math.min(i * 0.04, 0.25)}s` }} />
        ))}

        {state.isStreaming && !state.streamText && <LoadingDots />}
        {state.isStreaming && state.streamText && (
          <div style={{ padding: '8px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start', animation: 'msgIn 0.3s ease forwards' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bubble-moderator-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>...</div>
            <div style={{ flex: 1, background: 'var(--bg-input)', borderRadius: '4px 14px 14px 14px', padding: '9px 13px', fontSize: '0.9375rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {state.streamText.slice(-400)}
            </div>
          </div>
        )}

        {state.error && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '0.8rem', padding: '8px 14px', borderRadius: '10px' }}>
              ⚠️ {state.error}
            </span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <TopicInput onSend={sendMessage} disabled={state.isStreaming}
        placeholder={hasContent ? '继续讨论或插话...' : '输入讨论话题...'} />
    </div>
  );
}
