import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockRooms, mockChatMessages, currentUser } from '../data/mockData';

import ScreenPlayer   from '../components/ScreenPlayer';
import TheatreSeats  from '../components/TheratreSeats';
import ChatPanel      from '../components/ChatPanel';
import HostControls   from '../components/HostControls';

import './styles/WatchRoom.css';

export default function WatchRoom() {
  const { roomId } = useParams();
  const room = useMemo(
    () => mockRooms.find(r => r.id === roomId) || mockRooms[0],
    [roomId]
  );

  const isHost      = room.hostId === currentUser.id;
  const [isPlaying,    setIsPlaying]    = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages,     setMessages]     = useState(mockChatMessages);

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

      {/* ── Main layout: [screen + seats] | [chat] ── */}
      <div className={`watch-room__body ${isFullScreen ? '' : 'container'}`}>

        {/* Left column: screen on top, seats below */}
        <div className="watch-room__left">
          <ScreenPlayer
            room={room}
            isHost={isHost}
            isPlaying={isPlaying}
            isFullScreen={isFullScreen}
            onTogglePlay={() => setIsPlaying(p => !p)}
            onToggleFullScreen={() => setIsFullScreen(p => !p)}
          />

          {/* 50-seat virtual theatre — hidden when fullscreen */}
          <TheatreSeats isFullScreen={isFullScreen} />

          {/* Host controls panel — below seats, host only, hidden when fullscreen */}
          {isHost && !isFullScreen && (
            <HostControls room={room} />
          )}
        </div>

        {/* Right column: chat — always visible, floats in fullscreen */}
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          viewerCount={room.viewerCount || 1}
          isFullScreen={isFullScreen}
        />
      </div>
    </div>
  );
}