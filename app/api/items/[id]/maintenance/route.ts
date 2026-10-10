import type { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { activityLogs, items, maintenanceLogs, user } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { createMaintenanceLogInput } from '@/lib/validators/maintenance';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    const rows = await db
      .select({
        id: maintenanceLogs.id,
        itemId: maintenanceLogs.itemId,
        serviceDate: maintenanceLogs.serviceDate,
        nextServiceDate: maintenanceLogs.nextServiceDate,
        conditionBefore: maintenanceLogs.conditionBefore,
        conditionAfter: maintenanceLogs.conditionAfter,
        cost: maintenanceLogs.cost,
        notes: maintenanceLogs.notes,
        createdAt: maintenanceLogs.createdAt,
        performer: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(maintenanceLogs)
      .leftJoin(user, eq(user.id, maintenanceLogs.performedBy))
      .where(eq(maintenanceLogs.itemId, itemId))
      .orderBy(desc(maintenanceLogs.serviceDate), desc(maintenanceLogs.createdAt));

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const body = createMaintenanceLogInput.parse(await req.json());

    const [existing] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');
    if (existing.status === 'dilupuskan' || existing.status === 'hilang') {
      throw new ApiError(400, 'BUSINESS_RULE', 'Barang yang telah dilupuskan/hilang tidak boleh diservis');
    }

    const itemUpdates: Record<string, unknown> = {
      lastServiceDate: body.serviceDate,
      updatedAt: new Date(),
    };
    if (body.nextServiceDate !== undefined) itemUpdates.nextServiceDate = body.nextServiceDate ?? null;
    if (body.conditionAfter !== undefined) itemUpdates.condition = body.conditionAfter ?? null;
    if (body.statusAfter !== undefined) itemUpdates.status = body.statusAfter;

    // Neon HTTP driver does not support db.transaction(). Use db.batch(),
    // which Neon executes as a single transaction.
    const [createdRows] = await db.batch([
      db
        .insert(maintenanceLogs)
        .values({
          itemId,
          serviceDate: body.serviceDate,
          nextServiceDate: body.nextServiceDate ?? null,
          conditionBefore: body.conditionBefore ?? existing.condition,
          conditionAfter: body.conditionAfter ?? null,
          cost: body.cost !== undefined ? String(body.cost) : null,
          notes: body.notes ?? null,
          performedBy: session.user.id,
        })
        .returning(),
      db.update(items).set(itemUpdates).where(eq(items.id, itemId)),
      db.insert(activityLogs).values({
        actorUserId: session.user.id,
        action: 'maintenance.create',
        entityType: 'item',
        entityId: String(itemId),
        changes: {
          before: {
            itemStatus: existing.status,
            condition: existing.condition,
            lastServiceDate: existing.lastServiceDate,
            nextServiceDate: existing.nextServiceDate,
          },
          after: {
            serviceDate: body.serviceDate,
            nextServiceDate: body.nextServiceDate ?? null,
            conditionBefore: body.conditionBefore ?? existing.condition,
            conditionAfter: body.conditionAfter ?? null,
            cost: body.cost ?? null,
            notes: body.notes ?? null,
            itemUpdates,
          },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      }),
    ]);

    const created = createdRows[0];
    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal mencipta log servis');

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
