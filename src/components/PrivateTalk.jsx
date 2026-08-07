import { useState } from 'react';
import './styles/PrivateTalk.css';

function getParticipant(seat, users) {
  const name = seat.name || `Viewer in seat ${seat.seatId}`;
  const firstName = name.replace(/\s*\(.*\)/, '').split(' ')[0].toLowerCase();
  const user = users.find(candidate => candidate.name.split(' ')[0].toLowerCase() === firstName);

  return user || {
    name,
    handle: `@seat-${seat.seatId.toLowerCase()}`,
    avatarColor: '#7C6BFF',
  };
}

function MicIcon({ muted }) {
  return muted ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m3 3 18 18" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.9-.78" /><path d="M19 10v2a7 7 0 0 1-12.17 4.73M12 19v3M8 22h8" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /></svg>
  );
}

function CameraIcon({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m3 3 18 18" /><path d="M10.7 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1.3M16 7.5 21 4v16l-4.35-3.05" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></svg>
  );
}

/** A local UI shell for a one-to-one conversation; connect it to signalling/WebRTC for live media. */
export default function PrivateTalk({ seat, onClose, currentUser, users = [] }) {
  const participant = getParticipant(seat, users);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  return (
    <div className="private-talk" role="dialog" aria-modal="true" aria-labelledby="private-talk-title">
      <div className="private-talk__backdrop" onClick={onClose} aria-hidden="true" />
      <section className="private-talk__window">
        <header className="private-talk__header">
          <div>
            <p className="private-talk__eyebrow mono">PRIVATE CONVERSATION · SEAT {seat.seatId}</p>
            <h2 id="private-talk-title">Talk with {participant.name}</h2>
          </div>
          <button type="button" className="private-talk__close" onClick={onClose} aria-label="Close private conversation">×</button>
        </header>

        <div className="private-talk__tiles">
          <article className="private-talk__tile private-talk__tile--remote" style={{ '--tile-color': participant.avatarColor }}>
            <span className="private-talk__avatar">{participant.name.charAt(0)}</span>
            <span className="private-talk__name">{participant.name}</span>
            <span className="private-talk__status">In private talk</span>
          </article>
          <article className={`private-talk__tile private-talk__tile--self ${isCameraOff ? 'private-talk__tile--camera-off' : ''}`} style={{ '--tile-color': currentUser.avatarColor }}>
            <span className="private-talk__avatar">{currentUser.name.charAt(0)}</span>
            <span className="private-talk__name">You</span>
            <span className="private-talk__status">{isCameraOff ? 'Camera off' : 'Preview'}</span>
          </article>
        </div>

        <footer className="private-talk__controls">
          <button type="button" className={`private-talk__control ${isMuted ? 'private-talk__control--off' : ''}`} onClick={() => setIsMuted(value => !value)} aria-pressed={isMuted}>
            <MicIcon muted={isMuted} />
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button type="button" className={`private-talk__control ${isCameraOff ? 'private-talk__control--off' : ''}`} onClick={() => setIsCameraOff(value => !value)} aria-pressed={isCameraOff}>
            <CameraIcon off={isCameraOff} />
            <span>{isCameraOff ? 'Camera on' : 'Camera off'}</span>
          </button>
          <button type="button" className="private-talk__end" onClick={onClose}>End talk</button>
        </footer>
      </section>
    </div>
  );
}
