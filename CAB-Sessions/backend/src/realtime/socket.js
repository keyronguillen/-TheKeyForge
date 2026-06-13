/**
 * Socket.IO real-time layer.
 *
 * A thin singleton wrapper so services can `realtime.emit(...)` without holding
 * a reference to the io instance. Connections are authenticated with the same
 * JWT used for the REST API.
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/** Event name constants shared with the frontend (keep in sync). */
export const EVENTS = Object.freeze({
  TICKET_CREATED: 'ticket:created',
  TICKET_UPDATED: 'ticket:updated',
  DECISION_MADE: 'approval:decided',
});

class Realtime {
  /** @type {Server|null} */
  #io = null;

  /** Attach Socket.IO to the HTTP server. */
  init(httpServer) {
    this.#io = new Server(httpServer, {
      cors: { origin: config.clientOrigins, credentials: true },
    });

    // Authenticate every socket using the JWT passed in the handshake.
    this.#io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Auth token required'));
      try {
        socket.user = jwt.verify(token, config.jwt.secret);
        next();
      } catch {
        next(new Error('Invalid auth token'));
      }
    });

    this.#io.on('connection', (socket) => {
      logger.info(`Socket connected: user #${socket.user?.sub}`);
      socket.on('disconnect', () => logger.info(`Socket disconnected: user #${socket.user?.sub}`));
    });

    return this.#io;
  }

  /** Broadcast an event to all connected clients. */
  emit(event, payload) {
    this.#io?.emit(event, payload);
  }
}

export const realtime = new Realtime();
