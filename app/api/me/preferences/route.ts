import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';

const input = z.object({
  notificationEmailEnabled:    z.boolean().optional(),
  notificationTelegramEnabled: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body    = input.parse(await req.json());
    await db.update(user).set({ ...body, updatedAt: new Date() }).where(eq(user.id, session.user.id));
    return ok({ updated: true });
  } catch (err) {
    return handleError(err);
  }
}
