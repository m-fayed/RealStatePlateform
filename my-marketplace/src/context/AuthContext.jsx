import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthContext } from './auth';
import { authService } from '../services';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));
  const [authError, setAuthError] = useState('');
  const refreshVersion = useRef(0);

  const login = useCallback((userData, token) => {
    refreshVersion.current += 1;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    setLoading(false);
    setAuthError('');
  }, []);

  const logout = useCallback(() => {
    refreshVersion.current += 1;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  }, []);

  // Replaces the cached user (and the localStorage copy) without touching the token.
  // Use after server-side mutations that change profile fields, e.g. plan upgrades.
  const updateUser = useCallback((userData) => {
    if (!userData) return;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const version = ++refreshVersion.current;
    try {
      const response = await authService.me();
      if (version !== refreshVersion.current || localStorage.getItem('token') !== token) return null;
      updateUser(response.data.user);
      setIsAuthenticated(true);
      setAuthError('');
      return response.data.user;
    } catch (error) {
      if (version !== refreshVersion.current) return null;
      if ([401, 403].includes(error.response?.status)) logout();
      else setAuthError('تعذّر تحديث الحساب. يرجى المحاولة مرة أخرى.');
      return null;
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, [logout, updateUser]);

  useEffect(() => {
    const refresh = () => { void refreshUser(); };
    refresh();
    window.addEventListener('auth:refresh', refresh);
    window.addEventListener('auth:expired', logout);
    window.addEventListener('focus', refresh);
    const interval = setInterval(refresh, 15000);
    return () => {
      refreshVersion.current += 1;
      clearInterval(interval);
      window.removeEventListener('auth:refresh', refresh);
      window.removeEventListener('auth:expired', logout);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshUser, logout]);

  const value = {
    user,
    isAuthenticated,
    loading,
    authError,
    refreshUser,
    login,
    logout,
    updateUser,
    setLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
