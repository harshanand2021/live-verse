import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockRooms, mockChatMessages, currentUser } from '../data/mockData';

import ScreenPlayer   from '../components/ScreenPlayer';
import TheatreSeats  from '../components/TheratreSeats';
import ChatPanel      from '../components/ChatPanel';
import HostControls   from '../components/HostControls';
import InsideView     from '../components/InsideView';
import PrivateTalk    from '../components/PrivateTalk';

import './styles/WatchRoom.css';

export default function WatchRoom() {
  const { roomId } = useParams();
  const room = useMemo(
    () => mockRooms.find(r => r.id === roomId) || mockRooms[0],
    [roomId]
  );

  const isHost      = room.hostId === currentUser.id;
  const [isPlaying,     setIsPlaying]     = useState(true);
  const [isFullScreen,  setIsFullScreen]  = useState(false);
  const [isChatOpen,    setIsChatOpen]    = useState(false);
  const [talkSeat,      setTalkSeat]      = useState(null);
  const [animateEntry,  setAnimateEntry]  = useState(false);
  const [messages,      setMessages]      = useState(mockChatMessages);

  // Hosts step straight onto their reserved seat; everyone else has to pick
  // one before the screen is revealed — no seat, no show.
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [hasEntered,     setHasEntered]     = useState(isHost);

  const handleEnterTheatre = () => {
    if (!selectedSeatId) return;
    setAnimateEntry(true);
    setHasEntered(true);
  };

  const handleSend = text => {
    setMessages(prev => [
      ...prev,
      {
        id:     `m-${Date.now()}`,
        userId: currentUser.id,
        text,
        time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className={`watch-room ${isFullScreen ? 'watch-room--fullscreen' : ''}`}>

      {/* ── Top bar (hidden in fullscreen) ── */}
      {!isFullScreen && (
        <div className="watch-room__topbar container">
          <Link to="/rooms" className="watch-room__back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
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
            <p>Grab any green seat to claim it — the screen unlocks once you're seated.</p>
          </div>

          <TheatreSeats
            selectedSeatId={selectedSeatId}
            onSelectSeat={setSelectedSeatId}
            locked={false}
          />

          <div className="watch-room__picker-bar">
            <span className="watch-room__picker-status mono">
              {selectedSeatId ? `Seat ${selectedSeatId} selected` : 'No seat selected yet'}
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

          {/* Left column: screen on top, seats below */}
          <div className="watch-room__left">
            <InsideView isFullScreen={isFullScreen}>
              <ScreenPlayer
                room={room}
                isHost={isHost}
                isPlaying={isPlaying}
                isFullScreen={isFullScreen}
                animateEntrance={animateEntry}
                onTogglePlay={() => setIsPlaying(p => !p)}
                onToggleFullScreen={() => setIsFullScreen(p => !p)}
              />
            </InsideView>

            {/* Select an occupied seat to start a one-to-one conversation. */}
            <TheatreSeats
              isFullScreen={isFullScreen}
              selectedSeatId={selectedSeatId}
              locked
              onStartTalk={setTalkSeat}
            />

            {/* Host controls panel — below seats, host only, hidden when fullscreen */}
            {isHost && !isFullScreen && (
              <HostControls room={room} />
            )}
          </div>

          <button
            type="button"
            className={`watch-room__chat-toggle ${isChatOpen ? 'watch-room__chat-toggle--open' : ''}`}
            onClick={() => setIsChatOpen(open => !open)}
            aria-controls="room-chat"
            aria-expanded={isChatOpen}
          >
            <span>Chat</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Chat stays out of the way until the drawer control is opened. */}
          <ChatPanel
            id="room-chat"
            messages={messages}
            onSend={handleSend}
            viewerCount={room.viewerCount || 1}
            isFullScreen={isFullScreen}
            isOpen={isChatOpen}
          />

          {talkSeat && (
            <PrivateTalk seat={talkSeat} onClose={() => setTalkSeat(null)} />
          )}
        </div>
      )}
    </div>
  );
}
