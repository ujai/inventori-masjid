/**
 * Telegram webhook — receives updates from Telegram.
 *
 * Security: Telegram includes X-Telegram-Bot-Api-Secret-Token header.
 * We reject any request that doesn't match TELEGRAM_WEBHOOK_SECRET.
 *
 * Supported commands: /start <token>
 */

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db/client';
import { APP_NAME } from '@/lib/site';
import { telegramLinkTokens, user } from '@/db/schema';
import { sendTelegramMessage, tgEscape } from '@/lib/notifications/telegram';

export async function POST(req: NextRequest) {
  // Verify secret token from Telegram.
  // TELEGRAM_WEBHOOK_SECRET must be set — reject all calls if missing.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Telegram webhook] TELEGRAM_WEBHOOK_SECRET not configured');
    return Response.json({ ok: false }, { status: 503 });
  }
  const header = req.headers.get('x-telegram-bot-api-secret-token');
  if (
    !header ||
    header.length !== secret.length ||
    !crypto.timingSafeEqual(Buffer.from(header), Buffer.from(secret))
  ) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = body?.message;
  if (!message) return Response.json({ ok: true });

  const chatId   = String(message.chat?.id ?? '');
  const text     = String(message.text ?? '').trim();
  const from     = message.from;

  // Handle /start <token>
  if (text.startsWith('/start ')) {
    const token = text.slice(7).trim();
    if (!token) {
      await sendTelegramMessage(chatId, 'Sila gunakan pautan dari profil sistem inventori.');
      return Response.json({ ok: true });
    }

    // Validate token
    const [linkToken] = await db
      .select({ userId: telegramLinkTokens.userId })
      .from(telegramLinkTokens)
      .where(
        and(
          eq(telegramLinkTokens.token, token),
          gt(telegramLinkTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!linkToken) {
      await sendTelegramMessage(chatId, '⚠️ Pautan tidak sah atau sudah tamat tempoh. Sila jana pautan baru dari profil anda.');
      return Response.json({ ok: true });
    }

    // Link the Telegram chatId to the user
    await db.batch([
      db.update(user)
        .set({
          telegramChatId:             chatId,
          telegramUsername:           from?.username ?? null,
          notificationTelegramEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, linkToken.userId)),
      db.delete(telegramLinkTokens).where(eq(telegramLinkTokens.token, token)),
    ]);

    const [linkedUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, linkToken.userId)).limit(1);
    const name = tgEscape(linkedUser?.name ?? 'anda');

    await sendTelegramMessage(
      chatId,
      `✅ Telegram berjaya disambung untuk akaun <b>${name}</b>.\n\nAnda akan menerima peringatan inventori harian di sini.`,
    );
    return Response.json({ ok: true });
  }

  // /start without token (user opened bot directly)
  if (text === '/start') {
    await sendTelegramMessage(chatId, `🕌 <b>${tgEscape(APP_NAME)}</b>\n\nSila sambung Telegram melalui profil anda di sistem inventori terlebih dahulu.`);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: true });
}
