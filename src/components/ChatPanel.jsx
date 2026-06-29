import { useState, useRef, useEffect } from 'react';
import { mockUsers, mockReactions } from '../data/mockData';
import './styles/ChatPanel.css';

function findUser(userId) {
  return mockUsers.find((u) => u.id === userId) || { name: 'Unknown', avatarColor: '#666' };
}

export default function ChatPanel({ messages, onSend, viewerCount }) {
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <aside className="chat-panel">
      <div className="chat-panel__header">
        <h3>The Seat Row</h3>
        <span className="chat-panel__count mono">{viewerCount.toLocaleString()} here</span>
      </div>

      <div className="chat-panel__messages" ref={listRef}>
        {messages.map((msg) => {
          const author = findUser(msg.userId);
          return (
            <div key={msg.id} className="chat-msg">
              <span className="chat-msg__avatar" style={{ background: author.avatarColor }}>
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

      <div className="chat-panel__reactions">
        {mockReactions.map((r) => (
          <button key={r} type="button" className="chat-reaction" aria-label={`React with ${r}`}>
            {r}
          </button>
        ))}
      </div>

      <form className="chat-panel__input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Say something to the room..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Chat message"
        />
        <button type="submit" className="chat-send" aria-label="Send message" disabled={!draft.trim()}>
          ➤
        </button>
      </form>
    </aside>
  );
}