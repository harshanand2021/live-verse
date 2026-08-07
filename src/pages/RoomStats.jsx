import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../api/userApi';
import { getLiveById, getLiveSeats, getRoomPolls } from '../api/liveApi';
import { useRoomSocket } from '../api/useRoomSocket';
import { normalizePoll, upsertPoll } from '../api/roomPolls';
import './styles/RoomStats.css';

/**
 * Live room stats.
 *
 * Most of this is assembled from what the room already publishes over the
 * socket, since there's no durable stats endpoint for it:
 *   PARTICIPANT_COUNT      → who is connected, updated on every join and leave
 *   ACTIVITY_LOG(_HISTORY) → the last 20 joins and leaves, held in Quarkus memory
 *   POLL_ACTIVE / POLL_*   → live updates for whatever poll the room is running
 *   GET /api/rooms/{id}/seats → seat occupancy, which is the one durable number
 *
 * Polls are the exception: GET /api/rooms/{id}/polls loads the room's full
 * poll history (every poll ever created there) on page load, and live socket
 * events keep it up to date after that — so polls created before this page
 * connected still show up, not just whichever one happens to be open now.
 *
 * The activity log lives only in the realtime service's memory, so it starts
 * from whatever backlog is there when this page connects and disappears when
 * the room does. This is a window on a running room, not a record of a finished
 * one.
 */

const MAX_LOG_ROWS = 20;

function formatTime(timestamp) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// The log carries ids, not names: "User 7 joined". Render it as written but
// pull the verb out so joins and leaves can be told apart at a glance.
function readEntry(message) {
  const match = String(message || '').match(/^User (\d+) (joined|left)$/);
  return match
    ? { userId: match[1], action: match[2], text: message }
    : { userId: null, action: null, text: String(message || '') };
}

export default function RoomStats() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [participantCount, setParticipantCount] = useState(0);
  const [activityLog, setActivityLog] = useState([]);
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [roomData, seatData, user, pollHistory] = await Promise.all([
          getLiveById(roomId),
          getLiveSeats(roomId),
          getCurrentUser(),
          getRoomPolls(roomId),
        ]);
        setRoom(roomData);
        setSeats(seatData);
        setCurrentUser(user);
        setPolls(pollHistory.map(normalizePoll).filter(Boolean));
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this room.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [roomId]);

  const appendEntries = useCallback((entries) => {
    setActivityLog((prev) => [...prev, ...entries].slice(-MAX_LOG_ROWS));
  }, []);

  const handleSocketEvent = useCallback(
    (event) => {
      const { type, payload } = event;

      if (type === 'PARTICIPANT_COUNT') {
        setParticipantCount(Number(payload?.count) || 0);
      } else if (type === 'ACTIVITY_LOG') {
        appendEntries([{ message: payload?.message, timestamp: payload?.timestamp }]);
      } else if (type === 'ACTIVITY_LOG_HISTORY') {
        // The backlog we're handed on connect — it replaces rather than adds to
        // what we have, since it already includes everything up to now.
        if (Array.isArray(payload?.entries)) {
          setActivityLog(payload.entries.slice(-MAX_LOG_ROWS));
        }
      } else if (
        type === 'POLL_ACTIVE' ||
        type === 'POLL_CREATE' ||
        type === 'POLL_VOTE' ||
        type === 'POLL_CLOSE'
      ) {
        const poll = normalizePoll(payload);
        if (poll) setPolls((prev) => upsertPoll(prev, poll));
      }
    },
    [appendEntries],
  );

  const { connected } = useRoomSocket({
    roomId: room?.id,
    userId: currentUser?.id,
    onEvent: handleSocketEvent,
  });

  const seatsOccupied = useMemo(
    () => seats.filter((seat) => seat.isBooked).length,
    [seats],
  );
  const totalSeats = seats.length || room?.totalSeats || 0;
  const occupancyPercent = totalSeats
    ? Math.round((seatsOccupied / totalSeats) * 100)
    : 0;

  if (loading) return (
    <div className="stats-page">
      <div className="stats-loading mono">Loading room stats…</div>
    </div>
  );

  if (error) return (
    <div className="stats-page">
      <div className="stats-error">{error}</div>
    </div>
  );

  if (!room) return null;

  const occupancyColor = occupancyPercent >= 80
    ? 'var(--success, #4ADE80)'
    : occupancyPercent >= 40
      ? 'var(--marquee, #FF5A3C)'
      : 'var(--mute)';

  const status = (room.status || '').toUpperCase() || 'UNKNOWN';

  return (
    <div className="stats-page">
      <div className="container stats-container">

        {/* Header */}
        <div className="stats-header">
          <Link to={`/room/${room.id}`} className="stats-back">← Back to Room</Link>
          <div>
            <p className="stats-eyebrow mono">LIVE ROOM STATS</p>
            <h1 className="stats-title">{room.title}</h1>
            <div className="stats-badges">
              <span className={`stats-badge stats-badge--${status.toLowerCase()}`}>
                {status}
              </span>
              <span className={`stats-live ${connected ? 'stats-live--on' : ''} mono`}>
                <span className="stats-live__dot" aria-hidden="true" />
                {connected ? 'LIVE' : 'RECONNECTING'}
              </span>
            </div>
          </div>
        </div>

        {/* Top stat cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-card__value">{participantCount}</span>
            <span className="stat-card__label mono">WATCHING</span>
            <span className="stat-card__sub">Connected right now</span>
          </div>

          <div className="stat-card">
            <span className="stat-card__value" style={{ color: occupancyColor }}>
              {occupancyPercent}%
            </span>
            <span className="stat-card__label mono">OCCUPANCY</span>
            <span className="stat-card__sub">{seatsOccupied} / {totalSeats} seats</span>
          </div>

          <div className="stat-card">
            <span className="stat-card__value">{polls.length}</span>
            <span className="stat-card__label mono">POLLS</span>
            <span className="stat-card__sub">
              {polls.filter((poll) => !poll.closed).length} still open
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-card__value">
              {polls.reduce((sum, poll) => sum + poll.totalVotes, 0)}
            </span>
            <span className="stat-card__label mono">VOTES</span>
            <span className="stat-card__sub">Cast across all polls</span>
          </div>
        </div>

        {/* Poll results */}
        <div className="stats-section">
          <h2 className="stats-section__title mono">POLL RESULTS</h2>
          {polls.length === 0 ? (
            <p className="stats-empty mono">
              No polls yet in this room.
            </p>
          ) : (
            <div className="stats-polls">
              {polls.slice().reverse().map((poll) => {
                const leadingVotes = Math.max(
                  ...poll.options.map((option) => option.voteCount),
                );
                return (
                  <div key={poll.pollId} className="poll-result">
                    <div className="poll-result__header">
                      <span className="poll-result__title">{poll.title}</span>
                      <span className={`poll-result__status mono poll-result__status--${poll.status.toLowerCase()}`}>
                        {poll.status}
                      </span>
                    </div>

                    {poll.totalVotes === 0 ? (
                      <p className="poll-result__no-votes mono">No votes cast yet</p>
                    ) : (
                      <ul className="poll-result__options">
                        {poll.options.map((option, index) => (
                          <li key={option.optionId} className="poll-result__option">
                            <div className="poll-result__option-head">
                              <span className="poll-result__option-name">
                                {option.optionTitle}
                                {option.voteCount === leadingVotes && (
                                  <span className="poll-result__lead mono">
                                    {poll.closed ? 'WINNER' : 'LEADING'}
                                  </span>
                                )}
                              </span>
                              <span className="poll-result__option-votes mono">
                                {option.voteCount} · {poll.percents[index]}%
                              </span>
                            </div>
                            <div className="poll-result__bar">
                              <div
                                className="poll-result__bar-fill"
                                style={{ width: `${poll.percents[index]}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="poll-result__total mono">
                      {poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} total
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Occupancy bar */}
        <div className="stats-section">
          <h2 className="stats-section__title mono">SEAT OCCUPANCY</h2>
          <div className="stats-occupancy">
            <div className="stats-occupancy__bar">
              <div
                className="stats-occupancy__fill"
                style={{ width: `${occupancyPercent}%`, background: occupancyColor }}
              />
            </div>
            <span className="stats-occupancy__label mono">
              {seatsOccupied} of {totalSeats} seats taken
            </span>
          </div>
        </div>

        {/* Activity feed */}
        <div className="stats-section">
          <h2 className="stats-section__title mono">ACTIVITY</h2>
          {activityLog.length === 0 ? (
            <p className="stats-empty mono">Nothing has happened yet.</p>
          ) : (
            <ul className="stats-activity">
              {activityLog.slice().reverse().map((entry, index) => {
                const { userId, action, text } = readEntry(entry.message);
                return (
                  <li
                    key={`${entry.timestamp}-${index}`}
                    className={`stats-activity__row stats-activity__row--${action || 'other'}`}
                  >
                    <span className="stats-activity__dot" aria-hidden="true" />
                    <span className="stats-activity__text">
                      {userId && String(userId) === String(currentUser?.id)
                        ? text.replace(`User ${userId}`, 'You')
                        : text}
                    </span>
                    <span className="stats-activity__time mono">
                      {formatTime(entry.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="stats-footnote mono">
          Reading these stats keeps a connection to the room open, so this page
          counts itself among the watchers. The activity log holds the last{' '}
          {MAX_LOG_ROWS} events and is not stored anywhere — it goes when the
          room does.
        </p>

      </div>
    </div>
  );
}
