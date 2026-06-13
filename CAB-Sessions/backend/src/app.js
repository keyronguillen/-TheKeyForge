/**
 * Express application factory. Kept separate from server.js so the app can be
 * imported in tests without binding a port.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/index.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // ── Security baseline ──
  app.use(helmet());                       // secure HTTP headers
  app.use(cors(corsOptions));              // allow the SPA origin(s); also answers preflight
  app.options('*', cors(corsOptions));     // explicitly handle CORS preflight (OPTIONS)
  app.use(express.json({ limit: '256kb' })); // cap body size (DoS hardening)

  // ── API ──
  app.use('/api', apiRouter);

  // ── Fallbacks ──
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
