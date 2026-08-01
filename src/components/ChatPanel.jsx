import { useState, useRef, useEffect } from "react";
import "./styles/ChatPanel.css";

const reactions = ['❤️', '😂', '😮', '👏', '🔥'];

// Fallback color when we only have a name (backend doesn't store avatar colors).
// Derive a stable color from the name so the same person always looks the same.
const AVATAR_COLORS = ['#FF5A3C', '#7C6BFF', '#4ADE80', '#FFD166', '#06D6A0', '#EF476F'];
function colorForName(name) {
  const str = String(name || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Turn an ISO timestamp into a short HH:MM label.
function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatPanel({
  id,
  messages = [],
  onSend,
  viewerCount = 0,
  isFullScreen,
  isOpen,
  users = [],
}) {
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState("chat"); // 'chat' | 'viewers'
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
    setDraft("");
  };

  return (
    <aside
      id={id}
      className={`chat-panel ${isOpen ? "chat-panel--open" : ""} ${isFullScreen ? "chat-panel--fullscreen-float" : ""}`}
      aria-hidden={!isOpen}
    >
      {/* ── Header ── */}
      <div className="chat-panel__header">
        <div className="chat-panel__tabs">
          <button
            className={`chat-panel__tab ${tab === "chat" ? "chat-panel__tab--active" : ""}`}
            onClick={() => setTab("chat")}
          >
            Chat
          </button>
          <button
            className={`chat-panel__tab ${tab === "viewers" ? "chat-panel__tab--active" : ""}`}
            onClick={() => setTab("viewers")}
          >
            Viewers
          </button>
        </div>
        <span className="chat-panel__count mono">
          <span className="chat-panel__count-dot" aria-hidden="true" />
          {Number(viewerCount).toLocaleString()}
        </span>
      </div>

      {/* ── Chat tab ── */}
      {tab === "chat" && (
        <>
          <div
            className="chat-panel__messages"
            ref={listRef}
            aria-live="polite"
            aria-label="Chat messages"
          >
            {messages.map((msg) => {
              // Backend message shape: { messageId, senderId, senderDisplayName, content, timestamp }
              const name = msg.senderDisplayName || 'Viewer';
              const time = formatTime(msg.timestamp);
              return (
                <div key={msg.messageId} className="chat-msg">
                  <span
                    className="chat-msg__avatar"
                    // style={{ background: colorForName(name) }}
                    aria-hidden="true"
                  >
                    {name.charAt(0)}
                  </span>
                  <div className="chat-msg__body">
                    <div className="chat-msg__meta">
                      <span className="chat-msg__name">{name}</span>
                      <span className="chat-msg__time mono">{time}</span>
                    </div>
                    <p className="chat-msg__text">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick reactions */}
          <div className="chat-panel__reactions" aria-label="Quick reactions">
            {reactions.map((r) => (
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
              onChange={(e) => setDraft(e.target.value)}
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
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </>
      )}

      {/* ── Viewers tab ── */}
      {tab === "viewers" && (
        <div className="chat-panel__viewers">
          {users.length === 0 ? (
            <p className="chat-panel__empty mono" style={{ padding: '16px', color: 'var(--mute)' }}>
              Live viewer list coming soon.
            </p>
          ) : (
            users.map((u) => (
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
            ))
          )}
        </div>
      )}
    </aside>
  );
}