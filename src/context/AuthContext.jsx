import { createContext, useState, useCallback, useEffect } from 'react';
import { login as loginRequest, register, verify } from '../api/authApi';

const AuthContext = createContext(null);

// Backend's user shape → frontend's expected shape.
// Frontend components read user.id, user.name, user.email.
// Backend gives us userId, displayName, username.
function normalizeUser(backendUser) {
  if (!backendUser) return null;
  return {
    id: backendUser.userId,
    name: backendUser.displayName,
    handle: '@' + (backendUser.username || ''),
    email: backendUser.email || '',
    avatarColor: '#7C6BFF',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('accessToken'));
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return undefined;

    let active = true;
    verify()
      .then(({ data }) => {
        if (active) setUser(normalizeUser(data.data));
      })
      .catch(() => localStorage.removeItem('accessToken'))
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setAuthError('');
    if (!username || !password) {
      setAuthError('Enter both your username and password to continue.');
      return false;
    }
    setAuthLoading(true);
    try {
      const { data } = await loginRequest({ username, password });
      const payload = data.data;
      localStorage.setItem('accessToken', payload.token);
      setUser(normalizeUser(payload));
      return true;
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Unable to sign in. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (name, username, email, password) => {
    setAuthError('');
    if (!name || !username || !email || !password) {
      setAuthError('Fill in your name, username, email, and password to create an account.');
      return false;
    }
    setAuthLoading(true);
    try {
      const { data } = await register({
        username,
        email: email.trim().toLowerCase(),
        displayName: name.trim(),
        password,
      });
      const registeredUser = data.data;

      // Auto-login after successful registration
      const loginResponse = await loginRequest({
        username: registeredUser.username,
        password,
      });
      const loginPayload = loginResponse.data.data;
      localStorage.setItem('accessToken', loginPayload.token);
      setUser(normalizeUser(loginPayload));
      return true;
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Unable to create your account. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('accessToken');
    setAuthError('');
    setUser(null);
  }, []);

  const value = { user, authReady, authLoading, authError, login, signup, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };