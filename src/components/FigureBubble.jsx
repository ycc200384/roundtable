import { getFigureColor } from '../services/api';

export default function FigureBubble({ name, action, content, colorIndex, darkMode, style }) {
  const color = getFigureColor(colorIndex, darkMode);
  const lines = content.split('\n');
  const summaryIndex = lines.findIndex(l => l.trim().startsWith('**简言之**'));

  const mainLines = summaryIndex >= 0 ? lines.slice(0, summaryIndex) : lines;
  const summaryLine = summaryIndex >= 0 ? lines[summaryIndex] : null;

  return (
    <div className="figure-bubble" style={style}>
      <div className="figure-bubble__badge">
        <span
          className="figure-bubble__name"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {name}
        </span>
        <span className="figure-bubble__action">{action}</span>
      </div>
      <div
        className="figure-bubble__content"
        style={{
          backgroundColor: color.bg,
          borderLeft: `3px solid ${color.border}`,
          color: darkMode ? '#E8E6E3' : '#2D2A26',
        }}
      >
        {mainLines.join('\n').trim()}
        {summaryLine && (
          <>
            {'\n\n'}
            <strong style={{ color: color.text, opacity: 0.85 }}>
              {summaryLine.trim()}
            </strong>
          </>
        )}
      </div>
    </div>
  );
}
