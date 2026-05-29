import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import TopicInput from './components/TopicInput';
import LoadingDots from './components/LoadingDots';
import HistoryDrawer from './components/HistoryDrawer';
import { streamChat, progressiveParse, setApiKey, getStoredApiKey } from './services/api';
import { saveConversation } from './services/storage';

const initialState = {
  conversationId: null,
  topic: '',
  allMessages: [],   // all parsed messages including user messages
  aiMessages: [],    // current conversation's AI messages (for progressive parse)
  history: [],       // raw API history [{role, content}]
  isStreaming: false,
  darkMode: false,
  streamingMsg: null, // current incomplete message being typed
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_CONVERSATION':
      return { ...state, conversationId: action.data.id, topic: action.data.topic || '',
        allMessages: action.data.allMessages || action.data.messages || [],
        aiMessages: [], history: action.data.history || [], error: null };
    case 'SET_TOPIC':
      return { ...state, topic: action.topic };
    case 'ADD_USER_MSG': {
      const msg = { type: 'user', content: action.content };
      return { ...state, allMessages: [...state.allMessages, msg] };
    }
    case 'START_STREAM':
      return { ...state, isStreaming: true, error: null, aiMessages: [], streamingMsg: null };
    case 'UPDATE_STREAM': {
      // Progressive parse
      const { messages, streamingMsg } = progressiveParse(action.fullText);
      return { ...state, aiMessages: messages, streamingMsg };
    }
    case 'FINISH_STREAM': {
      const parsed = action.parsed || [];
      const fullText = action.content || '';
      const newHistory = [...state.history];
      if (fullText.trim()) newHistory.push({ role: 'assistant', content: fullText.trim() });
      return { ...state,
        allMessages: [...state.allMessages, ...parsed],
        history: newHistory, isStreaming: false, aiMessages: [], streamingMsg: null,
      };
    }
    case 'SET_ERROR':
      return { ...state, isStreaming: false, error: action.error, streamingMsg: null };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'NEW_SESSION':
      return { ...state, conversationId: null, topic: '', allMessages: [], aiMessages: [],
        history: [], error: null };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    const saved = localStorage.getItem('roundtable_dark_mode');
    return { ...init, darkMode: saved === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches };
  });
  const chatEndRef = useRef(null);
  const stateRef = useRef(state); stateRef.current = state;
  const streamTextRef = useRef('');

  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState(getStoredApiKey());
  const [hasApiKey, setHasApiKey] = useState(!!getStoredApiKey());
  const [showHistory, setShowHistory] = useState(false);

  function handleSaveKey() {
    const t = keyInput.trim(); if (t) { setApiKey(t); setHasApiKey(true); setShowSettings(false); }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
    localStorage.setItem('roundtable_dark_mode', state.darkMode);
  }, [state.darkMode]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); },
    [state.allMessages, state.aiMessages, state.streamingMsg]);

  // Auto-save
  useEffect(() => {
    const msgs = state.allMessages;
    if (msgs.length > 0 && state.topic) {
      const timer = setTimeout(() => {
        saveConversation({ id: state.conversationId, topic: state.topic, allMessages: msgs, history: state.history })
          .then(s => { if (s.id !== stateRef.current.conversationId) stateRef.current = { ...stateRef.current, conversationId: s.id }; }).catch(() => {});
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.allMessages]);

  const sendMessage = useCallback(async (userText) => {
    const cur = stateRef.current;
    const isFirst = cur.history.length === 0;
    const topic = isFirst ? userText : (cur.topic || userText);
    if (isFirst) dispatch({ type: 'SET_TOPIC', topic });

    // Show user message immediately
    dispatch({ type: 'ADD_USER_MSG', content: userText });
    const newHistory = [...cur.history, { role: 'user', content: userText }];

    dispatch({ type: 'START_STREAM' });
    streamTextRef.current = '';

    try {
      for await (const chunk of streamChat(newHistory)) {
        if (chunk.text) {
          streamTextRef.current += chunk.text;
          dispatch({ type: 'UPDATE_STREAM', fullText: streamTextRef.current });
        }
      }
      // All done - final parse
      const final = progressiveParse(streamTextRef.current);
      dispatch({ type: 'FINISH_STREAM', parsed: final.messages, content: streamTextRef.current });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message || '连接失败' });
    }
  }, []);

  function handleNewSession() {
    dispatch({ type: 'NEW_SESSION' });
  }
  function handleSelectConv(conv) {
    dispatch({ type: 'LOAD_CONVERSATION', data: conv });
    setShowHistory(false);
  }

  const hasContent = state.allMessages.length > 0 || state.isStreaming;
  // Combined messages: saved allMessages + in-progress aiMessages
  const displayMessages = [
    ...state.allMessages,
    ...state.aiMessages.filter(m => !state.allMessages.some(am => am.content === m.content && am.name === m.name)),
  ];

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <HistoryDrawer open={showHistory} onClose={() => setShowHistory(false)}
        onSelect={handleSelectConv} currentId={state.conversationId} />
      <Header darkMode={state.darkMode} onToggleDark={() => dispatch({ type: 'TOGGLE_DARK' })}
        onReset={handleNewSession} onSettings={() => setShowSettings(!showSettings)}
        onHistory={() => setShowHistory(true)} hasHistory={true} />

      {showSettings && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>DeepSeek API Key</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="sk-..."
              style={{ flex: 1, height: '38px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid var(--border-subtle)', fontSize: '0.85rem', fontFamily: 'monospace', background: 'var(--bg-chat)', color: 'var(--text-primary)' }} />
            <button onClick={handleSaveKey} style={{ padding: '0 18px', borderRadius: '10px', border: 'none', background: '#2D2A26', color: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>保存</button>
          </div>
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
        {state.topic && <div style={{ textAlign: 'center', padding: '12px 24px 8px' }}>
          <span style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bubble-moderator-bg)', padding: '4px 14px', borderRadius: '12px' }}>{state.topic}</span>
        </div>}

        {!hasContent && !hasApiKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🏛️</div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>圆桌会</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>与思想者对话</div>
            <button onClick={() => setShowSettings(true)} style={{ padding: '10px 24px', borderRadius: '20px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>⚙️ 设置 API Key</button>
          </div>
        )}
        {!hasContent && hasApiKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🏛️</div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>圆桌会</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>输入议题，开启一场思想对话</div>
          </div>
        )}

        {/* Display all messages */}
        {displayMessages.map((msg, i) => (
          <ChatBubble key={i} message={msg} darkMode={state.darkMode}
            style={{ animationDelay: `${Math.min(i * 0.03, 0.2)}s` }} />
        ))}

        {/* Streaming: currently-being-typed message */}
        {state.streamingMsg && (
          <ChatBubble message={{ ...state.streamingMsg, isComplete: false }} darkMode={state.darkMode} />
        )}
        {state.isStreaming && !state.streamingMsg && displayMessages.length === 0 && <LoadingDots />}

        {state.error && <div style={{ textAlign: 'center', padding: 16 }}>
          <span style={{ background: '#FEE2E2', color: '#991B1B', fontSize: '0.8rem', padding: '8px 14px', borderRadius: '10px' }}>⚠️ {state.error}</span>
        </div>}
        <div ref={chatEndRef} />
      </div>

      <TopicInput onSend={sendMessage} disabled={state.isStreaming}
        placeholder={hasContent ? '继续讨论...' : '输入讨论话题...'} />
    </div>
  );
}
