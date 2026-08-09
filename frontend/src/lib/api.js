/**
 * api.js — Production Axios HTTP Client for AuctionPro
 * ====================================================
 * Connects directly to the backend API.
 * Handles JWT token insertion, response unwrapping, and 401 session expiration.
 * No mock engines or fake fallbacks in production.
 */

import axios from 'axios';

const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) return process.env.REACT_APP_BACKEND_URL;
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000';
  }
  return 'https://auctionpro-backend-production.up.railway.app';
};

export const BACKEND = getBackendUrl();

export const api = axios.create({
  baseURL: `${BACKEND}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request Interceptor — attach JWT token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor — Unwrap standard envelope & handle auth errors
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && response.data.success === true && 'data' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message;

    // Attach human-readable error message to error object
    error.userMessage = serverMessage;

    if (status === 401) {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        localStorage.removeItem('ap_token');
        localStorage.removeItem('ap_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
