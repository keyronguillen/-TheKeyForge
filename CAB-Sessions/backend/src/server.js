/**
 * Entry point: wires the Express app to an HTTP server, attaches Socket.IO,
 * ensures the schema exists, and starts listening.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { config, isAiEnabled, isAdoEnabled, isEntraEnabled } from './config/index.js';
import { db } from './db/database.js';
import { runMigrations } from './db/migrate.js';
import { realtime } from './realtime/socket.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Apply schema.sql + additive migrations so the app is runnable on any DB age. */
async function ensureSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  db.connect();
  await db.exec(schema);
  await runMigrations();
}

async function start() {
  await ensureSchema();

  const app = createApp();
  const server = http.createServer(app);
  realtime.init(server); // attach Socket.IO to the same HTTP server

  server.listen(config.port, () => {
    logger.info(`CAB-Sessions API listening on http://localhost:${config.port}`);
    logger.info(`Allowed client origins: ${config.clientOrigins.join(', ')}`);
    logger.info(`AI assistant: ${isAiEnabled ? `enabled (${config.ai.model})` : 'disabled (set ANTHROPIC_API_KEY)'}`);
    logger.info(`Azure DevOps: ${isAdoEnabled ? `enabled (${config.ado.project})` : 'disabled (set ADO_ORG_URL/ADO_PROJECT/ADO_PAT)'}`);
    logger.info(`Entra SSO: ${isEntraEnabled ? `enabled (tenant ${config.entra.tenantId})` : 'disabled (set ENTRA_TENANT_ID/ENTRA_CLIENT_ID)'}`);
  });

  // Graceful shutdown.
  const shutdown = async () => {
    logger.info('Shutting down…');
    server.close(async () => { await db.close(); process.exit(0); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => { logger.error('Failed to start server', err); process.exit(1); });
