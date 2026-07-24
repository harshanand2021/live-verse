import { useLocation, Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { CONTENT_TYPES, ROOM_VISIBILITY } from '../data/mockData';
import './styles/HostReady.css';

const CONTENT_LABEL = {
  [CONTENT_TYPES.MOVIE]: 'Movie',
  [CONTENT_TYPES.SERIES]: 'Web Series',
  [CONTENT_TYPES.SPORTS]: 'Sports',
};

export default function HostReady() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // If someone lands here directly without state (e.g. page refresh), send them back to create.
  if (!state) {
    return (
      <div className="host-ready-page">
        <div className="container container--narrow host-ready__empty">
          <h2>No room to show yet</h2>
          <p>Let's set one up first.</p>
          <Button onClick={() => navigate('/host/new')}>Host a Room</Button>
        </div>
      </div>
    );
  }

  const { title, description, contentType, visibility, code, scheduleNow } = state;
  const isPrivate = visibility === ROOM_VISIBILITY.PRIVATE;

  return (
    <div className="host-ready-page">
      <div className="container container--narrow">
        <div className="host-ready-card">
          <span className="host-ready__stamp mono">{scheduleNow ? 'ROOM IS LIVE' : 'ROOM SCHEDULED'}</span>
          <h1 className="host-ready__title">{title}</h1>
          {description ? <p className="host-ready__desc">{description}</p> : null}

          <div className="host-ready__meta">
            <span>{CONTENT_LABEL[contentType]}</span>
            <span>•</span>
            <span>{isPrivate ? '🔒 Private' : '🌐 Public'}</span>
          </div>

          {isPrivate && code ? (
            <div className="host-ready__code">
              <span>Share this invite code with your guests</span>
              <strong className="mono">{code}</strong>
            </div>
          ) : (
            <div className="host-ready__code host-ready__code--public">
              <span>This room is live on the Marquee Board for anyone to join.</span>
            </div>
          )}

          <div className="host-ready__actions">
            <Button size="lg" onClick={() => navigate('/room/r-104')}>
              {scheduleNow ? 'Enter Room as Host' : 'Go to Room'}
            </Button>
            <Link to="/rooms">
              <Button variant="ghost" size="lg">Back to Marquee Board</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}