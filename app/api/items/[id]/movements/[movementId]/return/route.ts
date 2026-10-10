import type { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { activityLogs, items, movementLogs } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { returnMovementInput } from '@/lib/validators/movements';

type RouteContext = { params: Promise<{ id: string; movementId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const params = await ctx.params;
    const itemId = Number(params.id);
    const movementId = Number(params.movementId);
    if (!Number.isFinite(itemId) || !Number.isFinite(movementId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'ID tidak sah');
    }

    const body = returnMovementInput.parse(await req.json());

    const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    const [movement] = await db
      .select()
      .from(movementLogs)
      .where(and(eq(movementLogs.id, movementId), eq(movementLogs.itemId, itemId), eq(movementLogs.purpose, 'pinjam')))
      .limit(1);

    if (!movement) throw new ApiError(404, 'NOT_FOUND', 'Rekod pinjaman tidak dijumpai');
    if (movement.returnedDate) throw new ApiError(400, 'BUSINESS_RULE', 'Barang ini sudah dipulangkan');

    const [updatedRows] = await db.batch([
      db
        .update(movementLogs)
        .set({
          returnedDate: body.returnedDate,
          returnCondition: body.returnCondition ?? null,
          notes: body.notes ? `${movement.notes ? movement.notes + '\n' : ''}Pulangan: ${body.notes}` : movement.notes,
        })
        .where(and(eq(movementLogs.id, movementId), isNull(movementLogs.returnedDate)))
        .returning(),
      db.update(items).set({ status: 'aktif', updatedAt: new Date() }).where(eq(items.id, itemId)),
      db.insert(activityLogs).values({
        actorUserId: session.user.id,
        action: 'movement.return',
        entityType: 'item',
        entityId: String(itemId),
        changes: {
          before: { itemStatus: item.status, movementReturnedDate: movement.returnedDate },
          after: { returnedDate: body.returnedDate, returnCondition: body.returnCondition ?? null, notes: body.notes ?? null, itemStatus: 'aktif' },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      }),
    ]);

    const updated = updatedRows[0];
    if (!updated) throw new ApiError(409, 'CONFLICT', 'Rekod pinjaman telah dikemaskini. Sila muat semula.');
    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
