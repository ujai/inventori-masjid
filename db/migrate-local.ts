/**
 * Apply drizzle/ migrations through the app's Neon HTTP client.
 * Used for the local Docker database (docker-compose.yml), where
 * drizzle-kit can't connect because there is no Neon WebSocket endpoint.
 * Usage: bun run db:migrate:local
 */

import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './client';

migrate(db, { migrationsFolder: './drizzle' })
  .then(() => {
    console.log('✅  Migrations applied.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
