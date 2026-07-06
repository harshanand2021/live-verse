import { useRef } from 'react';
import './styles/ScreenPlayer.css';

export default function ScreenPlayer({
  room,
  isHost,
  isPlaying,
  isFullScreen,
  onTogglePlay,
  onToggleFullScreen,
}) {
  const containerRef = useRef(null);

  // When fullscreen button clicked: use browser Fullscreen API if available,
  // and also notify parent to hide seats/chat for the CSS layout switch
  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
    onToggleFullScreen();
  };

  return (
    <div
      className={`screen-wrap ${isFullScreen ? 'screen-wrap--fullscreen' : ''}`}
      ref={containerRef}
    >
      {/* ── Top bar: room label + fullscreen button ── */}
      <div className="screen__topbar">
        <div className="screen__live-badge">
          <span className="screen__live-dot" aria-hidden="true" />
          <span className="mono">LIVE</span>
        </div>
        <span className="screen__room-title">{room.title}</span>
        <button
          type="button"
          className="screen__fullscreen-btn"
          onClick={handleFullScreen}
          aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
          title={isFullScreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullScreen ? (
            // Compress icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20"/>
              <polyline points="20 10 14 10 14 4"/>
              <line x1="10" y1="14" x2="3" y2="21"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
            </svg>
          ) : (
            // Expand icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Cinema screen body ── */}
      <div className="screen__body" style={{ '--poster': room.posterColor }}>
        <div className="screen__glow" aria-hidden="true" />

        {/* Curved cinema screen frame lines */}
        <div className="screen__frame" aria-hidden="true">
          <div className="screen__frame-line screen__frame-line--left" />
          <div className="screen__frame-line screen__frame-line--right" />
        </div>

        <div className="screen__content">
          {isPlaying ? (
            <div className="screen__playing">
              <div className="screen__playing-bars" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
              <p className="mono">NOW PLAYING</p>
            </div>
          ) : (
            <div className="screen__paused">
              <button
                type="button"
                className="screen__big-play"
                onClick={isHost ? onTogglePlay : undefined}
                disabled={!isHost}
                aria-label="Play"
                title={!isHost ? 'Only the host can control playback' : 'Play'}
              >
                ▶
              </button>
              <p className="screen__paused-label">
                {isHost ? 'Press play to start the show' : 'Waiting for the host…'}
              </p>
            </div>
          )}
        </div>

        {/* ── Playback controls bar ── */}
        <div className="screen__controls">
          <button
            type="button"
            className="screen__play-btn"
            onClick={onTogglePlay}
            disabled={!isHost}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={!isHost ? 'Only the host can control playback' : undefined}
          >
            {isPlaying ? (
              /* Pause bars */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="3" width="4" height="18" rx="1"/>
                <rect x="15" y="3" width="4" height="18" rx="1"/>
              </svg>
            ) : (
              /* Play triangle */
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>

          {/* Volume */}
          <button type="button" className="screen__ctrl-btn" aria-label="Volume" disabled={!isHost}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </button>

          {/* Progress bar */}
          <div className="screen__progress" aria-label="Playback progress">
            <div
              className="screen__progress-fill"
              style={{ width: isPlaying ? '34%' : '0%' }}
            />
          </div>

          <span className="screen__time mono">
            {isPlaying ? '34:12' : '00:00'} / 1:48:00
          </span>

          {!isHost && (
            <span className="screen__synced mono">⟳ SYNCED</span>
          )}

          {/* Settings */}
          <button type="button" className="screen__ctrl-btn" aria-label="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Fullscreen in controls too */}
          <button
            type="button"
            className="screen__ctrl-btn"
            onClick={handleFullScreen}
            aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullScreen ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}