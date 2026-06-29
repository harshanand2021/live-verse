import './styles/Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  fullWidth = false,
  loading = false,
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`lv-btn lv-btn--${variant} lv-btn--${size} ${fullWidth ? 'lv-btn--full' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? <span className="lv-btn__spinner" aria-hidden="true" /> : null}
      <span className={loading ? 'lv-btn__label--loading' : ''}>{children}</span>
    </button>
  );
}