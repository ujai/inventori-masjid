/**
 * Create the first admin user. Sign-up is disabled, so a fresh install
 * needs one admin in the user table before anyone can sign in with Google.
 * Usage: bun run db:create-admin <email> "<full name>"
 */

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './client';
import { user } from './schema';

async function main() {
  const [rawEmail, ...nameParts] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  const name = nameParts.join(' ').trim();
  if (!email || !email.includes('@') || !name) {
    console.error('Usage: bun run db:create-admin <email> "<full name>"');
    process.exit(1);
  }

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing) {
    await db.update(user).set({ role: 'admin', active: true }).where(eq(user.id, existing.id));
    console.log(`✅  ${email} already exists, promoted to admin.`);
    process.exit(0);
  }

  await db.insert(user).values({
    id: randomUUID(),
    name,
    email,
    role: 'admin',
    active: true,
    emailVerified: false,
  });
  console.log(`✅  Admin ${email} created. Sign in with this Google account.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to create admin:', err);
  process.exit(1);
});
