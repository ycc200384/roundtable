import { useState } from 'react';

export default function TopicInput({ onSend, disabled, placeholder }) {
  const [text, setText] = useState('');

  function handleSend() {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="topic-input-area">
      <div className="wrapper">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入讨论话题...'}
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button onClick={handleSend} disabled={disabled || !text.trim()} aria-label="发送">
          ▶
        </button>
      </div>
    </div>
  );
}
