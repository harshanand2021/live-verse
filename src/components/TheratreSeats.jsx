import { useState } from 'react';
import './styles/TheratreSeats.css';

// Decide a seat's visual status from backend fields + current user context.
function seatStatus(seat, selectedSeatNumber, currentUserId, hostUserId) {
  if (seat.seatNumber === selectedSeatNumber) return 'you';
  if (seat.isBooked) {
    if (seat.bookedByUserId && hostUserId && seat.bookedByUserId === hostUserId) return 'host';
    return 'occupied';
  }
  return 'available';
}

const STATUS = {
  available: { cls: 'seat--available', label: 'Available' },
  occupied:  { cls: 'seat--occupied',  label: 'Occupied'  },
  you:       { cls: 'seat--you',       label: 'You'       },
  host:      { cls: 'seat--host',      label: 'Host'      },
};

function Seat({ seat, status, isClickable, onClick, onHover, isHovered }) {
  const cfg = STATUS[status] || STATUS.available;
  const label = `Seat ${seat.seatNumber}`;
  const padded = String(seat.seatNumber).padStart(2, '0');

  return (
    <button
      type="button"
      className={`seat ${cfg.cls} ${isHovered ? 'seat--hovered' : ''}`}
      // Lets the room find this seat's position on screen so the fly-through
      // into the theatre can launch from exactly where you're sitting.
      data-seat-number={seat.seatNumber}
      disabled={!isClickable}
      aria-pressed={status === 'you'}
      aria-label={`${label}, ${seat.bookedByName ? seat.bookedByName + ', ' : ''}${cfg.label}`}
      title={seat.bookedByName ? `Seat ${seat.seatNumber} — ${seat.bookedByName}` : `Seat ${seat.seatNumber}`}
      onClick={() => isClickable && onClick()}
      onMouseEnter={() => onHover({ seatNumber: seat.seatNumber, seat, status })}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover({ seatNumber: seat.seatNumber, seat, status })}
      onBlur={() => onHover(null)}
    >
      <span className="seat__num">{padded}</span>
    </button>
  );
}

function Legend({ hovered, seats, selectedSeatNumber }) {
  const items = [
    { cls: 'seat--host',      label: 'Host'      },
    { cls: 'seat--you',       label: 'You'       },
    { cls: 'seat--available', label: 'Available' },
    { cls: 'seat--occupied',  label: 'Occupied'  },
  ];

  const bookedCount = seats.filter((s) => s.isBooked).length + (selectedSeatNumber ? 1 : 0);
  const freeCount = seats.filter((s) => !s.isBooked).length - (selectedSeatNumber ? 1 : 0);

  return (
    <aside className="ts-legend">
      <div className="ts-legend__block">
        <h4 className="ts-legend__title">Seat Legend</h4>
        <div className="ts-legend__items">
          {items.map((item) => (
            <div key={item.label} className="ts-legend__item">
              <span className={`ts-legend__swatch seat ${item.cls}`} aria-hidden="true">
                <span className="seat__num">01</span>
              </span>
              <span className="ts-legend__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ts-legend__block">
        <h4 className="ts-legend__title">Occupancy</h4>
        <div className="ts-legend__stats">
          <div className="ts-legend__stat">
            <span className="ts-legend__stat-val" style={{ color: 'var(--marquee)' }}>{bookedCount}</span>
            <span className="ts-legend__stat-key">Watching</span>
          </div>
          <div className="ts-legend__stat">
            <span className="ts-legend__stat-val" style={{ color: 'var(--success)' }}>{freeCount}</span>
            <span className="ts-legend__stat-key">Free seats</span>
          </div>
        </div>
      </div>

      <div className={`ts-legend__hover ${hovered ? 'ts-legend__hover--visible' : ''}`}>
        {hovered ? (
          <>
            <span className="ts-legend__hover-id mono">Seat {hovered.seatNumber}</span>
            <span className="ts-legend__hover-name">
              {hovered.seat.bookedByName || STATUS[hovered.status]?.label || 'Seat'}
            </span>
          </>
        ) : null}
      </div>

      <p className="ts-legend__hint mono">
        {selectedSeatNumber ? 'Tap your seat again to change it' : 'Tap a green seat to sit there'}
      </p>
    </aside>
  );
}

export default function TheatreSeats({
  sections = [],           // now a FLAT array of seats, kept name for drop-in compatibility
  isFullScreen,
  selectedSeatId = null,   // now holds a seat NUMBER
  onSelectSeat = () => {},
  onStartTalk,             // kept for API compatibility; private talk disabled in flat mode
  locked = false,
  currentUserId = null,
  hostUserId = null,
}) {
  const [hovered, setHovered] = useState(null);

  if (isFullScreen) return null;

  const seats = Array.isArray(sections) ? sections : [];
  const selectedSeatNumber = selectedSeatId;

  return (
    <section className="theatre-seats" aria-label="Virtual theatre seating">
      <div className="ts-screen-arch" aria-hidden="true">
        <div className="ts-screen-arch__curtain ts-screen-arch__curtain--left" />
        <div className="ts-screen-arch__curtain ts-screen-arch__curtain--right" />
        <div className="ts-screen-arch__frame">
          <div className="ts-screen-arch__glow" />
          <span className="ts-screen-arch__label mono">
            {locked ? '— SCREEN THIS WAY —' : '— PICK YOUR SEAT TO REVEAL THE SCREEN —'}
          </span>
        </div>
      </div>

      <div className="ts-main">
        <div className="ts-floor">
          <div className="ts-flat-grid">
            {seats.map((seat) => {
              const status = seatStatus(seat, selectedSeatNumber, currentUserId, hostUserId);
              const isSelected = status === 'you';
              const isClickable = !locked && (!seat.isBooked || isSelected);
              return (
                <Seat
                  key={seat.seatNumber}
                  seat={seat}
                  status={status}
                  isClickable={isClickable}
                  onClick={() => onSelectSeat(isSelected ? null : seat.seatNumber)}
                  onHover={setHovered}
                  isHovered={hovered?.seatNumber === seat.seatNumber}
                />
              );
            })}
          </div>
        </div>

        <Legend
          hovered={hovered}
          seats={seats}
          selectedSeatNumber={selectedSeatNumber}
        />
      </div>
    </section>
  );
}