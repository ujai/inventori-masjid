/**
 * Admin-only one-time setup: register the webhook URL with Telegram.
 * Call once after deploy: GET /api/telegram/setup-webhook
 */

import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';
import { registerWebhook } from '@/lib/notifications/telegram';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const appUrl = process.env.APP_URL ?? `https://${req.headers.get('host')}`;
    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    const result = await registerWebhook(webhookUrl);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
