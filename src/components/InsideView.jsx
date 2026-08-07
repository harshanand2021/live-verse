import './styles/InsideView.css';

/** Wraps the player in a cinema interior for the seated, in-theatre view. */
export default function InsideView({ children, isFullScreen = true }) {
  return (
    <section
      className={`inside-view ${isFullScreen ? 'inside-view--fullscreen' : ''}`}
      aria-label="Cinema viewing perspective"
    >
      <div className="inside-view__room">
        <div className="inside-view__curtain inside-view__curtain--left" aria-hidden="true" />
        <div className="inside-view__curtain inside-view__curtain--right" aria-hidden="true" />

        <div className="inside-view__proscenium">
          <div className="inside-view__screen-glow" aria-hidden="true" />
          <div className="inside-view__screen">{children}</div>
        </div>
      </div>

      <div className="inside-view__seat-note mono">YOUR SEAT · THEATRE VIEW</div>
    </section>
  );
}
