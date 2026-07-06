import { useState } from 'react';
import { SEAT_SECTIONS } from '../data/mockData';
import './styles/TheratreSeats.css';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  available: { cls: 'seat--available', label: 'Available'  },
  occupied:  { cls: 'seat--occupied',  label: 'Occupied'   },
  you:       { cls: 'seat--you',       label: 'You'        },
  host:      { cls: 'seat--host',      label: 'Host'       },
  sold:      { cls: 'seat--sold',      label: 'Sold'       },
};

// ─── Single seat button ───────────────────────────────────────────────────────
function Seat({ seat, rowLabel, onHover, isHovered }) {
  const cfg        = STATUS[seat.status] || STATUS.available;
  const isClickable = seat.status === 'available';
  const seatId     = `${rowLabel}${seat.num}`;

  return (
    <button
      type="button"
      className={`seat ${cfg.cls} ${isHovered ? 'seat--hovered' : ''}`}
      disabled={!isClickable}
      aria-label={`Seat ${seatId}, ${seat.name ? seat.name + ', ' : ''}${cfg.label}`}
      title={seat.name ? `${seatId} — ${seat.name}` : seatId}
      onMouseEnter={() => onHover({ seatId, seat, rowLabel })}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover({ seatId, seat, rowLabel })}
      onBlur={() => onHover(null)}
    >
      <span className="seat__num">{seat.num}</span>
    </button>
  );
}

// ─── One section block (e.g. PREMIUM ROW / PREMIER / CLASSIC) ────────────────
function Section({ section, onHover, hoveredId }) {
  return (
    <div className="ts-section">
      {/* Section tier header */}
      <div className="ts-section__header">
        <span className="ts-section__line" aria-hidden="true" />
        <div className="ts-section__label-wrap">
          <span className="ts-section__tier mono">{section.tier}</span>
          <span className="ts-section__sub">{section.tierSub}</span>
        </div>
        <span className="ts-section__line" aria-hidden="true" />
      </div>

      {/* Rows */}
      <div className="ts-rows">
        {section.rows.map(row => (
          <div key={row.rowLabel} className="ts-row">
            {/* Row letter label */}
            <span className="ts-row__label mono" aria-label={`Row ${row.rowLabel}`}>
              {row.rowLabel}
            </span>

            {/* Seats */}
            <div className="ts-row__seats">
              {row.seats.map(seat => {
                const seatId = `${row.rowLabel}${seat.num}`;
                return (
                  <Seat
                    key={seatId}
                    seat={seat}
                    rowLabel={row.rowLabel}
                    onHover={onHover}
                    isHovered={hoveredId === seatId}
                  />
                );
              })}
            </div>

            {/* Mirror label on right side */}
            <span className="ts-row__label ts-row__label--right mono" aria-hidden="true">
              {row.rowLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Legend panel ─────────────────────────────────────────────────────────────
function Legend({ hovered }) {
  const items = [
    { cls: 'seat--host',      label: 'Host'      },
    { cls: 'seat--you',       label: 'You'       },
    { cls: 'seat--available', label: 'Available' },
    { cls: 'seat--occupied',  label: 'Occupied'  },
    { cls: 'seat--sold',      label: 'Sold'      },
  ];

  const totalSeats    = SEAT_SECTIONS.flatMap(s => s.rows.flatMap(r => r.seats));
  const occupiedCount = totalSeats.filter(s => ['occupied','host','you'].includes(s.status)).length;
  const availCount    = totalSeats.filter(s => s.status === 'available').length;

  return (
    <aside className="ts-legend">
      <div className="ts-legend__block">
        <h4 className="ts-legend__title">Seat Legend</h4>
        <div className="ts-legend__items">
          {items.map(item => (
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
            <span className="ts-legend__stat-val" style={{ color: 'var(--marquee)' }}>{occupiedCount}</span>
            <span className="ts-legend__stat-key">Watching</span>
          </div>
          <div className="ts-legend__stat">
            <span className="ts-legend__stat-val" style={{ color: 'var(--success)' }}>{availCount}</span>
            <span className="ts-legend__stat-key">Free seats</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      <div className={`ts-legend__hover ${hovered ? 'ts-legend__hover--visible' : ''}`}>
        {hovered ? (
          <>
            <span className="ts-legend__hover-id mono">{hovered.seatId}</span>
            <span className="ts-legend__hover-name">
              {hovered.seat.name || STATUS[hovered.seat.status]?.label || 'Seat'}
            </span>
            <span className={`ts-legend__hover-status seat ${STATUS[hovered.seat.status]?.cls}`}>
              <span className="seat__num">•</span>
            </span>
          </>
        ) : null}
      </div>

      <p className="ts-legend__hint mono">Hover any seat to see details</p>
    </aside>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TheatreSeats({ isFullScreen }) {
  const [hovered, setHovered] = useState(null);

  if (isFullScreen) return null;

  return (
    <section className="theatre-seats" aria-label="Virtual theatre seating">

      {/* ── Cinema screen arch at the top ── */}
      <div className="ts-screen-arch" aria-hidden="true">
        <div className="ts-screen-arch__curtain ts-screen-arch__curtain--left"  />
        <div className="ts-screen-arch__curtain ts-screen-arch__curtain--right" />
        <div className="ts-screen-arch__frame">
          <div className="ts-screen-arch__glow" />
          <span className="ts-screen-arch__label mono">— SCREEN THIS WAY —</span>
        </div>
      </div>

      {/* ── Main area: seat sections + legend ── */}
      <div className="ts-main">

        {/* Seating floor (perspective container) */}
        <div className="ts-floor">
          {SEAT_SECTIONS.map(section => (
            <Section
              key={section.id}
              section={section}
              onHover={setHovered}
              hoveredId={hovered?.seatId}
            />
          ))}
        </div>

        {/* Right-side legend panel */}
        <Legend hovered={hovered} />
      </div>

    </section>
  );
}