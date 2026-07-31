import { useEffect, useState } from 'react';
import './styles/TheaterFlythrough.css';

/**
 * Cinematic "fly into the theater" intro overlay.
 * Renders a 3D perspective scene — a tilted seat floor stretching toward a
 * distant screen — and animates the camera pushing forward until the screen
 * fills the view. Calls onComplete when done, then the real room takes over.
 */
export default function TheaterFlythrough({ onComplete, duration = 2400 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: skip straight to the room.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onComplete?.();
      return;
    }

    // Start the fade-out slightly before the end so the handoff is seamless.
    const fadeTimer = setTimeout(() => setLeaving(true), duration - 400);
    const doneTimer = setTimeout(() => onComplete?.(), duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete, duration]);

  return (
    <div className={`flythrough ${leaving ? 'flythrough--leaving' : ''}`} aria-hidden="true">
      <div className="flythrough__scene">
        {/* Depth layers of seats — three planes at different distances give
            real parallax as the camera flies past them. */}
        <div className="flythrough__seats flythrough__seats--back" />
        <div className="flythrough__seats flythrough__seats--mid" />
        <div className="flythrough__seats flythrough__seats--front" />

        {/* The distant screen that grows to fill the frame */}
        <div className="flythrough__screen">
          <div className="flythrough__screen-glow" />
          <span className="flythrough__screen-label mono">LIVEVERSE</span>
        </div>

        {/* Ambient side walls for depth framing */}
        <div className="flythrough__wall flythrough__wall--left" />
        <div className="flythrough__wall flythrough__wall--right" />
      </div>

      {/* Vignette + "the show is starting" text */}
      <div className="flythrough__vignette" />
      <p className="flythrough__caption mono">THE SHOW IS ABOUT TO BEGIN</p>
    </div>
  );
}