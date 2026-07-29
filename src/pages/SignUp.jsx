import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Logo from '../components/Logo';
import Button from '../components/Button';
import './styles/AuthPages.css';

export default function Signup() {
  const { signup, authLoading, authError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await signup(name, email, password);
    if (ok) navigate('/rooms');
  };

  return (
    <div className="auth-page">
      <div className="auth-page__backdrop" aria-hidden="true" />
      <div className="auth-card">
        <Link to="/" className="auth-card__logo">
          <Logo size="lg" />
        </Link>
        <p className="auth-card__tagline">Get your ticket. First show starts whenever you're ready.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              placeholder="Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          {authError ? <p className="auth-error" role="alert">{authError}</p> : null}

          <Button type="submit" fullWidth loading={authLoading}>
            Create My Ticket
          </Button>
        </form>

        <p className="auth-switch">
          Already a member? <Link to="/login">Take your seat</Link>
        </p>
      </div>
    </div>
  );
}
