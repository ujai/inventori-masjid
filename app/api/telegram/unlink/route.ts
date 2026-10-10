import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';

export async function POST(_req: NextRequest) {
  try {
    const session = await requireSession();
    await db.update(user)
      .set({ telegramChatId: null, telegramUsername: null, notificationTelegramEnabled: false, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    return ok({ unlinked: true });
  } catch (err) {
    return handleError(err);
  }
}
