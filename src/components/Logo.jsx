import './styles/Logo.css';

export default function Logo({ size = 'md' }) {
  return (
    <div className={`lv-logo lv-logo--${size}`}>
      <span className="lv-logo__bulb" aria-hidden="true" />
      <span className="lv-logo__text">
        Live<span className="lv-logo__accent">Verse</span>
      </span>
    </div>
  );
}