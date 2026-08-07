import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import '../pages/styles/AuthPages.css';

export default function ProtectedRoute({ children }) {
  const { user, authReady } = useAuth();
  const location = useLocation();

  // Redirecting before the stored session has been checked would bounce a signed-in
  // user to the login page on every reload.
  if (!authReady) {
    return (
      <div className="auth-page">
        <p className="auth-checking">Checking your ticket…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
