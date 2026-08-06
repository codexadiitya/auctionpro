/**
 * socket.js — Socket.IO client singleton
 *
 * Creates ONE shared socket connection for the entire app.
 * Calling getSocket() multiple times always returns the same instance.
 *
 * Usage:
 *   import { getSocket } from '../lib/socket';
 *   const socket = getSocket();
 *   socket.emit('join_auction', { auction_id: '...' });
 *   socket.on('bid', (data) => { ... });
 */

import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

/** Singleton socket instance — created once, reused everywhere */
let socketInstance = null;

/**
 * Get (or create) the shared Socket.IO connection.
 *
 * @returns {import('socket.io-client').Socket} The connected socket instance.
 */
export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(BACKEND_URL, {
      path:              '/socket.io',
      transports:        ['websocket', 'polling'],
      reconnection:      true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
    });
  }

  return socketInstance;
}

/**
 * Manually disconnect and destroy the socket.
 * Call this when the user logs out.
 */
export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
