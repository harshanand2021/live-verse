import { useState } from "react";
import Button from "./Button";
import "./styles/HostControls.css";

export default function HostControls({
  room,
  users,
  isScreenSharing,
  screenShareError,
  onToggleScreenShare,
  onShareBrowserTab,
  onSetContent,
  onClearContent,
  activeContent,
  mediaError,
  isEndingShow,
  endShowError,
  onEndShow,
}) {
  const [tab, setTab] = useState("queue");
  const viewers = users.filter((user) => user.id !== room.hostId).slice(0, 4);
  const [ytInput, setYtInput] = useState("");
  const [directInput, setDirectInput] = useState("");

  return (
    <div className="host-controls">
      <div className="host-media">
        <h4 className="host-media__title">What are we watching?</h4>

        {activeContent ? (
          <div className="host-media__active">
            <span className="host-media__active-label mono">
              {activeContent.kind === "youtube" ? "YOUTUBE" : "DIRECT VIDEO"}{" "}
              LOADED
            </span>
            <span className="host-media__active-url">{activeContent.url}</span>
            <button
              type="button"
              className="host-media__clear"
              onClick={onClearContent}
            >
              Clear
            </button>
          </div>
        ) : null}

        <label className="host-media__field">
          <span>YouTube URL</span>
          <div className="host-media__row">
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                onSetContent(ytInput, "youtube");
                setYtInput("");
              }}
            >
              Load
            </button>
          </div>
        </label>

        <label className="host-media__field">
          <span>
            Video / Stream URL <em className="mono">(.mp4, .webm, .m3u8)</em>
          </span>
          <div className="host-media__row">
            <input
              type="url"
              placeholder="https://example.com/video.mp4"
              value={directInput}
              onChange={(e) => setDirectInput(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                onSetContent(directInput, "direct");
                setDirectInput("");
              }}
            >
              Load
            </button>
          </div>
        </label>

        {mediaError ? (
          <p className="host-media__error mono">{mediaError}</p>
        ) : null}
      </div>

      <div className="host-controls__header">
        <span className="host-controls__badge">HOST</span>
        <h3>Room Controls</h3>
        <Button
          variant={isScreenSharing ? "danger" : "secondary"}
          size="sm"
          onClick={onToggleScreenShare}
        >
          {isScreenSharing ? "Stop sharing" : "Share screen"}
        </Button>
      </div>

      {screenShareError ? (
        <p className="host-controls__error" role="alert">
          {screenShareError}
        </p>
      ) : null}

      <div className="host-controls__tabs">
        {[
          // { key: 'queue', label: 'Up Next' },
          { key: "viewers", label: "Viewers" },
          { key: "settings", label: "Settings" },
        ].map((t) => (
          <button
            key={t.key}
            className={`host-tab ${tab === t.key ? "host-tab--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "queue" ? (
        <div className="host-panel">
          <div className="queue-item queue-item--current">
            <span className="queue-item__tag mono">NOW SHOWING</span>
            <strong>{room.title}</strong>
          </div>
          <div className="queue-item">
            <span className="queue-item__tag mono">UP NEXT</span>
            <strong>Bonus: Behind the Scenes Reel</strong>
          </div>
          <Button variant="ghost" size="sm" fullWidth>
            + Add to Queue
          </Button>
        </div>
      ) : null}

      {tab === "viewers" ? (
        <div className="host-panel">
          {viewers.map((v) => (
            <div key={v.id} className="viewer-row">
              <span
                className="viewer-row__avatar"
                style={{ background: v.avatarColor }}
              >
                {v.name.charAt(0)}
              </span>
              <span className="viewer-row__name">{v.name}</span>
              <button className="viewer-row__action" title="Mute in chat">
                Mute
              </button>
              <button
                className="viewer-row__action viewer-row__action--danger"
                title="Remove from room"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="host-panel host-panel--settings">
          <div className="host-share-tab">
            <div>
              <strong>Share a browser tab</strong>
              <p>Pick one tab in your browser’s sharing prompt.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShareBrowserTab}
              disabled={isScreenSharing}
            >
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
          {endShowError ? (
            <p className="host-controls__error" role="alert">
              {endShowError}
            </p>
          ) : null}
          <Button
            variant="danger"
            size="sm"
            fullWidth
            loading={isEndingShow}
            onClick={onEndShow}
          >
            End Showing for Everyone
          </Button>
        </div>
      ) : null}
    </div>
  );
}