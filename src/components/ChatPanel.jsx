import { useState, useRef, useEffect, useMemo } from "react";
import PollCard from "./PollCard";
import {
  MAX_OPTIONS,
  MAX_OPTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MIN_OPTIONS,
  buildEndEvent,
  buildPollCreateEvent,
  buildVoteEvent,
  derivePolls,
  encodePollEvent,
  findActivePoll,
  isPollEvent,
} from "../api/roomPolls";
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

const EMPTY_POLL_DRAFT = { question: "", options: ["", ""] };

export default function ChatPanel({
  id,
  messages = [],
  onSend,
  viewerCount = 0,
  isFullScreen,
  isOpen,
  users = [],
  isHost = false,
  hostId,
  currentUserId,
}) {
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState("chat"); // 'chat' | 'viewers'
  const [composer, setComposer] = useState("chat"); // 'chat' | 'poll'
  const [pollDraft, setPollDraft] = useState(EMPTY_POLL_DRAFT);
  const listRef = useRef(null);

  // Polls live in the chat stream itself — see src/api/roomPolls.js — so the
  // messages we already have are the whole source of truth.
  const { polls, cardByIndex } = useMemo(
    () => derivePolls(messages, hostId),
    [messages, hostId],
  );
  // The newest open poll is pinned above the composer so it can't scroll away.
  const activePoll = useMemo(() => findActivePoll(polls), [polls]);
  const myId = currentUserId == null ? null : String(currentUserId);
  const myVoteIn = (poll) => (myId == null ? null : poll.votes.get(myId) ?? null);

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

  // Every poll action is just another chat message, so it reaches the room over
  // the same socket everything else does.
  const handleVote = (poll, optionIndex) => {
    if (poll.closed) return;
    if (myVoteIn(poll) === optionIndex) return; // already their answer
    onSend(encodePollEvent(buildVoteEvent(poll.id, optionIndex)));
  };

  const handleEndPoll = (poll) => {
    if (!isHost || poll.closed) return;
    onSend(encodePollEvent(buildEndEvent(poll.id)));
  };

  const pollDraftOptions = pollDraft.options.map((option) => option.trim());
  const canLaunchPoll =
    Boolean(pollDraft.question.trim()) &&
    pollDraftOptions.filter(Boolean).length >= MIN_OPTIONS;

  const handleLaunchPoll = (e) => {
    e.preventDefault();
    if (!isHost || !canLaunchPoll) return;

    // One poll at a time: the room shouldn't have to guess which one they're
    // being asked about, so launching closes whatever was still running.
    if (activePoll) onSend(encodePollEvent(buildEndEvent(activePoll.id)));

    onSend(
      encodePollEvent(
        buildPollCreateEvent(pollDraft.question, pollDraft.options),
      ),
    );
    setPollDraft(EMPTY_POLL_DRAFT);
    setComposer("chat");
    setTab("chat");
  };

  const setPollOption = (index, value) =>
    setPollDraft((prev) => ({
      ...prev,
      options: prev.options.map((option, i) => (i === index ? value : option)),
    }));

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
            {messages.map((msg, index) => {
              // A poll was created here — show the poll in its place. While it
              // is the pinned one, the stream keeps a one-line marker instead so
              // the same card isn't on screen twice.
              const poll = cardByIndex.get(index);
              if (poll) {
                if (activePoll && poll.id === activePoll.id) {
                  return (
                    <p key={`poll-ref-${poll.id}`} className="chat-poll-ref mono">
                      📊 Poll started — {poll.question}
                    </p>
                  );
                }
                return (
                  <PollCard
                    key={`poll-${poll.id}`}
                    poll={poll}
                    myVote={myVoteIn(poll)}
                    isHost={isHost}
                    onVote={handleVote}
                    onEnd={handleEndPoll}
                  />
                );
              }
              // Votes and close events are plumbing; never render them as text.
              if (isPollEvent(msg.content)) return null;

              // Backend message shape: { messageId, senderId, senderDisplayName, content, timestamp }
              const name = msg.senderDisplayName || 'Viewer';
              const time = formatTime(msg.timestamp);
              return (
                <div key={msg.messageId ?? `msg-${index}`} className="chat-msg">
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

          {/* The poll everyone is being asked about right now, kept in view. */}
          {activePoll && (
            <div className="chat-panel__pinned">
              <PollCard
                poll={activePoll}
                myVote={myVoteIn(activePoll)}
                isHost={isHost}
                onVote={handleVote}
                onEnd={handleEndPoll}
              />
            </div>
          )}

          {composer === "poll" ? (
            /* ── Host poll builder ── */
            <form className="poll-form" onSubmit={handleLaunchPoll}>
              <div className="poll-form__head">
                <strong>New poll</strong>
                <button
                  type="button"
                  className="poll-form__cancel"
                  onClick={() => {
                    setPollDraft(EMPTY_POLL_DRAFT);
                    setComposer("chat");
                  }}
                >
                  Cancel
                </button>
              </div>

              <input
                type="text"
                className="poll-form__input"
                placeholder="Ask the room something…"
                value={pollDraft.question}
                onChange={(e) =>
                  setPollDraft((prev) => ({ ...prev, question: e.target.value }))
                }
                aria-label="Poll question"
                maxLength={MAX_QUESTION_LENGTH}
                autoFocus
              />

              {pollDraft.options.map((option, index) => (
                <div className="poll-form__option" key={index}>
                  <input
                    type="text"
                    className="poll-form__input"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => setPollOption(index, e.target.value)}
                    aria-label={`Poll option ${index + 1}`}
                    maxLength={MAX_OPTION_LENGTH}
                  />
                  {pollDraft.options.length > MIN_OPTIONS && (
                    <button
                      type="button"
                      className="poll-form__remove"
                      aria-label={`Remove option ${index + 1}`}
                      onClick={() =>
                        setPollDraft((prev) => ({
                          ...prev,
                          options: prev.options.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <div className="poll-form__actions">
                <button
                  type="button"
                  className="poll-form__add"
                  disabled={pollDraft.options.length >= MAX_OPTIONS}
                  onClick={() =>
                    setPollDraft((prev) => ({
                      ...prev,
                      options: [...prev.options, ""],
                    }))
                  }
                >
                  + Option
                </button>
                <button
                  type="submit"
                  className="poll-form__launch"
                  disabled={!canLaunchPoll}
                >
                  {activePoll ? "Replace live poll" : "Start poll"}
                </button>
              </div>
            </form>
          ) : (
            <>
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
                {isHost && (
                  <button
                    type="button"
                    className="chat-panel__poll-btn"
                    onClick={() => setComposer("poll")}
                    title="Create a poll"
                    aria-label="Create a poll"
                  >
                    📊
                  </button>
                )}
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