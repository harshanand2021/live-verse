import { useEffect, useRef, useState } from 'react';
import './styles/TheaterFlythrough.css';

const ROWS = 7;           // depth planes of headrests the camera flies over
const SEATS_PER_ROW = 13;

// Dust caught in the projector beam. Built once at module scope so the specks
// keep the same positions across re-renders instead of twitching mid-flight.
const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 61) % 88}%`,
  delay: `${((i * 3) % 7) * 0.34}s`,
  scale: 0.45 + ((i * 13) % 10) / 12,
}));

/**
 * Cinematic "drone shot" hand-off between the seat picker and the theatre.
 *
 * The frame irises open out of the seat the viewer just claimed, the camera
 * lifts off it, banks over the rows of headrests, and settles onto the screen —
 * then calls onComplete so the real room can take the frame.
 *
 * `origin` is the seat's centre in viewport pixels; everything anchors to it,
 * which is what makes the shot read as leaving *that* seat rather than a
 * generic push-in. Every beat is a fraction of `duration`, so retiming the
 * shot only means changing one number.
 */
export default function TheaterFlythrough({
  origin,
  seatNumber = null,
  onComplete,
  duration = 3000,
}) {
  const [landing, setLanding] = useState(false);

  // The parent re-renders while the camera is still in the air — socket
  // traffic, seat refreshes — and hands us a fresh onComplete each time.
  // Holding it in a ref keeps the schedule below tied to `duration` alone,
  // otherwise the effect would re-run and restart the flight forever.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCompleteRef.current?.();
      return;
    }

    // Start dissolving into the room just before touchdown so the two views
    // overlap for a beat instead of cutting.
    const landTimer = setTimeout(() => setLanding(true), duration * 0.88);
    const doneTimer = setTimeout(() => onCompleteRef.current?.(), duration);

    return () => {
      clearTimeout(landTimer);
      clearTimeout(doneTimer);
    };
  }, [duration]);

  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight / 2;

  const style = {
    '--dur': `${duration}ms`,
    '--ox': `${ox}px`,
    '--oy': `${oy}px`,
    // The vanishing point starts over the seat and drifts to centre frame as
    // the camera swings around to face the screen.
    '--opx': `${(ox / window.innerWidth) * 100}%`,
    '--opy': `${(oy / window.innerHeight) * 100}%`,
  };

  return (
    <div
      className={`flythrough ${landing ? 'flythrough--landing' : ''}`}
      style={style}
      aria-hidden="true"
    >
      <div className="flythrough__camera">
        <div className="flythrough__scene">
          <div className="flythrough__floor" />

          <div className="flythrough__wall flythrough__wall--left" />
          <div className="flythrough__wall flythrough__wall--right" />

          {/* The seat you just left, filling the bottom of frame before the
              camera climbs off it. */}
          <div className="flythrough__origin-seat" />

          {/* Rows of headrests at increasing depth. Each row fades as the
              camera passes through it, so nothing degenerates on the way by. */}
          {Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="flythrough__row" style={{ '--i': row }}>
              {Array.from({ length: SEATS_PER_ROW }, (_, seat) => (
                <span key={seat} className="flythrough__seat" />
              ))}
            </div>
          ))}

          <div className="flythrough__screen">
            <div className="flythrough__screen-glow" />
            <span className="flythrough__screen-label mono">LIVEVERSE</span>
          </div>
        </div>
      </div>

      {/* Projector beam and its dust, held outside the 3D scene so they stay
          locked to the lens rather than flying past with the room. */}
      <div className="flythrough__beam">
        {MOTES.map((mote, i) => (
          <span
            key={i}
            className="flythrough__mote"
            style={{
              left: mote.left,
              top: mote.top,
              animationDelay: mote.delay,
              '--mote-scale': mote.scale,
            }}
          />
        ))}
      </div>

      <div className="flythrough__streaks" />
      <div className="flythrough__vignette" />
      <div className="flythrough__flare" />

      <div className="flythrough__bar flythrough__bar--top" />
      <div className="flythrough__bar flythrough__bar--bottom" />

      <p className="flythrough__caption mono">
        {seatNumber != null && (
          <span className="flythrough__caption-seat">
            Seat {String(seatNumber).padStart(2, '0')}
          </span>
        )}
        <span>THE SHOW IS ABOUT TO BEGIN</span>
      </p>
    </div>
  );
}
