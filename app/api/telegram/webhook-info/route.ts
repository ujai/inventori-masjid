/**
 * Check current Telegram webhook status.
 * GET /api/telegram/webhook-info (admin only)
 */
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

    const res  = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const json = await res.json();
    return ok(json);
  } catch (err) {
    return handleError(err);
  }
}
