export default function Header({ darkMode, onToggleDark, onReset, onSettings, onHistory, hasHistory }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 14px', paddingTop: 'max(8px, env(safe-area-inset-top))',
      background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {hasHistory && (
          <HeaderBtn onClick={onHistory} label="📜" title="历史对话" />
        )}
        <HeaderBtn onClick={onSettings} label="⚙️" title="设置" />
      </div>
      <span style={{
        fontFamily: "'Noto Serif SC', serif", fontSize: '1.05rem',
        fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em',
      }}>圆桌会</span>
      <div style={{ display: 'flex', gap: '4px' }}>
        <HeaderBtn onClick={onToggleDark} label={darkMode ? '☀️' : '🌙'} title="主题" />
        <HeaderBtn onClick={onReset} label="✨" title="新讨论" />
      </div>
    </div>
  );
}

function HeaderBtn({ onClick, label, title }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      width: '34px', height: '34px', border: 'none', borderRadius: '50%',
      background: 'transparent', fontSize: '1rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-secondary)',
    }}>{label}</button>
  );
}
