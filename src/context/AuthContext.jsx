import { createContext, useState, useCallback, useEffect } from 'react';
import { login as loginRequest, register, logout as logoutRequest } from '../api/authApi';
import { getCurrentUser } from '../api/userApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // With no stored token there is nothing to verify, so the app is ready right away.
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('accessToken'));
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // A stored token only says the last session was signed in. The API decides whether it is
  // still valid, so nobody is treated as authenticated until that check comes back.
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return undefined;

    let active = true;
    getCurrentUser()
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch(() => localStorage.removeItem('accessToken'))
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError('');
    if (!email || !password) {
      setAuthError('Enter both your email and password to continue.');
      return false;
    }
    setAuthLoading(true);
    try {
      const { data } = await loginRequest({ email, password });
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      return true;
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Unable to sign in. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setAuthError('');
    if (!name || !email || !password) {
      setAuthError('Fill in your name, email, and password to create an account.');
      return false;
    }
    setAuthLoading(true);
    try {
      const { data } = await register({ name, email, password });
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      return true;
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Unable to create your account. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    localStorage.removeItem('accessToken');
    setAuthError('');
    setUser(null);
  }, []);

  const value = { user, authReady, authLoading, authError, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
