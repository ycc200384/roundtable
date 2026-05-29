export default function Header({ darkMode, onToggleDark, onReset, onSettings }) {
  return (
    <div className="app-header">
      <button className="app-header__btn" onClick={onSettings} aria-label="设置" title="设置">
        ⚙️
      </button>
      <span className="app-header__title">圆桌会</span>
      <div className="app-header__actions">
        <button className="app-header__btn" onClick={onToggleDark} aria-label="切换主题">
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button className="app-header__btn" onClick={onReset} aria-label="新讨论" title="新讨论">
          ✕
        </button>
      </div>
    </div>
  );
}
