export default function ModeratorBubble({ content, style }) {
  return (
    <div className="moderator-bubble" style={style}>
      <div className="moderator-bubble__content">
        {content}
      </div>
    </div>
  );
}
