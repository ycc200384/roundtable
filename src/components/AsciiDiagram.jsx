export default function AsciiDiagram({ content, style }) {
  return (
    <div className="ascii-diagram" style={style}>
      <div className="ascii-diagram__container">
        <pre>{content}</pre>
      </div>
    </div>
  );
}
