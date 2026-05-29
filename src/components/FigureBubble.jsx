import { getAvatar } from '../services/avatars';

export default function FigureBubble({ name, content, darkMode, style }) {
  const isModerator = name === '主持人';
  const avatar = getAvatar(name);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '8px 14px', animation: 'msgIn 0.35s ease forwards',
      opacity: 0, ...style,
    }}>
      {/* Avatar */}
      <div
        dangerouslySetInnerHTML={{ __html: avatar }}
        style={{
          width: '40px', height: '40px', borderRadius: '50%',
          flexShrink: 0, overflow: 'hidden',
          boxShadow: isModerator
            ? '0 0 0 2px #8D6E63, 0 2px 6px rgba(0,0,0,0.1)'
            : '0 2px 6px rgba(0,0,0,0.1)',
        }}
      />

      {/* Message */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.75rem', fontWeight: 600, marginBottom: '2px', paddingLeft: '2px',
          color: isModerator
            ? (darkMode ? '#BCAAA4' : '#6D5D4B')
            : (darkMode ? '#D1D5DB' : '#4B5563'),
        }}>
          {name}
          {isModerator && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 400, marginLeft: '4px',
              color: darkMode ? '#8B7E74' : '#A09080',
            }}>群主</span>
          )}
        </div>
        <div style={{
          background: isModerator
            ? (darkMode ? '#2a2520' : '#F5F0E8')
            : (darkMode ? '#1f2937' : '#FFFFFF'),
          borderRadius: isModerator ? '12px' : '4px 14px 14px 14px',
          padding: '9px 13px', fontSize: '0.9375rem', lineHeight: '1.6',
          color: darkMode ? '#E5E7EB' : '#1F2937',
          boxShadow: isModerator ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          border: isModerator
            ? `1px solid ${darkMode ? '#3d352e' : '#E0D5C0'}`
            : 'none',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {content}
        </div>
      </div>
    </div>
  );
}
