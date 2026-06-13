/**
 * Entry point: wires the Express app to an HTTP server, attaches Socket.IO,
 * ensures the schema exists, and starts listening.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { db } from './db/database.js';
import { realtime } from './realtime/socket.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Apply schema.sql so the app is runnable even before `npm run seed`. */
function ensureSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  db.connect();
  db.exec(schema);
}

function start() {
  ensureSchema();

  const app = createApp();
  const server = http.createServer(app);
  realtime.init(server); // attach Socket.IO to the same HTTP server

  server.listen(config.port, () => {
    logger.info(`CAB-Sessions API listening on http://localhost:${config.port}`);
    logger.info(`Allowed client origin: ${config.clientOrigin}`);
  });

  // Graceful shutdown.
  const shutdown = () => {
    logger.info('Shutting down…');
    server.close(() => { db.close(); process.exit(0); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
