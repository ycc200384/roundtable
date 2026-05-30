import { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import TopicInput from './components/TopicInput';
import LoadingDots from './components/LoadingDots';
import HistoryDrawer from './components/HistoryDrawer';
import { streamChat, progressiveParse, setApiKey, getStoredApiKey } from './services/api';
import { saveConversation, getConversations } from './services/storage';

const initState = {
  conversationId: null,
  topic: '',
  allMessages: [],
  history: [],
  isStreaming: false,
  darkMode: false,
  error: null,
  loaded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'INIT_DONE':
      return { ...state, loaded: true };
    case 'LOAD_CONV':
      return { ...state, conversationId: action.data.id, topic: action.data.topic || '',
        allMessages: action.data.allMessages || [], history: action.data.history || [], error: null, loaded: true };
    case 'SET_CONV_ID':
      return { ...state, conversationId: action.id };
    case 'SET_TOPIC':
      return { ...state, topic: action.topic };
    case 'ADD_USER_MSG':
      return { ...state, allMessages: [...state.allMessages, { type: 'user', content: action.content }] };
    case 'START_STREAM':
      return { ...state, isStreaming: true, error: null };
    case 'PROGRESS':
      return { ...state, allMessages: action.messages, isStreaming: true };
    case 'FINISH_BATCH':
      return { ...state, allMessages: action.messages, history: action.history, isStreaming: false };
    case 'SET_ERROR':
      return { ...state, isStreaming: false, error: action.error };
    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode };
    case 'NEW_SESSION':
      return { ...state, conversationId: null, topic: '', allMessages: [], history: [], error: null };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initState, (init) => {
    const saved = localStorage.getItem('roundtable_dark_mode');
    return { ...init, darkMode: saved === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches };
  });
  const chatEndRef = useRef(null);
  const stateRef = useRef(state); stateRef.current = state;
  const streamTextRef = useRef('');
  const convIdRef = useRef(null);
  const [nearBottom, setNearBottom] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState(() => getStoredApiKey());
  const [hasApiKey, setHasApiKey] = useState(() => !!getStoredApiKey());

  // Refresh API key state when page gets focus (handles cases where user edits localStorage)
  useEffect(() => {
    function onFocus() {
      const stored = getStoredApiKey();
      setKeyInput(stored);
      setHasApiKey(!!stored);
    }
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') onFocus(); });
    return () => { window.removeEventListener('focus', onFocus); };
  }, []);
  const [showHistory, setShowHistory] = useState(false);

  function handleSaveKey() {
    const t = keyInput.trim(); if (t) { setApiKey(t); setHasApiKey(true); setShowSettings(false); }
  }

  // Load last conversation on startup
  useEffect(() => {
    (async () => {
      try {
        const list = await getConversations();
        if (list.length > 0) {
          dispatch({ type: 'LOAD_CONV', data: list[0] });
          convIdRef.current = list[0].id;
        }
      } catch {}
      dispatch({ type: 'INIT_DONE' });
    })();
  }, []);

  // Save on page unload
  useEffect(() => {
    function save() {
      const s = stateRef.current;
      if (s.allMessages.length > 0 && s.topic) {
        const data = { id: convIdRef.current || s.conversationId, topic: s.topic, allMessages: s.allMessages, history: s.history };
        // Sync save via sendBeacon-like approach - use sync XHR as fallback
        try {
          const req = indexedDB.open('roundtable_db', 1);
          req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('conversations', 'readwrite');
            const store = tx.objectStore('conversations');
            const record = { ...data, updatedAt: Date.now() };
            if (!record.id) record.createdAt = Date.now();
            store.put(record);
          };
        } catch {}
      }
    }
    window.addEventListener('beforeunload', save);
    return () => window.removeEventListener('beforeunload', save);
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
    localStorage.setItem('roundtable_dark_mode', state.darkMode);
  }, [state.darkMode]);

  // Auto-scroll: only if user is at bottom
  useEffect(() => {
    if (nearBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.allMessages]);

  function handleChatScroll(e) {
    const el = e.target;
    const d = el.scrollHeight - el.scrollTop - el.clientHeight;
    setNearBottom(d < 80);
  }

  // Auto-save after stream finishes
  const prevMsgLenRef = useRef(0);
  useEffect(() => {
    const msgs = state.allMessages;
    if (msgs.length > prevMsgLenRef.current && msgs.length > 0 && state.topic && !state.isStreaming) {
      prevMsgLenRef.current = msgs.length;
      const id = convIdRef.current || state.conversationId || undefined;
      saveConversation({ id, topic: state.topic, allMessages: msgs, history: state.history })
        .then(saved => {
          if (saved.id && !convIdRef.current) {
            convIdRef.current = saved.id;
            dispatch({ type: 'SET_CONV_ID', id: saved.id });
          }
        }).catch(() => {});
    }
  }, [state.allMessages, state.isStreaming]);

  const sendMessage = useCallback(async (userText) => {
    const cur = stateRef.current;
    const isFirst = cur.history.length === 0;
    const topic = isFirst ? userText : (cur.topic || userText);
    if (isFirst) dispatch({ type: 'SET_TOPIC', topic });

    dispatch({ type: 'ADD_USER_MSG', content: userText });
    const newHistory = [...cur.history, { role: 'user', content: userText }];

    dispatch({ type: 'START_STREAM' });
    let fullText = '';
    let lastCount = cur.allMessages.length;

    try {
      for await (const chunk of streamChat(newHistory)) {
        if (chunk.text) {
          fullText += chunk.text;
          // Progressive parse: show completed messages as they arrive
          const parsed = progressiveParse(fullText);
          if (parsed.messages.length > 0) {
            const newMsgs = [...cur.allMessages, ...parsed.messages];
            if (newMsgs.length > lastCount) {
              lastCount = newMsgs.length;
              dispatch({ type: 'PROGRESS', messages: newMsgs });
            }
          }
        }
      }
      if (!fullText.trim()) {
        dispatch({ type: 'SET_ERROR', error: 'AI 未返回内容，请重试' });
      } else {
        const parsed = progressiveParse(fullText);
        const newAllMessages = [...stateRef.current.allMessages, ...parsed.messages];
        const newFullHistory = [...newHistory];
        if (fullText.trim()) newFullHistory.push({ role: 'assistant', content: fullText.trim() });
        dispatch({ type: 'FINISH_BATCH', messages: newAllMessages, history: newFullHistory });

        // Save immediately after response
        const cur2 = stateRef.current;
        if (newAllMessages.length > 0 && cur2.topic) {
          saveConversation({
            id: convIdRef.current || cur2.conversationId,
            topic: cur2.topic || topic,
            allMessages: newAllMessages,
            history: newFullHistory,
          }).then(saved => {
            if (saved.id && !convIdRef.current) {
              convIdRef.current = saved.id;
              dispatch({ type: 'SET_CONV_ID', id: saved.id });
            }
          }).catch(() => {});
        }
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err.message || '连接失败' });
    }
  }, []);

  function handleNewSession() {
    dispatch({ type: 'NEW_SESSION' });
    convIdRef.current = null;
    streamTextRef.current = '';
    prevMsgLenRef.current = 0;
  }

  function handleSelectConv(conv) {
    dispatch({ type: 'LOAD_CONV', data: conv });
    convIdRef.current = conv.id;
    prevMsgLenRef.current = (conv.allMessages || conv.messages || []).length;
    setShowHistory(false);
  }

  const hasContent = state.allMessages.length > 0 || state.isStreaming;

  if (!state.loaded) {
    return <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>加载中...</div>;
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <HistoryDrawer open={showHistory} onClose={() => setShowHistory(false)}
        onSelect={handleSelectConv} currentId={convIdRef.current || state.conversationId} />
      <Header darkMode={state.darkMode} onToggleDark={() => dispatch({ type: 'TOGGLE_DARK' })}
        onReset={handleNewSession} onSettings={() => setShowSettings(!showSettings)}
        onHistory={() => setShowHistory(true)} hasHistory={true} />

      {showSettings && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>DeepSeek API Key</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="sk-..."
              style={{ flex: 1, height: '38px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid var(--border-subtle)', fontSize: '0.85rem', fontFamily: 'monospace', background: 'var(--bg-chat)', color: 'var(--text-primary)' }} />
            <button onClick={handleSaveKey} style={{ padding: '0 18px', borderRadius: '10px', border: 'none', background: '#2D2A26', color: '#fff', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>保存</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}
        onScroll={handleChatScroll}>
        {state.topic && <div style={{ textAlign: 'center', padding: '12px 24px 8px' }}>
          <span style={{ display: 'inline-block', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bubble-moderator-bg)', padding: '4px 14px', borderRadius: '12px' }}>{state.topic}</span>
        </div>}

        {!hasContent && hasApiKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🏛️</div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>圆桌会</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>输入议题，开启一场思想对话</div>
          </div>
        )}

        {!hasContent && !hasApiKey && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🏛️</div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>圆桌会</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>与思想者对话</div>
            <button onClick={() => setShowSettings(true)} style={{ padding: '10px 24px', borderRadius: '20px', border: '1.5px solid var(--border-subtle)', background: 'var(--bg-input)', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>⚙️ 设置 API Key</button>
          </div>
        )}

        {/* All messages */}
        {state.allMessages.map((msg, i) => (
          <ChatBubble key={`m-${i}`} message={msg} darkMode={state.darkMode}
            style={{ animationDelay: `${Math.min(i * 0.02, 0.15)}s` }} />
        ))}

        {/* Loading during streaming */}
        {state.isStreaming && <LoadingDots />}

        {/* Scroll-to-bottom button */}
        {!nearBottom && (
          <div style={{ position: 'sticky', bottom: 8, textAlign: 'center' }}>
            <button onClick={() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setNearBottom(true); }}
              style={{
                padding: '6px 14px', borderRadius: '16px', border: 'none',
                background: 'var(--bg-input)', color: 'var(--text-secondary)',
                fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}>↓ 最新消息</button>
          </div>
        )}

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
