import { Link } from 'react-router-dom';
import { ROOM_STATUS, ROOM_VISIBILITY, CONTENT_TYPES } from '../data/mockData';
import './styles/Roomcard.css';

const CONTENT_LABEL = {
  [CONTENT_TYPES.MOVIE]: 'Film',
  [CONTENT_TYPES.SERIES]: 'Series',
  [CONTENT_TYPES.SPORTS]: 'SPORTS',
};

export default function RoomCard({ room }) {
  const isLive = room.status === ROOM_STATUS.LIVE;
  const isPrivate = room.visibility === ROOM_VISIBILITY.PRIVATE;

  return (
    <Link to={`/room/${room.id}`} className="ticket" style={{ '--poster': room.posterColor }}>
      <div className="ticket__main">
        <div className="ticket__top-row">
          <span className="ticket__content-type mono">{CONTENT_LABEL[room.contentType]}</span>
          {isLive ? (
            <span className="ticket__live">
              <span className="ticket__live-dot" aria-hidden="true" />
              LIVE
            </span>
          ) : (
            <span className="ticket__scheduled mono">UPCOMING</span>
          )}
        </div>

        <h3 className="ticket__title">{room.title}</h3>
        <p className="ticket__desc">{room.description}</p>

        <div className="ticket__meta">
          <span className="ticket__host">Hosted by {room.hostName}</span>
          <span className="ticket__time mono">{room.startedAt}</span>
        </div>
      </div>

      <div className="ticket__perforation" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="ticket__notch" />
        ))}
      </div>

      <div className="ticket__stub">
        <span className={`ticket__visibility ${isPrivate ? 'ticket__visibility--private' : ''}`}>
          {isPrivate ? '🔒 Private' : '🌐 Public'}
        </span>
        {isLive ? (
          <span className="ticket__viewers mono">{room.viewerCount.toLocaleString()} watching</span>
        ) : (
          <span className="ticket__viewers mono">{room.code ? 'Invite only' : 'Open soon'}</span>
        )}
        <span className="ticket__admit mono">ADMIT ONE →</span>
      </div>
    </Link>
  );
}