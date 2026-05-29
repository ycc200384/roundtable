import FigureBubble from './FigureBubble';

export default function ChatBubble({ message, darkMode, style }) {
  return (
    <FigureBubble
      name={message.name}
      content={message.content}
      darkMode={darkMode}
      style={style}
    />
  );
}
