/**
 * Create demo admin + AJK users and signed session cookies for a LOCAL
 * database, writing playwright/.auth/{admin,ajk}.json. Lets screenshots and
 * UAT run locally without Google OAuth.
 * Usage: bun run test:auth:local
 */

import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { session, user } from '../db/schema';

const LOCAL_HOSTS = new Set(['db.localtest.me', 'localhost', '127.0.0.1']);
const dbHost = new URL(process.env.DATABASE_URL ?? '').hostname;
if (!LOCAL_HOSTS.has(dbHost)) {
  console.error(`Refusing to run: DATABASE_URL host "${dbHost}" is not a local database.`);
  process.exit(1);
}

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
const baseUrl = new URL(process.env.UAT_BASE_URL ?? 'http://localhost:3000');
const SESSION_DAYS = 7;

const DEMO_USERS = [
  { role: 'admin', name: 'Admin Contoh', email: 'admin@example.com' },
  { role: 'ajk', name: 'AJK Contoh', email: 'ajk@example.com' },
] as const;

async function ensureUser(u: (typeof DEMO_USERS)[number]): Promise<string> {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email)).limit(1);
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(user).values({ id, name: u.name, email: u.email, role: u.role, active: true, emailVerified: true });
  return id;
}

async function main() {
  const authDir = path.join(__dirname, '..', 'playwright', '.auth');
  fs.mkdirSync(authDir, { recursive: true });

  for (const u of DEMO_USERS) {
    const userId = await ensureUser(u);
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await db.insert(session).values({ id: randomUUID(), userId, token, expiresAt });

    // Same format Better Auth uses for signed cookies: "<token>.<base64 HMAC-SHA256>"
    const signature = createHmac('sha256', secret!).update(token).digest('base64');
    const state = {
      cookies: [{
        name: 'better-auth.session_token',
        value: encodeURIComponent(`${token}.${signature}`),
        domain: baseUrl.hostname,
        path: '/',
        expires: Math.floor(expiresAt.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      }],
      origins: [],
    };
    fs.writeFileSync(path.join(authDir, `${u.role}.json`), JSON.stringify(state, null, 2));
    console.log(`✅  ${u.role}: ${u.email} → playwright/.auth/${u.role}.json`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
