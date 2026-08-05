import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getCurrentUser } from "../api/userApi";
import {
  claimSeat,
  endLive,
  extractYoutubeId,
  getLiveById,
  getLiveComments,
  getLiveSeats,
  setLiveMedia,
} from "../api/liveApi";

import ScreenPlayer from "../components/ScreenPlayer";
import TheatreSeats from "../components/TheratreSeats";
import ChatPanel from "../components/ChatPanel";
import HostControls from "../components/HostControls";
import InsideView from "../components/InsideView";
import PrivateTalk from "../components/PrivateTalk";
import TheaterFlythrough from "../components/TheaterFlythrough";

import "./styles/WatchRoom.css";
import { useRoomSocket } from "../api/useRoomSocket";
import { useScreenShare } from "../api/useScreenShare";
import {
  MIN_OPTIONS as MIN_POLL_OPTIONS,
  VOTED_UNKNOWN,
  buildPollCreatePayload,
  describePollError,
  findActivePoll,
  isAlreadyVotedError,
  isPollError,
  normalizePoll,
  readMyVotes,
  upsertPoll,
  writeMyVotes,
} from "../api/roomPolls";

// Stable avatar color derived from a user id, so the same person always
// gets the same color in the viewers list.
const AVATAR_COLORS = [
  "#FF5A3C",
  "#7C6BFF",
  "#4ADE80",
  "#FFD166",
  "#06D6A0",
  "#EF476F",
];
function colorForId(id) {
  const n = parseInt(id, 10) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

const FLIGHT_MS = 3000;

export default function WatchRoom() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [seatSections, setSeatSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [talkSeat, setTalkSeat] = useState(null);
  const [animateEntry, setAnimateEntry] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isEndingShow, setIsEndingShow] = useState(false);
  const [endShowError, setEndShowError] = useState("");
  const [mediaError, setMediaError] = useState("");
  // const directVideoRef = useRef(null);

  // Hosts step straight onto their reserved seat; everyone else has to pick
  // one before the screen is revealed — no seat, no show.
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [hasEntered, setHasEntered] = useState(false);

  // Non-null while the drone shot from the seat to the screen is in the air;
  // holds the seat's centre in viewport pixels so the flight can start there.
  const [flight, setFlight] = useState(null);
  const pickerRef = useRef(null);
  const claimRef = useRef(null);

  const [localVideo, setLocalVideo] = useState(null);
  // Latest playback position/state broadcast by the host, applied by ScreenPlayer.
  const [syncState, setSyncState] = useState(null);

  // Polls are owned by the backend now — these hold whatever the room's
  // POLL_* events last told us. myVotes is the one piece the server can't
  // replay to us, so it's kept locally; see api/roomPolls.js.
  const [polls, setPolls] = useState([]);
  const [myVotes, setMyVotes] = useState({});
  const [pollError, setPollError] = useState("");
  const [pollPending, setPollPending] = useState(false);
  // Live headcount from the realtime service, kept apart from `users` — the
  // roster is only as complete as the activity log we happened to receive.
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (!roomId) return;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const roomData = await getLiveById(roomId);
        const seats = await getLiveSeats(roomId);
        const comments = await getLiveComments(roomId);
        const currentUserData = await getCurrentUser();

        setRoom(roomData);
        setSeatSections(seats);
        setMessages(comments);
        setCurrentUser(currentUserData);
        setUsers([]);
        // Our own poll answers, restored so a reload doesn't drop us back onto
        // a poll we've already voted in with the card looking untouched.
        setMyVotes(readMyVotes(currentUserData.id));

        // If this user already booked a seat in this room, restore their
        // seat and drop them straight into the theatre — no need to re-pick.
        const mySeat = seats.find(
          (seat) =>
            seat.isBooked &&
            String(seat.bookedByUserId) === String(currentUserData.id),
        );
        if (mySeat) {
          setSelectedSeatId(mySeat.seatNumber);
          setHasEntered(true);
        }
      } catch (err) {
        console.error("FAILED REQUEST:", err);
        setLoadError(err.response?.data?.message || "Unable to load room.");
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId]);

  // Pass null to forget a vote that turned out not to have landed.
  const rememberVote = useCallback(
    (pollId, optionId) => {
      setMyVotes((prev) => {
        const next = { ...prev };
        if (optionId == null) delete next[pollId];
        else next[pollId] = optionId;
        return writeMyVotes(currentUser?.id, next);
      });
    },
    [currentUser?.id],
  );

  const handleSetContent = async (url, kind) => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (kind !== "youtube") {
      // A direct video/stream URL has nowhere to live on the room — the backend
      // only stores a YouTube link — so this stays a host-only preview.
      setMediaError("");
      setLocalVideo({ kind: "direct", url: trimmed });
      return;
    }

    if (!getYouTubeVideoId(trimmed)) {
      setMediaError("Enter a valid YouTube URL.");
      return;
    }

    try {
      setMediaError("");
      // Persist it so anyone entering later gets it from the room itself...
      const updated = await setLiveMedia(room.id, trimmed);
      setRoom(updated);
      setLocalVideo(null); // the room now carries the video; no host override
      // ...and push it to everyone already seated so nobody has to refresh.
      sendSignal("ROOM_VIDEO_CHANGED", { videoUrl: trimmed });
    } catch (error) {
      setMediaError(
        error.response?.data?.message || "Unable to change the video.",
      );
    }
  };

  const handleClearContent = () => {
    setMediaError("");
    setLocalVideo(null);
  };

  const isHost = String(room?.hostId) === String(currentUser?.id);

  // Everyone the host has to open a peer connection to: the room roster minus
  // the host themselves. Memoised so the offer effect only reacts to real
  // arrivals and departures.
  const viewerIds = useMemo(
    () =>
      users
        .map((user) => String(user.id))
        .filter(
          (id) => id !== String(room?.hostId) && id !== String(currentUser?.id),
        ),
    [users, room?.hostId, currentUser?.id],
  );

  // useRoomSocket needs an onEvent that routes signaling into this hook, and
  // this hook needs the socket's send — a cycle. The ref breaks it: send is
  // stable, so the wrapper below is safe to hand over before the socket exists.
  const sendRef = useRef(null);
  const sendSignal = useCallback(
    (type, payload) => sendRef.current?.(type, payload),
    [],
  );

  // The vote we're waiting on. A rejection names neither the poll nor the
  // action, so this is what lets us tell whose failure it was.
  const pendingVoteRef = useRef(null);

  const {
    localStream,
    remoteStream,
    surface: sharedSurface,
    error: webrtcError,
    startShare,
    stopShare,
    handleSignal,
    dropPeer,
  } = useScreenShare({
    isHost,
    hostId: room?.hostId,
    currentUserId: currentUser?.id,
    viewerIds,
    send: sendSignal,
  });

  // The host watches their own capture; everyone else watches what arrives
  // over the peer connection.
  const sharedScreenStream = isHost ? localStream : remoteStream;

  // Host tells the room what they just did. The backend persists the position
  // (so late joiners land in the right place) and echoes it to everyone.
  const handleHostPlaybackAction = useCallback(
    (action, positionSeconds, isPlaying) => {
      sendSignal(`YOUTUBE_${action}`, {
        action,
        positionSeconds: Math.max(0, Math.round(positionSeconds || 0)),
        isPlaying,
      });
    },
    [sendSignal],
  );

  const toggleScreenShare = () => {
    if (localStream) {
      stopShare();
      return;
    }
    startShare();
  };

  /* ── Polls ──
   * Every action is fire-and-forget over the socket: Quarkus writes it through
   * to Core and broadcasts the poll's new state back to the whole room, so the
   * card only ever moves once the server says so. A refusal arrives separately
   * as an ERROR, addressed to us alone.
   */
  const activePoll = useMemo(() => findActivePoll(polls), [polls]);

  const handleCreatePoll = useCallback(
    (question, options) => {
      if (!isHost) return;

      const payload = buildPollCreatePayload(question, options);
      if (payload.options.length < MIN_POLL_OPTIONS) return;

      setPollError("");
      setPollPending(true);
      if (!sendSignal("POLL_CREATE", payload)) {
        setPollPending(false);
        setPollError("Not connected — the poll wasn't started.");
      }
    },
    [isHost, sendSignal],
  );

  const handleVotePoll = useCallback(
    (poll, option) => {
      if (poll.closed) return;

      setPollError("");
      setPollPending(true);
      pendingVoteRef.current = {
        pollId: poll.pollId,
        optionId: option.optionId,
      };

      const sent = sendSignal("POLL_VOTE", {
        pollId: Number(poll.pollId),
        optionId: Number(option.optionId),
      });

      if (!sent) {
        pendingVoteRef.current = null;
        setPollPending(false);
        setPollError("Not connected — your vote wasn't sent.");
        return;
      }

      // Recorded now rather than on the echo, because the echo is a room
      // broadcast that doesn't say whose vote it was. If Core turns it down,
      // the ERROR handler takes it back.
      rememberVote(poll.pollId, option.optionId);
    },
    [sendSignal, rememberVote],
  );

  const handleClosePoll = useCallback(
    (poll) => {
      if (!isHost || poll.closed) return;

      setPollError("");
      setPollPending(true);
      if (!sendSignal("POLL_CLOSE", { pollId: Number(poll.pollId) })) {
        setPollPending(false);
        setPollError("Not connected — the poll wasn't closed.");
      }
    },
    [isHost, sendSignal],
  );

  const handleEndShow = async () => {
    if (!isHost || isEndingShow) return;
    if (
      !window.confirm("End this showing for everyone? This cannot be undone.")
    )
      if (
        !window.confirm("End this showing for everyone? This cannot be undone.")
      )
        return;

    setEndShowError("");
    setIsEndingShow(true);
    try {
      const endedRoom = await endLive(room.id);
      setRoom(endedRoom);
      stopShare();
      setIsPlaying(false);
      setMessages([]);
      setSeatSections([]);
    } catch (error) {
      setEndShowError(
        error.response?.data?.message ||
          "Unable to end the showing. Please try again.",
      );
    } finally {
      setIsEndingShow(false);
    }
  };

  // Parse "User {id} joined" / "User {id} left" and keep the live roster.
  // Only the current user's real name is known locally; everyone else shows
  // as "User {id}" (the activity log only carries ids).
  const applyActivity = useCallback(
    (message) => {
      if (typeof message !== "string") return;
      const joinMatch = message.match(/^User (\d+) joined$/);
      const leaveMatch = message.match(/^User (\d+) left$/);

      if (joinMatch) {
        const uid = joinMatch[1];
        setUsers((prev) => {
          if (prev.some((u) => String(u.id) === uid)) return prev; // already present
          const isMe = String(uid) === String(currentUser?.id);
          return [
            ...prev,
            {
              id: uid,
              name: isMe ? currentUser?.name || `User ${uid}` : `User ${uid}`,
              handle: isMe
                ? currentUser?.handle || `@user${uid}`
                : `@user${uid}`,
              avatarColor: colorForId(uid),
              isMe,
            },
          ];
        });
      } else if (leaveMatch) {
        const uid = leaveMatch[1];
        setUsers((prev) => prev.filter((u) => String(u.id) !== uid));
      }
    },
    [currentUser],
  );

  const handleSocketEvent = useCallback(
    (event) => {
      const { type, payload } = event;

      if (type === "CHAT") {
        setMessages((prev) => {
          const isDuplicate = prev.some(
            (m) =>
              (payload.messageId != null &&
                m.messageId === payload.messageId) ||
              (m.messageId == null &&
                m.content === payload.content &&
                m.senderId === payload.senderId &&
                m.timestamp === payload.timestamp),
          );
          if (isDuplicate) return prev;
          return [...prev, payload];
        });
      } else if (type === "CHAT_HISTORY") {
        if (Array.isArray(payload.messages)) {
          setMessages(payload.messages);
        }
      } else if (type === "ACTIVITY_LOG") {
        applyActivity(payload.message);
      } else if (type === "ACTIVITY_LOG_HISTORY") {
        if (Array.isArray(payload.entries)) {
          payload.entries.forEach((e) => applyActivity(e.message));
        }
      } else if (type === "PARTICIPANT_COUNT") {
        setParticipantCount(Number(payload?.count) || 0);
      } else if (
        type === "POLL_ACTIVE" ||
        type === "POLL_CREATE" ||
        type === "POLL_VOTE" ||
        type === "POLL_CLOSE"
      ) {
        // Each of these carries the poll's entire current state, so there's
        // nothing to reconcile — the newest one simply wins. POLL_ACTIVE is the
        // snapshot sent to us alone on connect; the rest are room broadcasts.
        const poll = normalizePoll(payload);
        if (poll) {
          setPolls((prev) => upsertPoll(prev, poll));
          setPollPending(false);
          setPollError("");
          if (pendingVoteRef.current?.pollId === poll.pollId) {
            pendingVoteRef.current = null;
          }
        }
      } else if (
        type === "YOUTUBE_SYNC_STATE" ||
        type === "YOUTUBE_PLAY" ||
        type === "YOUTUBE_PAUSE" ||
        type === "YOUTUBE_SEEK"
      ) {
        // YOUTUBE_SYNC_STATE is the one-off snapshot sent just to us on join;
        // the other three are the host acting live. receivedAt keeps the object
        // identity fresh so repeating the same position still re-applies.
        setSyncState({
          isPlaying: payload.isPlaying,
          positionSeconds: payload.positionSeconds,
          updatedAt: payload.updatedAt,
          isSnapshot: type === "YOUTUBE_SYNC_STATE",
          receivedAt: Date.now(),
        });
      } else if (type === "ROOM_VIDEO_CHANGED") {
        // Host switched what's playing — swap it in where we sit, no refresh.
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                videoUrl: payload.videoUrl,
                youtubeVideoId: extractYoutubeId(payload.videoUrl),
              }
            : prev,
        );
        setLocalVideo(null);
      } else if (type.startsWith("WEBRTC_")) {
        handleSignal(type, payload);
      } else if (type === "ERROR") {
        const message = payload?.message;
        // The relay rejects a signal aimed at someone who has already gone;
        // drop that peer so we stop trying to reach them.
        const goneUserId = message?.match(
          /No active session for user (\d+)/,
        )?.[1];

        if (goneUserId) {
          dropPeer(goneUserId);
        } else if (isPollError(message)) {
          // ERROR is the only way a poll action reports failure, and it comes
          // back with nothing but text — no poll id, no indication of which
          // action it belongs to.
          setPollPending(false);
          setPollError(describePollError(message));

          // Whatever went wrong, the vote didn't count — take it back. The one
          // exception is a rejection that says we'd already voted: that one
          // means the vote landed on an earlier visit and only the option is
          // lost to us.
          const attempted = pendingVoteRef.current;
          if (attempted) {
            rememberVote(
              attempted.pollId,
              isAlreadyVotedError(message) ? VOTED_UNKNOWN : null,
            );
          }
          pendingVoteRef.current = null;
        } else {
          console.warn("Room socket error:", message);
        }
      }
    },
    [applyActivity, handleSignal, dropPeer, rememberVote],
  );

  const { send, sendChat } = useRoomSocket({
    roomId: room?.id,
    userId: currentUser?.id,
    onEvent: handleSocketEvent,
  });

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  if (loading)
    return (
      <div className="watch-room">
        <div className="container">Loading room…</div>
      </div>
    );
  if (loadError || !room || !currentUser)
    return (
      <div className="watch-room">
        <div className="container">{loadError || "Room not found."}</div>
      </div>
    );

  // Touchdown: swap the picker out for the theatre once the camera arrives.
  // The seat claim was fired at take-off, so by now it has usually landed too.
  const landInTheatre = async (claim) => {
    try {
      const updatedSeats = await claim;
      setSeatSections(updatedSeats);
      setAnimateEntry(true);
      setHasEntered(true);
    } catch (error) {
      setLoadError(
        error.response?.data?.message || "Unable to claim that seat.",
      );
    } finally {
      setFlight(null);
    }
  };

  const handleEnterTheatre = () => {
    if (!selectedSeatId || flight) return;

    // Claim the seat while the camera is flying — the round-trip hides inside
    // the shot instead of stalling in front of it.
    const claim = claimSeat(room.id, selectedSeatId).then(() =>
      getLiveSeats(room.id),
    );
    claimRef.current = claim;
    claim.catch(() => {}); // settled again at touchdown; this just keeps it from going unhandled

    const seatEl = document.querySelector(
      `[data-seat-number="${selectedSeatId}"]`,
    );
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // No seat to launch from, or motion is unwelcome: cut straight in.
    if (!seatEl || prefersReduced) {
      landInTheatre(claim);
      return;
    }

    const seatRect = seatEl.getBoundingClientRect();
    const originX = seatRect.left + seatRect.width / 2;
    const originY = seatRect.top + seatRect.height / 2;

    // The picker dives toward the seat as the camera leaves it, so the two
    // views push in the same direction across the cut.
    const picker = pickerRef.current;
    if (picker) {
      const pickerRect = picker.getBoundingClientRect();
      picker.style.setProperty("--dive-x", `${originX - pickerRect.left}px`);
      picker.style.setProperty("--dive-y", `${originY - pickerRect.top}px`);
    }

    setFlight({ x: originX, y: originY, seatNumber: selectedSeatId });
  };

  const handleSend = (text) => {
    // Send over WebSocket only. Quarkus persists it and broadcasts it back to
    // everyone (including us), and handleSocketEvent appends it when the echo
    // arrives. Do NOT post via REST or append locally — a REST write never
    // reaches the other clients, and appending here double-posts our own copy.
    const sent = sendChat(text);
    if (!sent) {
      console.warn("Chat socket not connected; message not sent.");
    }
  };

  return (
    <div
      className={`watch-room ${isFullScreen ? "watch-room--fullscreen" : ""}`}
    >
      {/* ── Top bar (hidden in fullscreen) ── */}
      {!isFullScreen && (
        <div className="watch-room__topbar container">
          {/* The report is live now, not a post-mortem — the activity it reads
              only exists in the realtime service while the room is running. */}
          {isHost && (
            <Link
              to={`/rooms/${room.id}/stats`}
              className="watch-room__stats-link"
            >
              Room Stats →
            </Link>
          )}

          <Link to="/rooms" className="watch-room__back">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Leave Room
          </Link>

          <div className="watch-room__info">
            <h2 className="watch-room__title">{room.title}</h2>
            <p className="watch-room__meta">
              Hosted by <strong>{room.hostName}</strong>
              {room.code && (
                <span className="watch-room__code mono">CODE: {room.code}</span>
              )}
            </p>
          </div>

          {isHost && <span className="watch-room__host-badge">HOST</span>}
        </div>
      )}

      {!hasEntered ? (
        /* ── Seat picker: the screen stays hidden until a seat is chosen ── */
        <div
          ref={pickerRef}
          className={`watch-room__picker container ${flight ? "watch-room__picker--diving" : ""}`}
          style={flight ? { "--flight-dur": `${FLIGHT_MS}ms` } : undefined}
        >
          <div className="watch-room__picker-intro">
            <h3>Choose your seat</h3>
            <p>
              Grab any green seat to claim it — the screen unlocks once you're
              seated.
            </p>
          </div>

          <TheatreSeats
            sections={seatSections}
            selectedSeatId={selectedSeatId}
            onSelectSeat={setSelectedSeatId}
            locked={false}
            currentUserId={currentUser?.id}
            hostUserId={room?.hostId}
          />

          <div className="watch-room__picker-bar">
            <span className="watch-room__picker-status mono">
              {selectedSeatId
                ? `Seat ${selectedSeatId} selected`
                : "No seat selected yet"}
            </span>
            <button
              type="button"
              className="watch-room__picker-cta"
              disabled={!selectedSeatId || Boolean(flight)}
              onClick={handleEnterTheatre}
            >
              Take Your Seat & Watch
            </button>
          </div>
        </div>
      ) : (
        /* ── Theatre screen with a slide-out chat drawer ── */
        <div className="watch-room__body">
          {/* Left column: screen on top, seats below */}
          <div className="watch-room__left">
            <InsideView isFullScreen={isFullScreen}>
              <ScreenPlayer
                room={room}
                isHost={isHost}
                isPlaying={isPlaying}
                isFullScreen={isFullScreen}
                animateEntrance={animateEntry}
                sharedScreenStream={sharedScreenStream}
                sharedSurface={sharedSurface}
                isShowEnded={room?.status === "ended"}
                syncState={syncState}
                onHostAction={handleHostPlaybackAction}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onToggleFullScreen={() => setIsFullScreen((p) => !p)}
                localVideo={localVideo}
                // The room's own video is what every seated viewer sees; a host
                // preview loaded in-room only overrides it on the host's screen.
                youtubeVideoId={
                  localVideo?.kind === "youtube"
                    ? localVideo.videoId
                    : room.youtubeVideoId
                }
              />
            </InsideView>

            {/* Select an occupied seat to start a one-to-one conversation. */}
            <TheatreSeats
              sections={seatSections}
              isFullScreen={isFullScreen}
              selectedSeatId={selectedSeatId}
              locked
              onStartTalk={setTalkSeat}
              currentUserId={currentUser?.id}
              hostUserId={room?.hostId}
            />

            {/* Host controls panel — below seats, host only, hidden when fullscreen */}
            {isHost && !isFullScreen && room.status !== "ended" && (
              <HostControls
                room={room}
                users={users}
                isScreenSharing={Boolean(sharedScreenStream)}
                screenShareError={webrtcError}
                onToggleScreenShare={toggleScreenShare}
                onShareBrowserTab={() => startShare({ preferTab: true })}
                onSetContent={handleSetContent}
                onClearContent={handleClearContent}
                activeContent={localVideo}
                mediaError={mediaError}
                isEndingShow={isEndingShow}
                endShowError={endShowError}
                onEndShow={handleEndShow}
              />
            )}
          </div>

          <button
            type="button"
            className={`watch-room__chat-toggle ${isChatOpen ? "watch-room__chat-toggle--open" : ""}`}
            onClick={() => setIsChatOpen((open) => !open)}
            aria-controls="room-chat"
            aria-expanded={isChatOpen}
          >
            <span>Chat</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Chat stays out of the way until the drawer control is opened. */}
          <ChatPanel
            id="room-chat"
            messages={messages}
            onSend={handleSend}
            users={users}
            // Who's actually connected right now, straight from the realtime
            // service — not how many seats happen to be booked.
            viewerCount={participantCount}
            isFullScreen={isFullScreen}
            isOpen={isChatOpen}
            isHost={isHost}
            // Poll state is owned here, next to the socket; the panel renders it
            // and sends actions back through these.
            polls={polls}
            activePoll={activePoll}
            myVotes={myVotes}
            pollError={pollError}
            pollPending={pollPending}
            onCreatePoll={handleCreatePoll}
            onVote={handleVotePoll}
            onClosePoll={handleClosePoll}
            onDismissPollError={() => setPollError("")}
          />

          {talkSeat && (
            <PrivateTalk
              seat={talkSeat}
              currentUser={currentUser}
              users={users}
              onClose={() => setTalkSeat(null)}
            />
          )}
        </div>
      )}

      {/* Camera lifts off the claimed seat and lands on the screen; the room
          behind it is already assembled by the time the shot dissolves. */}
      {flight && (
        <TheaterFlythrough
          origin={flight}
          seatNumber={flight.seatNumber}
          duration={FLIGHT_MS}
          onComplete={() => landInTheatre(claimRef.current)}
        />
      )}
    </div>
  );
}

function getYouTubeVideoId(value) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^www\./, "");
    const videoId =
      hostname === "youtu.be"
        ? url.pathname.slice(1).split("/")[0]
        : hostname.endsWith("youtube.com")
          ? url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
          : null;
    return /^[\w-]{11}$/.test(videoId || "") ? videoId : null;
  } catch {
    return null;
  }
}
