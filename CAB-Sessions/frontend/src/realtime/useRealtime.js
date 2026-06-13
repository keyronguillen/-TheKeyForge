/**
 * Subscribes to Socket.IO events and invokes a callback when the board changes.
 * The socket authenticates with the same JWT as the REST API.
 */
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { tokenStore, API_BASE } from '../api/client.js';

const EVENTS = ['ticket:created', 'ticket:updated', 'approval:decided'];

export function useRealtime(onChange) {
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return undefined;

    // Connect to the backend's Socket.IO. In production API_BASE points at the
    // Render backend; in local dev it's '' and Vite proxies /socket.io.
    const socket = io(API_BASE || '/', { auth: { token } });
    const handler = (payload) => onChange?.(payload);
    EVENTS.forEach((ev) => socket.on(ev, handler));

    return () => socket.disconnect();
  }, [onChange]);
}
