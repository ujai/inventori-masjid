/**
 * Database client.
 *
 * Default: Neon HTTP driver (works on Vercel serverless / edge).
 *
 * If you ever switch to a long-running Node server (e.g. VPS), swap to
 * neon-serverless with WebSocket. See masjid-inventory-db-schema.md §14.
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as relations from './relations';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
}

// db.localtest.me (resolves to 127.0.0.1) is the local Docker setup in
// docker-compose.yml; route its HTTP queries to the proxy instead of Neon.
if (new URL(process.env.DATABASE_URL).hostname === 'db.localtest.me') {
  neonConfig.fetchEndpoint = 'http://db.localtest.me:4444/sql';
}

// Note: connection caching is now always on by default in @neondatabase/serverless.
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle({
  client: sql,
  schema: { ...schema, ...relations },
});

export type DB = typeof db;
