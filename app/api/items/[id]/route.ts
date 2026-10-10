import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { items, activityLogs } from '@/db/schema';
import { requireSession, requireAdmin, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok, noContent } from '@/lib/api/responses';
import { updateItemInput } from '@/lib/validators/items';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const id = parseRouteId((await ctx.params).id);

    const item = await db.query.items.findFirst({
      where: eq(items.id, id),
      with: {
        category: true,
        location: true,
        unit: true,
        responsible: true,
        creator: true,
        attachments: true,
      },
    });
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');
    return ok(item);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const id = parseRouteId((await ctx.params).id);
    const body = updateItemInput.parse(await req.json());

    // SEC: status transitions to terminal states must go through their dedicated endpoints
    if (body.status === 'dilupuskan' || body.status === 'hilang') {
      throw new ApiError(
        422,
        'BUSINESS_RULE',
        `Status '${body.status}' mesti ditetapkan melalui endpoint pelupusan. Sila gunakan /api/items/${id}/disposal.`,
      );
    }

    const [existing] = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    if (body.unitId !== undefined) updates.unitId = body.unitId;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.currentLocationId !== undefined) updates.currentLocationId = body.currentLocationId;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes ?? null;
    if (body.trackingMode !== undefined) updates.trackingMode = body.trackingMode;
    if (body.assetCode !== undefined) updates.assetCode = body.assetCode ?? null;
    if (body.acquiredDate !== undefined) updates.acquiredDate = body.acquiredDate ?? null;
    if (body.price !== undefined) updates.price = String(body.price);
    if (body.acquisitionMethod !== undefined) updates.acquisitionMethod = body.acquisitionMethod ?? null;
    if (body.supplier !== undefined) updates.supplier = body.supplier ?? null;
    if (body.receiptReference !== undefined) updates.receiptReference = body.receiptReference ?? null;
    if (body.expiryDate !== undefined) updates.expiryDate = body.expiryDate ?? null;
    if (body.condition !== undefined) updates.condition = body.condition ?? null;
    if (body.maintenanceNotes !== undefined) updates.maintenanceNotes = body.maintenanceNotes ?? null;
    if (body.warrantyExpiry !== undefined) updates.warrantyExpiry = body.warrantyExpiry ?? null;
    if (body.expectedLifespanYears !== undefined) updates.expectedLifespanYears = body.expectedLifespanYears ?? null;
    if (body.maintenanceIntervalDays !== undefined) updates.maintenanceIntervalDays = body.maintenanceIntervalDays ?? null;
    if (body.minimumQuantity !== undefined) updates.minimumQuantity = body.minimumQuantity ?? null;

    const [updated] = await db.update(items).set(updates).where(eq(items.id, id)).returning();

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'item.update',
      entityType: 'item',
      entityId: String(id),
      changes: { before: existing, after: updates },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  // Admin-only soft delete via status='dilupuskan'
  try {
    const session = await requireAdmin();
    const id = parseRouteId((await ctx.params).id);

    const [updated] = await db
      .update(items)
      .set({ status: 'dilupuskan', updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning({ id: items.id });

    if (!updated) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'item.delete',
      entityType: 'item',
      entityId: String(id),
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
