import { createContext, useContext, useState, useCallback } from 'react';
import { currentUser as mockCurrentUser, fakeDelay } from '../data/mockData';
// import apiClient from "../api/apiClient";

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
    await fakeDelay(700);
    setAuthLoading(false);
    // Mock: any non-empty credentials succeed
    setUser({ ...mockCurrentUser });
    return true;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    setAuthError('');
    if (!name || !email || !password) {
      setAuthError('Fill in your name, email, and password to create an account.');
      return false;
    }
    setAuthLoading(true);
    await fakeDelay(900);
    setAuthLoading(false);
    setUser({ ...mockCurrentUser, name, handle: '@' + name.toLowerCase().replace(/\s+/g, '') });
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = { user, authLoading, authError, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}