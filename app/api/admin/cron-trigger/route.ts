/**
 * Admin-only endpoint to manually trigger the daily notification cron.
 * Used in UAT testing and for manual admin verification.
 *
 * POST /api/admin/cron-trigger          — run (skips if already ran today)
 * POST /api/admin/cron-trigger?reset=true — delete today's idempotency record first, then run
 */

import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api/guards';
import { handleError } from '@/lib/api/responses';
import { resetCronIdempotency, runDailyNotifications } from '@/lib/cron/daily-notifications';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const reset = new URL(req.url).searchParams.get('reset') === 'true';
    if (reset) {
      const todayUtc = new Date().toISOString().slice(0, 10);
      await resetCronIdempotency(todayUtc);
    }

    const result = await runDailyNotifications();
    return Response.json(result);
  } catch (err) {
    return handleError(err);
  }
}
