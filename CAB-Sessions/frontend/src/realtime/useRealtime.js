/**
 * Subscribes to Socket.IO events and invokes a callback when the board changes.
 * The socket authenticates with the same JWT as the REST API.
 */
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { tokenStore } from '../api/client.js';

const EVENTS = ['ticket:created', 'ticket:updated', 'approval:decided'];

export function useRealtime(onChange) {
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return undefined;

    const socket = io('/', { auth: { token } });
    const handler = (payload) => onChange?.(payload);
    EVENTS.forEach((ev) => socket.on(ev, handler));

    return () => socket.disconnect();
  }, [onChange]);
}
