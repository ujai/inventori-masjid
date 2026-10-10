/**
 * Test notification endpoint — admin only.
 * Sends a sample email + Telegram message to the requesting user.
 * GET /api/cron/test
 */
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { APP_NAME } from '@/lib/site';
import { user } from '@/db/schema';
import { requireAdmin } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';
import { sendDailyDigest } from '@/lib/notifications/email';
import { sendTelegramMessage } from '@/lib/notifications/telegram';

export async function GET(_req: NextRequest) {
  try {
    const session = await requireAdmin();

    const [dbUser] = await db
      .select({
        name:           user.name,
        email:          user.email,
        telegramChatId: user.telegramChatId,
        notificationTelegramEnabled: user.notificationTelegramEnabled,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!dbUser) throw new Error('User not found');

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const sampleService = [
      { id: 7, name: 'Penghawa Dingin Dewan Solat', assetCode: 'FSI-0001', nextServiceDate: '2026-05-09', locationName: 'Dewan Solat Utama' },
    ];
    const sampleBorrows = [
      { id: 1, itemName: 'Periuk Besar', assetCode: null, borrowerName: 'Ahmad bin Ali', expectedReturnDate: '2026-04-30' },
    ];

    const results: Record<string, unknown> = {};

    // Send test email
    await sendDailyDigest({
      to:             dbUser.email,
      name:           dbUser.name,
      dueService:     sampleService,
      overdueBorrows: sampleBorrows,
    });
    results.email = `Sent to ${dbUser.email}`;

    // Send test Telegram if linked
    if (dbUser.telegramChatId && dbUser.notificationTelegramEnabled) {
      const msg = [
        `🕌 <b>Ujian Pemberitahuan — ${APP_NAME}</b>`,
        '',
        '🔧 <b>Perlu Servis (7 hari):</b>',
        `• <a href="${appUrl}/items/7">Penghawa Dingin Dewan Solat</a> <code>FSI-0001</code> — 2026-05-09 [Dewan Solat Utama]`,
        '',
        '📦 <b>Pinjaman Tertunggak:</b>',
        `• <a href="${appUrl}/items/1">Periuk Besar</a> — peminjam: Ahmad bin Ali (jangka: 2026-04-30)`,
        '',
        '✅ Pemberitahuan berfungsi dengan baik.',
      ].join('\n');
      await sendTelegramMessage(dbUser.telegramChatId, msg);
      results.telegram = `Sent to chat ${dbUser.telegramChatId}`;
    } else {
      results.telegram = dbUser.telegramChatId
        ? 'Telegram linked but notifications disabled — enable in /me'
        : 'Telegram not linked';
    }

    return ok(results);
  } catch (err) {
    return handleError(err);
  }
}
