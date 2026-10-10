/**
 * Daily notification cron job.
 * Triggered by Vercel cron at 00:00 UTC = 08:00 MYT.
 *
 * Security: Vercel sets Authorization: Bearer <CRON_SECRET>.
 * We verify it so no external caller can trigger this endpoint.
 */

import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { runDailyNotifications } from '@/lib/cron/daily-notifications';

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured: allow in local dev, block in production.
    return process.env.NODE_ENV !== 'production';
  }
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const expectedAuth = `Bearer ${secret}`;
  if (authHeader.length !== expectedAuth.length) return false;

  return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth));
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runDailyNotifications();
  return Response.json(result);
}
