import FigureBubble from './FigureBubble';
import ModeratorBubble from './ModeratorBubble';
import AsciiDiagram from './AsciiDiagram';

export default function ChatBubble({ message, colorIndex, seed, darkMode, style }) {
  switch (message.type) {
    case 'figure':
      return (
        <FigureBubble
          name={message.name}
          action={message.action}
          content={message.content}
          colorIndex={colorIndex}
          seed={seed}
          darkMode={darkMode}
          style={style}
        />
      );
    case 'moderator':
      return <ModeratorBubble content={message.content} style={style} />;
    case 'ascii':
      return <AsciiDiagram content={message.content} style={style} />;
    default:
      return null;
  }
}
