import { getAvatarUrl } from '../services/api';

export default function FigureBubble({ name, action, content, seed, darkMode, style }) {
  const lines = content.split('\n');
  const summaryIndex = lines.findIndex(l => l.trim().startsWith('**简言之**'));
  const mainLines = summaryIndex >= 0 ? lines.slice(0, summaryIndex) : lines;
  const summaryLine = summaryIndex >= 0 ? lines[summaryIndex] : null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '10px 14px',
      animation: 'fadeUp 0.3s ease forwards',
      opacity: 0,
      ...style,
    }}>
      {/* Avatar */}
      <img
        src={getAvatarUrl(name, seed || name)}
        alt={name}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          flexShrink: 0,
          background: 'var(--avatar-bg, #e8e8e8)',
        }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      {/* Fallback avatar (emoji + color) */}
      <div style={{
        width: '42px', height: '42px', borderRadius: '50%',
        flexShrink: 0, display: 'none',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', fontWeight: 700,
        background: getColorFromName(name, darkMode),
        color: '#fff',
      }}>
        {name[0]}
      </div>

      {/* Message body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + action tag */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: '6px',
          marginBottom: '3px', paddingLeft: '2px',
        }}>
          <span style={{
            fontSize: '0.8rem', fontWeight: 600,
            color: darkMode ? '#D1D5DB' : '#374151',
          }}>
            {name}
          </span>
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
          }}>
            {action}
          </span>
        </div>

        {/* Bubble */}
        <div style={{
          background: darkMode ? '#1f2937' : '#FFFFFF',
          borderRadius: '4px 16px 16px 16px',
          padding: '10px 14px',
          fontSize: '0.9375rem',
          lineHeight: '1.6',
          color: darkMode ? '#E5E7EB' : '#1F2937',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {mainLines.join('\n').trim()}
          {summaryLine && (
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid ' + (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
              fontSize: '0.8rem',
              color: darkMode ? '#9CA3AF' : '#6B7280',
              fontWeight: 500,
            }}>
              💡 {summaryLine.replace('**简言之**：', '').replace('**简言之**:', '').trim()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getColorFromName(name, darkMode) {
  const colors = darkMode
    ? ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4']
    : ['#4f46e5', '#7c3aed', '#db2777', '#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
