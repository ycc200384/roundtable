export default function ModeratorBubble({ content, style }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      padding: '8px 24px',
      animation: 'fadeUp 0.3s ease forwards',
      opacity: 0,
      ...style,
    }}>
      <span style={{
        background: 'var(--bubble-moderator-bg)',
        color: 'var(--bubble-moderator-text)',
        fontSize: '0.8rem',
        padding: '5px 14px',
        borderRadius: '10px',
        maxWidth: '85%',
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
      }}>
        {content}
      </span>
    </div>
  );
}
