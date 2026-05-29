import { useState } from 'react';

export default function TopicInput({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('');

  function send() {
    const t = text.trim();
    if (t && !disabled) { onSend(t); setText(''); }
  }

  return (
    <div style={{
      padding: '8px 12px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      background: 'var(--bg-input)', borderTop: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={placeholder || '说点什么...'} disabled={disabled}
          enterKeyHint="send" autoComplete="off"
          style={{
            flex: 1, height: '40px', border: '1.5px solid var(--border-subtle)',
            borderRadius: '20px', padding: '0 16px', fontSize: '0.9375rem',
            fontFamily: 'inherit', background: 'var(--bg-chat)', color: 'var(--text-primary)',
            outline: 'none',
          }} />
        <button onClick={send} disabled={disabled || !text.trim()}
          style={{
            width: '40px', height: '40px', minWidth: '40px', border: 'none',
            borderRadius: '50%', background: disabled || !text.trim() ? 'var(--border-subtle)' : '#2D2A26',
            color: disabled || !text.trim() ? 'var(--text-muted)' : '#fff',
            fontSize: '1rem', cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >↑</button>
      </div>
    </div>
  );
}
