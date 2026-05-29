import { useState } from 'react';

export default function CommandBar({ visible, disabled, onCommand, darkMode }) {
  const [showNewFigureInput, setShowNewFigureInput] = useState(false);
  const [newFigureName, setNewFigureName] = useState('');

  function handleAddFigure() {
    setShowNewFigureInput(true);
  }

  function handleConfirmNewFigure() {
    const name = newFigureName.trim();
    if (name) {
      onCommand(`引入新人物：${name}`);
    }
    setShowNewFigureInput(false);
    setNewFigureName('');
  }

  function handleCancelNewFigure() {
    setShowNewFigureInput(false);
    setNewFigureName('');
  }

  return (
    <>
      <div className={`command-bar${visible ? ' visible' : ''}`}>
        <button
          className="command-btn command-btn--continue"
          disabled={disabled || !visible}
          onClick={() => onCommand('可')}
        >
          可
        </button>
        <button
          className="command-btn command-btn--stop"
          disabled={disabled || !visible}
          onClick={() => onCommand('止')}
        >
          止
        </button>
        <button
          className="command-btn command-btn--deepen"
          disabled={disabled || !visible}
          onClick={() => onCommand('深入此节')}
        >
          深入此节
        </button>
        <button
          className="command-btn command-btn--add"
          disabled={disabled || !visible}
          onClick={handleAddFigure}
        >
          引入新人物
        </button>
      </div>

      {showNewFigureInput && (
        <div className="new-figure-overlay" onClick={handleCancelNewFigure}>
          <div className="new-figure-dialog" onClick={e => e.stopPropagation()}>
            <div className="new-figure-dialog__title">
              请输入新人物姓名
            </div>
            <input
              type="text"
              placeholder="例如：鲁迅"
              value={newFigureName}
              onChange={e => setNewFigureName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmNewFigure()}
              autoFocus
            />
            <div className="new-figure-dialog__actions">
              <button className="cancel-btn" onClick={handleCancelNewFigure}>
                取消
              </button>
              <button className="confirm-btn" onClick={handleConfirmNewFigure}>
                确认加入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
