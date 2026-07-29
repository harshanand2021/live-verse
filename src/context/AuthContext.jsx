import { createContext, useState, useCallback } from 'react';
import { login as loginRequest, register, logout as logoutRequest } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

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
    setUser(null);
  }, []);

  const value = { user, authLoading, authError, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
