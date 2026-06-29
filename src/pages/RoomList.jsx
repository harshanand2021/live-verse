import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import RoomCard from '../components/RoomCard';
import Button from '../components/Button';
import { mockRooms } from '../data/mockData';
import './styles/RoomList.css';

const FILTERS = [
  { key: 'all', label: 'All Rooms' },
  { key: 'public', label: 'Public' },
  { key: 'private', label: 'Private' },
  { key: 'live', label: 'Live Now' },
];

export default function RoomList() {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const filteredRooms = useMemo(() => {
    return mockRooms.filter((room) => {
      if (filter === 'public' && room.visibility !== 'public') return false;
      if (filter === 'private' && room.visibility !== 'private') return false;
      if (filter === 'live' && room.status !== 'live') return false;
      if (query && !room.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  return (
    <div className="room-list-page">
      <div className="container">
        <section className="marquee-hero">
          <p className="marquee-hero__eyebrow mono">TONIGHT'S SHOWINGS</p>
          <h1 className="marquee-hero__title">The Marquee Board</h1>
          <p className="marquee-hero__sub">
            Pick a room, grab a seat, and watch together. Public rooms are open to everyone —
            private ones need an invite code from the host.
          </p>

          <div className="marquee-hero__actions">
            <Link to="/host/new">
              <Button size="lg">Host a Room</Button>
            </Link>
            <div className="join-code-box">
              <input
                type="text"
                placeholder="Have an invite code? e.g. MOON-42"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="mono"
              />
              <Button variant="ghost" size="lg">Join with Code</Button>
            </div>
          </div>
        </section>

        <section className="room-controls">
          <div className="room-filters" role="tablist" aria-label="Filter rooms">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                className={`room-filter ${filter === f.key ? 'room-filter--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="room-search"
            placeholder="Search showings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search rooms"
          />
        </section>

        {filteredRooms.length === 0 ? (
          <div className="empty-state">
            <h3>No showings match that</h3>
            <p>Try a different filter, or host your own room — the marquee's got room for one more.</p>
          </div>
        ) : (
          <section className="room-grid">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}