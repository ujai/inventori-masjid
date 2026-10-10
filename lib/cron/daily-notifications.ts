/**
 * Core logic for the daily notification cron.
 * Shared by /api/cron/daily (CRON_SECRET auth) and
 * /api/admin/cron-trigger (admin session auth).
 */

import { and, eq, isNull, isNotNull, lt, lte, ne, sql, gte } from 'drizzle-orm';

import { db } from '@/db/client';
import { APP_NAME } from '@/lib/site';
import { activityLogs, items, locations, movementLogs, user } from '@/db/schema';
import { sendDailyDigest } from '@/lib/notifications/email';
import { sendTelegramMessage, tgEscape } from '@/lib/notifications/telegram';

export type DailyNotificationResult = {
  ok: boolean;
  message?: string;
  dueService?: number;
  overdueBorrows?: number;
  lowStock?: number;
  emailSent?: number;
  telegramSent?: number;
  elapsed: number;
};

/**
 * Reset today's idempotency record so the cron can run again.
 * Used by the admin trigger endpoint and in tests.
 */
export async function resetCronIdempotency(todayUtc: string): Promise<void> {
  await db
    .delete(activityLogs)
    .where(
      and(
        eq(activityLogs.action, 'cron.daily_notification'),
        eq(activityLogs.entityId, todayUtc),
      ),
    );
}

export async function runDailyNotifications(): Promise<DailyNotificationResult> {
  const started = Date.now();

  const todayUtc = new Date().toISOString().slice(0, 10);

  // ── 0. Idempotency guard ──────────────────────────────────────────────────
  const [alreadyRan] = await db
    .select({ id: activityLogs.id })
    .from(activityLogs)
    .where(and(eq(activityLogs.action, 'cron.daily_notification'), eq(activityLogs.entityId, todayUtc)))
    .limit(1);

  if (alreadyRan) {
    return { ok: true, message: 'Already ran today — idempotent skip', elapsed: Date.now() - started };
  }

  // ── 1. Gather data ────────────────────────────────────────────────────────

  const [dueServiceRows, overdueBorrowRows, lowStockRows, notifyUsers] = await Promise.all([
    db
      .select({
        id:              items.id,
        name:            items.name,
        assetCode:       items.assetCode,
        nextServiceDate: items.nextServiceDate,
        locationName:    locations.nameMs,
      })
      .from(items)
      .innerJoin(locations, eq(locations.id, items.currentLocationId))
      .where(
        and(
          isNotNull(items.nextServiceDate),
          lte(items.nextServiceDate, sql`CURRENT_DATE + INTERVAL '30 days'`),
          gte(items.nextServiceDate, sql`CURRENT_DATE`),
          ne(items.status, 'dilupuskan'),
          ne(items.status, 'hilang'),
        ),
      )
      .orderBy(items.nextServiceDate),

    db
      .select({
        id:                 items.id,
        itemName:           items.name,
        assetCode:          items.assetCode,
        borrowerName:       movementLogs.borrowerName,
        expectedReturnDate: movementLogs.expectedReturnDate,
      })
      .from(movementLogs)
      .innerJoin(items, eq(items.id, movementLogs.itemId))
      .where(
        and(
          eq(movementLogs.purpose, 'pinjam'),
          isNull(movementLogs.returnedDate),
          isNotNull(movementLogs.expectedReturnDate),
          lt(movementLogs.expectedReturnDate, sql`CURRENT_DATE`),
          ne(items.status, 'dilupuskan'),
          ne(items.status, 'hilang'),
        ),
      )
      .orderBy(movementLogs.expectedReturnDate),

    db
      .select({
        id:              items.id,
        name:            items.name,
        assetCode:       items.assetCode,
        quantity:        items.quantity,
        minimumQuantity: items.minimumQuantity,
        locationName:    locations.nameMs,
      })
      .from(items)
      .innerJoin(locations, eq(locations.id, items.currentLocationId))
      .where(
        and(
          isNotNull(items.minimumQuantity),
          sql`${items.quantity} <= ${items.minimumQuantity}`,
          ne(items.status, 'dilupuskan'),
          ne(items.status, 'hilang'),
        ),
      )
      .orderBy(items.name),

    db
      .select({
        id:                          user.id,
        name:                        user.name,
        email:                       user.email,
        telegramChatId:              user.telegramChatId,
        notificationEmailEnabled:    user.notificationEmailEnabled,
        notificationTelegramEnabled: user.notificationTelegramEnabled,
      })
      .from(user)
      .where(eq(user.active, true)),
  ]);

  if (dueServiceRows.length === 0 && overdueBorrowRows.length === 0 && lowStockRows.length === 0) {
    return { ok: true, message: 'Nothing to notify', elapsed: Date.now() - started };
  }

  // ── 2. Build Telegram message ─────────────────────────────────────────────

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const tgLines: string[] = [`🕌 <b>${tgEscape(APP_NAME)}</b>\n<b>Peringatan Harian</b>`];

  if (dueServiceRows.length > 0) {
    tgLines.push('\n🔧 <b>Perlu Servis (30 hari):</b>');
    for (const i of dueServiceRows) {
      const link = `${appUrl}/items/${i.id}`;
      tgLines.push(`• <a href="${link}">${tgEscape(i.name)}</a>${i.assetCode ? ` <code>${tgEscape(i.assetCode)}</code>` : ''} — ${tgEscape(i.nextServiceDate ?? '—')} [${tgEscape(i.locationName)}]`);
    }
  }

  if (overdueBorrowRows.length > 0) {
    tgLines.push('\n📦 <b>Pinjaman Tertunggak:</b>');
    for (const b of overdueBorrowRows) {
      const link = `${appUrl}/items/${b.id}`;
      tgLines.push(`• <a href="${link}">${tgEscape(b.itemName)}</a> — ${tgEscape(b.borrowerName ?? '—')} (jangka: ${tgEscape(b.expectedReturnDate ?? '—')})`);
    }
  }

  if (lowStockRows.length > 0) {
    tgLines.push('\n⚠️ <b>Stok Rendah:</b>');
    for (const s of lowStockRows) {
      const link = `${appUrl}/items/${s.id}`;
      tgLines.push(`• <a href="${link}">${tgEscape(s.name)}</a>${s.assetCode ? ` <code>${tgEscape(s.assetCode)}</code>` : ''} — ${s.quantity} unit (min: ${s.minimumQuantity}) [${tgEscape(s.locationName)}]`);
    }
  }

  tgLines.push(`\n<a href="${appUrl}">Buka sistem inventori</a>`);
  const tgMessage = tgLines.join('\n');

  // ── 3. Mark run, then send ────────────────────────────────────────────────
  await db.insert(activityLogs).values({
    actorUserId: null,
    action:      'cron.daily_notification',
    entityType:  'cron',
    entityId:    todayUtc,
  });

  let emailSent = 0;
  let telegramSent = 0;

  for (const u of notifyUsers) {
    if (u.notificationEmailEnabled) {
      try {
        await sendDailyDigest({
          to:             u.email,
          name:           u.name,
          dueService:     dueServiceRows,
          overdueBorrows: overdueBorrowRows,
          lowStock:       lowStockRows as { id: number; name: string; assetCode: string | null; quantity: number; minimumQuantity: number; locationName: string }[],
        });
        emailSent++;
        await new Promise<void>((r) => setTimeout(r, 600));
      } catch (err) {
        console.error(`Email failed for ${u.email}:`, err);
      }
    }
    if (u.notificationTelegramEnabled && u.telegramChatId) {
      try {
        await sendTelegramMessage(u.telegramChatId, tgMessage);
        telegramSent++;
      } catch (err) {
        console.error(`Telegram failed for ${u.telegramChatId}:`, err);
      }
    }
  }

  return {
    ok: true,
    dueService:     dueServiceRows.length,
    overdueBorrows: overdueBorrowRows.length,
    lowStock:       lowStockRows.length,
    emailSent,
    telegramSent,
    elapsed: Date.now() - started,
  };
}
