import { useState } from 'react';
import Button from './Button';
import './styles/HostControls.css';

export default function HostControls({
  room,
  users = [],
  isScreenSharing = false,
  screenShareError = '',
  onToggleScreenShare,
  onShareBrowserTab,
  onPlayYouTube,
  isUpdatingMedia = false,
  mediaError = '',
  youtubeVideoId = '',
  isEndingShow = false,
  endShowError = '',
  onEndShow,
}) {
  const [tab, setTab] = useState('queue');
  const [youtubeUrl, setYoutubeUrl] = useState(youtubeVideoId ? `https://youtu.be/${youtubeVideoId}` : '');
  const viewers = users.filter((user) => user.id !== room.hostId).slice(0, 4);

  return (
    <div className="host-controls">
      <div className="host-controls__header">
        <span className="host-controls__badge">HOST</span>
        <h3>Room Controls</h3>
        <Button
          variant={isScreenSharing ? 'danger' : 'secondary'}
          size="sm"
          onClick={onToggleScreenShare}
        >
          {isScreenSharing ? 'Stop sharing' : 'Share screen'}
        </Button>
      </div>

      {screenShareError ? <p className="host-controls__error" role="alert">{screenShareError}</p> : null}

      <div className="host-controls__tabs">
        {[
          // { key: 'queue', label: 'Up Next' },
          { key: 'viewers', label: 'Viewers' },
          { key: 'settings', label: 'Settings' },
        ].map((t) => (
          <button
            key={t.key}
            className={`host-tab ${tab === t.key ? 'host-tab--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'queue' ? (
        <div className="host-panel">
          <div className="queue-item queue-item--current">
            <span className="queue-item__tag mono">NOW SHOWING</span>
            <strong>{room.title}</strong>
          </div>
          <div className="queue-item">
            <span className="queue-item__tag mono">UP NEXT</span>
            <strong>Bonus: Behind the Scenes Reel</strong>
          </div>
          <Button variant="ghost" size="sm" fullWidth>+ Add to Queue</Button>
        </div>
      ) : null}

      {tab === 'viewers' ? (
        <div className="host-panel">
          {viewers.map((v) => (
            <div key={v.id} className="viewer-row">
              <span className="viewer-row__avatar" style={{ background: v.avatarColor }}>
                {v.name.charAt(0)}
              </span>
              <span className="viewer-row__name">{v.name}</span>
              <button className="viewer-row__action" title="Mute in chat">Mute</button>
              <button className="viewer-row__action viewer-row__action--danger" title="Remove from room">Remove</button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="host-panel host-panel--settings">
          <form className="host-youtube" onSubmit={(event) => {
            event.preventDefault();
            onPlayYouTube?.(youtubeUrl);
          }}>
            <div>
              <strong>Play a YouTube video</strong>
              <p>Paste a YouTube link to show it on the theatre screen.</p>
            </div>
            <div className="host-youtube__controls">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://youtu.be/..."
                aria-label="YouTube video URL"
              />
              <Button type="submit" variant="secondary" size="sm" loading={isUpdatingMedia}>
                Play video
              </Button>
            </div>
            {mediaError ? <p className="host-controls__error host-controls__error--inline" role="alert">{mediaError}</p> : null}
          </form>
          <div className="host-share-tab">
            <div>
              <strong>Share a browser tab</strong>
              <p>Pick one tab in your browser’s sharing prompt.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onShareBrowserTab} disabled={isScreenSharing}>
              Share tab
            </Button>
          </div>
          <label className="host-toggle">
            <span>Allow chat</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="host-toggle">
            <span>Allow reactions</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="host-toggle">
            <span>Lock room (no new joins)</span>
            <input type="checkbox" />
          </label>
          {endShowError ? <p className="host-controls__error" role="alert">{endShowError}</p> : null}
          <Button variant="danger" size="sm" fullWidth loading={isEndingShow} onClick={onEndShow}>
            End Showing for Everyone
          </Button>
        </div>
      ) : null}
    </div>
  );
}
