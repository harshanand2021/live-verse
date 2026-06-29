import './styles/ScreenPlayer.css';

export default function ScreenPlayer({ room, isHost, isPlaying, onTogglePlay }) {
  return (
    <div className="screen-wrap">
      <div className="screen">
        <div className="screen__glow" style={{ '--poster': room.posterColor }} aria-hidden="true" />
        <div className="screen__content">
          {isPlaying ? (
            <div className="screen__playing">
              <span className="screen__playing-bars" aria-hidden="true">
                <span /><span /><span /><span />
              </span>
              <p className="mono">NOW PLAYING — {room.title}</p>
            </div>
          ) : (
            <div className="screen__paused">
              <span className="screen__paused-icon" aria-hidden="true">▶</span>
              <p>{isHost ? 'Press play to start the show' : 'Waiting for the host to start the show'}</p>
            </div>
          )}
        </div>

        <div className="screen__controls">
          <button
            type="button"
            className="screen__play-btn"
            onClick={onTogglePlay}
            disabled={!isHost}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={!isHost ? 'Only the host can control playback' : undefined}
          >
            {isPlaying ? '❙❙' : '▶'}
          </button>
          <div className="screen__progress" aria-hidden="true">
            <div className="screen__progress-fill" style={{ width: isPlaying ? '34%' : '0%' }} />
          </div>
          <span className="screen__time mono">{isPlaying ? '34:12 / 1:48:00' : '00:00 / 1:48:00'}</span>
          {!isHost ? <span className="screen__synced mono">SYNCED TO HOST</span> : null}
        </div>
      </div>
    </div>
  );
}