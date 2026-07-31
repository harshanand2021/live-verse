import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getCurrentUser } from "../api/userApi";
import {
  claimSeat,
  endLive,
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

// Stable avatar color derived from a user id, so the same person always
// gets the same color in the viewers list.
const AVATAR_COLORS = ["#FF5A3C", "#7C6BFF", "#4ADE80", "#FFD166", "#06D6A0", "#EF476F"];
function colorForId(id) {
  const n = parseInt(id, 10) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

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
  const [sharedScreenStream, setSharedScreenStream] = useState(null);
  const [sharedSurface, setSharedSurface] = useState("");
  const [screenShareError, setScreenShareError] = useState("");
  const [isEndingShow, setIsEndingShow] = useState(false);
  const [endShowError, setEndShowError] = useState("");
  const [isUpdatingMedia, setIsUpdatingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [showFlythrough, setShowFlythrough] = useState(false);

  // Hosts step straight onto their reserved seat; everyone else has to pick
  // one before the screen is revealed — no seat, no show.
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [hasEntered, setHasEntered] = useState(false);

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

  const isHost = String(room?.hostId) === String(currentUser?.id);

  const stopScreenShare = useCallback(() => {
    setSharedScreenStream((stream) => {
      stream?.getTracks().forEach((track) => track.stop());
      return null;
    });
    setSharedSurface("");
  }, []);

  useEffect(
    () => () => {
      sharedScreenStream?.getTracks().forEach((track) => track.stop());
    },
    [sharedScreenStream],
  );

  const startScreenShare = async ({ preferTab = false } = {}) => {
    if (!isHost) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenShareError("Screen sharing is not supported by this browser.");
      return;
    }

    try {
      setScreenShareError("");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: preferTab,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
      });
      const videoTrack = stream.getVideoTracks()[0];
      setSharedSurface(videoTrack?.getSettings?.().displaySurface || "");
      videoTrack?.addEventListener("ended", () => {
        setSharedScreenStream((activeStream) =>
          activeStream === stream ? null : activeStream,
        );
        setSharedSurface("");
      });
      setSharedScreenStream(stream);
    } catch (error) {
      if (error.name !== "NotAllowedError") {
        setScreenShareError("Unable to start screen sharing. Please try again.");
      }
    }
  };

  const toggleScreenShare = () => {
    if (sharedScreenStream) {
      stopScreenShare();
      return;
    }
    startScreenShare();
  };

  const handleEndShow = async () => {
    if (!isHost || isEndingShow) return;
    if (!window.confirm("End this showing for everyone? This cannot be undone."))
      return;

    setEndShowError("");
    setIsEndingShow(true);
    try {
      const endedRoom = await endLive(room.id);
      setRoom(endedRoom);
      stopScreenShare();
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
              handle: isMe ? currentUser?.handle || `@user${uid}` : `@user${uid}`,
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
              (payload.messageId != null && m.messageId === payload.messageId) ||
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
      }
    },
    [applyActivity],
  );

  const { connected, sendChat } = useRoomSocket({
    roomId: room?.id,
    userId: currentUser?.id,
    onEvent: handleSocketEvent,
  });

  const handlePlayYouTube = async (youtubeUrl) => {
    if (!isHost || isUpdatingMedia) return;
    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setMediaError("Enter a valid YouTube video URL.");
      return;
    }

    setMediaError("");
    setIsUpdatingMedia(true);
    try {
      const updatedRoom = await setLiveMedia(room.id, {
        youtubeVideoId: videoId,
      });
      setRoom(updatedRoom);
      stopScreenShare();
      setIsPlaying(true);
    } catch (error) {
      setMediaError(
        error.response?.data?.message || "Unable to load this YouTube video.",
      );
    } finally {
      setIsUpdatingMedia(false);
    }
  };

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

  const handleEnterTheatre = async () => {
    if (!selectedSeatId) return;
    try {
      await claimSeat(room.id, selectedSeatId);
      const updatedSeats = await getLiveSeats(room.id);

      setSeatSections(updatedSeats);
      setAnimateEntry(true);
      setHasEntered(true);
    } catch (error) {
      setLoadError(error.response?.data?.message || "Unable to claim that seat.");
    }
  };

  const handleSend = (text) => {
    // Send over WebSocket only. Quarkus persists it and broadcasts it back to
    // everyone (including us), and handleSocketEvent appends it when the echo
    // arrives. Do NOT post via REST or append locally — that causes duplicates.
    const sent = sendChat(text);
    if (!sent) {
      console.warn("Chat socket not connected; message not sent.");
    }
  };

  return (
    <div className={`watch-room ${isFullScreen ? "watch-room--fullscreen" : ""}`}>
      {/* ── Top bar (hidden in fullscreen) ── */}
      {!isFullScreen && (
        <div className="watch-room__topbar container">
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
        <div className="watch-room__picker container">
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
              disabled={!selectedSeatId}
              onClick={handleEnterTheatre}
            >
              Take Your Seat & Watch
            </button>
          </div>
        </div>
      ) : (
        /* ── Theatre screen with a slide-out chat drawer ── */
        <div className="watch-room__body">
          {showFlythrough && (
            <TheaterFlythrough
              onComplete={() => {
                setShowFlythrough(false);
                setHasEntered(true);
              }}
            />
          )}

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
                youtubeVideoId={room.youtubeVideoId}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onToggleFullScreen={() => setIsFullScreen((p) => !p)}
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
                screenShareError={screenShareError}
                onToggleScreenShare={toggleScreenShare}
                onShareBrowserTab={() => startScreenShare({ preferTab: true })}
                onPlayYouTube={handlePlayYouTube}
                isUpdatingMedia={isUpdatingMedia}
                mediaError={mediaError}
                youtubeVideoId={room.youtubeVideoId}
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
            viewerCount={users.length}
            totalSeats={seatSections.filter((seat) => seat.isBooked).length}
            isFullScreen={isFullScreen}
            isOpen={isChatOpen}
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