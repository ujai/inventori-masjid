import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { activityLogs, items } from '@/db/schema';
import { requireAdmin, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { z } from 'zod';

const recoveryInput = z.object({
  recoveredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarikh tidak sah (YYYY-MM-DD)'),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const itemId = parseRouteId((await ctx.params).id);

    const body = recoveryInput.parse(await req.json());

    const [existing] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    if (existing.status !== 'hilang') {
      throw new ApiError(
        400,
        'BUSINESS_RULE',
        `Hanya barang berstatus 'hilang' boleh ditanda dijumpai. Status semasa: ${existing.status}`,
      );
    }

    await db.batch([
      db.update(items)
        .set({ status: 'aktif', updatedAt: new Date() })
        .where(eq(items.id, itemId)),
      db.insert(activityLogs).values({
        actorUserId: session.user.id,
        action: 'item.recovered',
        entityType: 'item',
        entityId: String(itemId),
        changes: {
          before: { status: existing.status },
          after:  { status: 'aktif', recoveredDate: body.recoveredDate, notes: body.notes ?? null },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      }),
    ]);

    return ok({ id: itemId, status: 'aktif', recoveredDate: body.recoveredDate });
  } catch (err) {
    return handleError(err);
  }
}
