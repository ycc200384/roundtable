import { useState } from 'react';

export default function AsciiDiagram({ content, style }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      padding: '8px 14px',
      animation: 'fadeUp 0.3s ease forwards',
      opacity: 0,
      ...style,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '8px 14px',
          border: 'none',
          borderRadius: '10px',
          background: 'var(--bubble-moderator-bg)',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span>{expanded ? '🔽' : '▶️'}</span>
        <span>思考框架</span>
      </button>
      {expanded && (
        <div style={{
          marginTop: '6px',
          background: 'var(--ascii-bg)',
          color: 'var(--ascii-text)',
          borderRadius: '10px',
          padding: '10px 12px',
          overflowX: 'auto',
        }}>
          <pre style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.55rem',
            lineHeight: '1.2',
            whiteSpace: 'pre',
            margin: 0,
          }}>
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}
