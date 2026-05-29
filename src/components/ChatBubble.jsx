import FigureBubble from './FigureBubble';
import UserBubble from './UserBubble';

export default function ChatBubble({ message, darkMode, style }) {
  if (message.type === 'user') {
    return <UserBubble content={message.content} darkMode={darkMode} style={style} />;
  }
  return <FigureBubble name={message.name} content={message.content} darkMode={darkMode} style={style} />;
}
