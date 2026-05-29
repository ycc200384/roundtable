export default function UserBubble({ content, darkMode, style }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', padding: '8px 14px',
      animation: 'msgIn 0.25s ease forwards', opacity: 0, ...style,
    }}>
      <div style={{
        maxWidth: '80%',
        background: darkMode ? '#1a3a5c' : '#DCF4F7',
        borderRadius: '14px 4px 14px 14px',
        padding: '9px 13px', fontSize: '0.9375rem', lineHeight: '1.6',
        color: darkMode ? '#E5E7EB' : '#1F2937',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {content}
      </div>
    </div>
  );
}
