import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import Button from '../components/Button';
import './styles/AuthPages.css';

export default function Login() {
  const { login, authLoading, authError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/rooms');
  };

  return (
    <div className="auth-page">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <div className="auth-card">
        <Link to="/" className="auth-card__logo">
          <Logo size="lg" />
        </Link>
        <p className="auth-card__tagline">Your seat is waiting. Step up to the box office.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {authError ? <p className="auth-error" role="alert">{authError}</p> : null}

          <Button type="submit" fullWidth loading={authLoading}>
            Take Your Seat
          </Button>
        </form>

        <p className="auth-switch">
          New to Live-Verse? <Link to="/signup">Get a ticket</Link>
        </p>
      </div>
    </div>
  );
}