import { useState, useRef, useEffect } from 'react';
import { mockUsers, mockReactions } from '../data/mockData';
import './styles/ChatPanel.css';

function findUser(userId) {
  return mockUsers.find(u => u.id === userId)
    || { name: 'Viewer', avatarColor: '#8A8294' };
}

export default function ChatPanel({ messages, onSend, viewerCount, isFullScreen }) {
  const [draft, setDraft]       = useState('');
  const [tab, setTab]           = useState('chat');  // 'chat' | 'viewers'
  const listRef                 = useRef(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = e => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <aside className={`chat-panel ${isFullScreen ? 'chat-panel--fullscreen-float' : ''}`}>

      {/* ── Header ── */}
      <div className="chat-panel__header">
        <div className="chat-panel__tabs">
          <button
            className={`chat-panel__tab ${tab === 'chat' ? 'chat-panel__tab--active' : ''}`}
            onClick={() => setTab('chat')}
          >
            Chat
          </button>
          <button
            className={`chat-panel__tab ${tab === 'viewers' ? 'chat-panel__tab--active' : ''}`}
            onClick={() => setTab('viewers')}
          >
            Viewers
          </button>
        </div>
        <span className="chat-panel__count mono">
          <span className="chat-panel__count-dot" aria-hidden="true" />
          {viewerCount.toLocaleString()}
        </span>
      </div>

      {/* ── Chat tab ── */}
      {tab === 'chat' && (
        <>
          <div className="chat-panel__messages" ref={listRef} aria-live="polite" aria-label="Chat messages">
            {messages.map(msg => {
              const author = findUser(msg.userId);
              return (
                <div key={msg.id} className="chat-msg">
                  <span
                    className="chat-msg__avatar"
                    style={{ background: author.avatarColor }}
                    aria-hidden="true"
                  >
                    {author.name.charAt(0)}
                  </span>
                  <div className="chat-msg__body">
                    <div className="chat-msg__meta">
                      <span className="chat-msg__name">{author.name}</span>
                      <span className="chat-msg__time mono">{msg.time}</span>
                    </div>
                    <p className="chat-msg__text">{msg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick reactions */}
          <div className="chat-panel__reactions" aria-label="Quick reactions">
            {mockReactions.map(r => (
              <button
                key={r}
                type="button"
                className="chat-reaction"
                aria-label={`Send ${r}`}
                onClick={() => onSend(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input */}
          <form className="chat-panel__form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chat-panel__input"
              placeholder="Say something…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              aria-label="Chat message"
              maxLength={280}
            />
            <button
              type="submit"
              className="chat-panel__send"
              disabled={!draft.trim()}
              aria-label="Send message"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </>
      )}

      {/* ── Viewers tab ── */}
      {tab === 'viewers' && (
        <div className="chat-panel__viewers">
          {mockUsers.map(u => (
            <div key={u.id} className="viewer-row">
              <span className="viewer-row__avatar" style={{ background: u.avatarColor }}>
                {u.name.charAt(0)}
              </span>
              <div className="viewer-row__info">
                <span className="viewer-row__name">{u.name}</span>
                <span className="viewer-row__handle mono">{u.handle}</span>
              </div>
              <span className="viewer-row__online" aria-label="Online" />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}