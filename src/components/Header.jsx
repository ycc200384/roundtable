export default function Header({ darkMode, onToggleDark, onReset, onSettings, onHistory, hasHistory }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 12px', paddingTop: 'max(6px, env(safe-area-inset-top))',
      background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <HeaderBtn onClick={onHistory} label="📜" title="历史对话" />
        <HeaderBtn onClick={onSettings} label="⚙️" title="设置" />
      </div>
      <span style={{
        fontFamily: "'Noto Serif SC', serif", fontSize: '1.05rem',
        fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em',
      }}>圆桌会</span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button onClick={onReset} style={{
          padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)',
          background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.75rem',
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>新对话</button>
        <HeaderBtn onClick={onToggleDark} label={darkMode ? '☀️' : '🌙'} title="主题" />
      </div>
    </div>
  );
}

function HeaderBtn({ onClick, label, title }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      width: '32px', height: '32px', border: 'none', borderRadius: '50%',
      background: 'transparent', fontSize: '0.95rem', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-secondary)',
    }}>{label}</button>
  );
}
