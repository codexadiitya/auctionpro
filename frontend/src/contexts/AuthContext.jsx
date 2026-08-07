/**
 * AuthContext.jsx — Global authentication state
 *
 * Provides login/logout functionality and the current user object
 * to every component in the app via React Context.
 *
 * Usage:
 *   const { user, login, logout, isLoading } = useAuth();
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

// ─────────────────────────────────────────────────────────────────────────────
// Context definition
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

/** Key names used in localStorage */
const TOKEN_KEY = 'ap_token';
const USER_KEY  = 'ap_user';

// ─────────────────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AuthProvider wraps the entire app and manages auth state.
 * Place it at the root of your component tree (in App.js or index.js).
 */
export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);  // true while checking stored token

  // On app load — restore session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser  = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid by calling /auth/me
          const { data: freshUser } = await api.get('/auth/me');
          setUser(freshUser);
        } catch {
          // Token expired or invalid — clear stored data
          clearAuthData();
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  /** Save auth data and update state after a successful login */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /** Register user via API call, store session token, and update state */
  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /** Clear auth data and disconnect socket on logout */
  const logout = useCallback(() => {
    clearAuthData();
    disconnectSocket();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useAuth — access authentication state anywhere in the component tree.
 *
 * @returns {{ user: object|null, login: Function, logout: Function, isLoading: boolean }}
 * @throws {Error} If used outside of <AuthProvider>
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
