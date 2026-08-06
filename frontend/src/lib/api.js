/**
 * api.js — Axios HTTP client configuration
 *
 * All API calls in the app go through this file.
 * It automatically attaches the JWT token to every request.
 *
 * Usage:
 *   import { api } from '../lib/api';
 *   const { data } = await api.get('/auctions');
 *   const { data } = await api.post('/auth/login', { email, password });
 */

import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Base URL — reads from .env, falls back to localhost for local development
// ─────────────────────────────────────────────────────────────────────────────
export const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/**
 * Pre-configured Axios instance with:
 *   - Base URL set to the backend server
 *   - JSON content type header
 *   - Automatic JWT token injection via request interceptor
 */
export const api = axios.create({
  baseURL: `${BACKEND}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Request Interceptor — attach auth token to every request
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ap_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// Response Interceptor — handle 401 globally (auto logout on expired token)
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server says our token is invalid, clear it and redirect to login
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login';
      if (!isLoginPage) {
        localStorage.removeItem('ap_token');
        localStorage.removeItem('ap_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
