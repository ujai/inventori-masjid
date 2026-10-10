import type { NextRequest } from 'next/server';
import { aliasedTable, and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { activityLogs, items, locations, movementLogs, user } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { createMovementInput } from '@/lib/validators/movements';

type RouteContext = { params: Promise<{ id: string }> };

const fromLocations = aliasedTable(locations, 'from_locations');
const toLocations = aliasedTable(locations, 'to_locations');

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    const rows = await db
      .select({
        id: movementLogs.id,
        itemId: movementLogs.itemId,
        quantityMoved: movementLogs.quantityMoved,
        purpose: movementLogs.purpose,
        borrowerName: movementLogs.borrowerName,
        expectedReturnDate: movementLogs.expectedReturnDate,
        returnedDate: movementLogs.returnedDate,
        notes: movementLogs.notes,
        createdAt: movementLogs.createdAt,
        fromLocation: { id: fromLocations.id, nameMs: fromLocations.nameMs },
        toLocation: { id: toLocations.id, nameMs: toLocations.nameMs },
        handler: { id: user.id, name: user.name, email: user.email },
      })
      .from(movementLogs)
      .leftJoin(fromLocations, eq(fromLocations.id, movementLogs.fromLocationId))
      .leftJoin(toLocations, eq(toLocations.id, movementLogs.toLocationId))
      .leftJoin(user, eq(user.id, movementLogs.handledBy))
      .where(eq(movementLogs.itemId, itemId))
      .orderBy(desc(movementLogs.createdAt));

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const body = createMovementInput.parse(await req.json());

    const [existing] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');
    if (existing.status === 'dilupuskan' || existing.status === 'hilang') {
      throw new ApiError(400, 'BUSINESS_RULE', 'Barang yang telah dilupuskan/hilang tidak boleh dipindah/dipinjam');
    }
    if (existing.status === 'dipinjam') {
      throw new ApiError(400, 'BUSINESS_RULE', 'Barang ini sedang dipinjam. Sila pulangkan dahulu sebelum rekod pergerakan baru.');
    }
    if (body.quantityMoved > existing.quantity) {
      throw new ApiError(400, 'BUSINESS_RULE', 'Kuantiti dipindah melebihi kuantiti barang');
    }

    const isTransfer = body.purpose === 'pindah_lokasi';
    const isBorrow = body.purpose === 'pinjam';

    if (isTransfer) {
      if (!body.toLocationId) throw new ApiError(400, 'BUSINESS_RULE', 'Lokasi baru diperlukan');
      if (body.toLocationId === existing.currentLocationId) {
        throw new ApiError(400, 'BUSINESS_RULE', 'Lokasi baru sama dengan lokasi semasa');
      }
      // Current schema tracks one current_location per item, not split stock.
      // To avoid hidden partial-location state, require full quantity transfer.
      if (body.quantityMoved !== existing.quantity) {
        throw new ApiError(400, 'BUSINESS_RULE', 'Pindah lokasi mesti melibatkan semua kuantiti barang ini');
      }
    }

    if (isBorrow) {
      if (existing.status !== 'aktif') {
        throw new ApiError(400, 'BUSINESS_RULE', 'Hanya barang berstatus aktif boleh dipinjam');
      }
      const [activeBorrow] = await db
        .select({ id: movementLogs.id })
        .from(movementLogs)
        .where(and(eq(movementLogs.itemId, itemId), eq(movementLogs.purpose, 'pinjam'), isNull(movementLogs.returnedDate)))
        .limit(1);
      if (activeBorrow) throw new ApiError(400, 'BUSINESS_RULE', 'Barang ini sudah mempunyai rekod pinjaman aktif');
    }

    if (body.toLocationId) {
      const [toLocation] = await db.select({ id: locations.id }).from(locations).where(eq(locations.id, body.toLocationId)).limit(1);
      if (!toLocation) throw new ApiError(400, 'BUSINESS_RULE', 'Lokasi tidak dijumpai');
    }

    const itemUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (isTransfer) itemUpdates.currentLocationId = body.toLocationId;
    if (isBorrow) itemUpdates.status = 'dipinjam';

    const [createdRows] = await db.batch([
      db
        .insert(movementLogs)
        .values({
          itemId,
          quantityMoved: body.quantityMoved,
          fromLocationId: existing.currentLocationId,
          toLocationId: body.toLocationId ?? null,
          purpose: body.purpose,
          borrowerName: body.borrowerName ?? null,
          expectedReturnDate: body.expectedReturnDate ?? null,
          notes: body.notes ?? null,
          handledBy: session.user.id,
        })
        .returning(),
      db.update(items).set(itemUpdates).where(eq(items.id, itemId)),
      db.insert(activityLogs).values({
        actorUserId: session.user.id,
        action: 'movement.create',
        entityType: 'item',
        entityId: String(itemId),
        changes: {
          before: { status: existing.status, currentLocationId: existing.currentLocationId },
          after: { movement: body, itemUpdates },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      }),
    ]);

    const created = createdRows[0];
    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal mencipta log pergerakan');
    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
