import { useState } from 'react';
import { mockUsers } from '../data/mockData';
import Button from './Button';
import './styles/HostControls.css';

export default function HostControls({ room }) {
  const [tab, setTab] = useState('queue');
  const viewers = mockUsers.slice(1, 5);

  return (
    <div className="host-controls">
      <div className="host-controls__header">
        <span className="host-controls__badge">HOST</span>
        <h3>Room Controls</h3>
      </div>

      <div className="host-controls__tabs">
        {[
          { key: 'queue', label: 'Up Next' },
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
          <Button variant="danger" size="sm" fullWidth>End Showing for Everyone</Button>
        </div>
      ) : null}
    </div>
  );
}