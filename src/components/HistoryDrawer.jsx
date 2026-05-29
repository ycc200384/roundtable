import { useState, useEffect, useCallback } from 'react';
import { getConversations, deleteConversation } from '../services/storage';

export default function HistoryDrawer({ open, onClose, onSelect, currentId }) {
  const [convs, setConvs] = useState([]);

  const load = useCallback(async () => {
    try {
      const list = await getConversations();
      setConvs(list);
    } catch {}
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    await deleteConversation(id);
    load();
  }

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(2px)',
      }} />
      {/* Drawer */}
      <div style={{
        position: 'relative', width: '280px', maxWidth: '85vw', height: '100%',
        background: 'var(--bg-input)', display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)', animation: 'slideIn 0.25s ease',
      }}>
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            📜 历史对话
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: '4px 8px',
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {convs.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}>还没有对话记录</div>
          )}
          {convs.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                padding: '12px', marginBottom: '4px', borderRadius: '10px',
                background: c.id === currentId ? 'var(--border-subtle)' : 'transparent',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <div style={{
                fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)',
                marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {c.topic || '未命名对话'}
              </div>
              <div style={{
                fontSize: '0.7rem', color: 'var(--text-muted)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>{formatDate(c.updatedAt)}</span>
                <button onClick={(e) => handleDelete(c.id, e)} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px',
                }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
