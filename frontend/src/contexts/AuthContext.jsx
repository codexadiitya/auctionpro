/**
 * AuthContext.jsx — Real Authentication Context
 * =============================================
 * Handles real user login, registration, session validation, and logout.
 * All operations execute against the production backend API.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ap_token';
const USER_KEY = 'ap_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore and validate session against GET /api/auth/me
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          clearAuthData();
        }
      }

      if (storedToken) {
        try {
          const { data: freshUser } = await api.get('/auth/me');
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          }
        } catch (err) {
          // If server rejects token, clear stored session
          if (err.response?.status === 401) {
            clearAuthData();
            setUser(null);
          }
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  /** Real Login */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data || !data.token) {
      throw new Error('Authentication failed. No token received from server.');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /** Real Register */
  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    if (!data || !data.token) {
      throw new Error('Registration failed. Invalid server response.');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /** Logout */
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}

function clearAuthData() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
