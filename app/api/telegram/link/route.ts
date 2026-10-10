/**
 * Generate a Telegram deep-link for the current user.
 * Token expires in 24 hours and is single-use.
 */

import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { telegramLinkTokens } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';

export async function POST(_req: NextRequest) {
  try {
    const session = await requireSession();
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) throw new Error('TELEGRAM_BOT_USERNAME not configured');

    const token    = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Remove any existing unused tokens for this user first
    await db.delete(telegramLinkTokens).where(eq(telegramLinkTokens.userId, session.user.id));

    await db.insert(telegramLinkTokens).values({
      token,
      userId:    session.user.id,
      expiresAt,
    });

    const deepLink = `https://t.me/${botUsername}?start=${token}`;
    return ok({ deepLink, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    return handleError(err);
  }
}
