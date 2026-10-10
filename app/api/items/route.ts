import type { NextRequest } from 'next/server';
import { and, eq, ne, sql, asc, desc, count } from 'drizzle-orm';

import { db } from '@/db/client';
import { items, categories, locations, units, activityLogs, attachments } from '@/db/schema';
import { requireSession, requireAdmin } from '@/lib/api/guards';
import { ApiError, handleError, ok, paged, isUniqueViolation } from '@/lib/api/responses';
import { createItemInput, itemListQuery } from '@/lib/validators/items';
import { generateAssetCode } from '@/lib/repos/items';
import { isAllowedPhotoType, MAX_PHOTO_BYTES } from '@/lib/r2';
import { z } from 'zod';

// Each pending photo uploaded before item was saved
const pendingPhotoItem = z.object({
  pendingPhotoKey:       z.string().trim().min(1).max(500),
  pendingPhotoFileName:  z.string().trim().min(1).max(200).optional(),
  pendingPhotoMimeType:  z.string().trim().min(1).max(100),
  pendingPhotoSizeBytes: z.coerce.number().int().positive(),
});

const pendingPhotosInput = z.object({
  pendingPhotos: z.array(pendingPhotoItem).max(5).optional(),
}).optional();

export async function GET(req: NextRequest) {
  try {
    await requireSession();
    const params = itemListQuery.parse(Object.fromEntries(req.nextUrl.searchParams));

    const filters = [];
    if (params.q && params.q.trim() !== '') {
      const q = params.q.trim();
      const like = `%${q}%`;
      // Deterministic substring search only.
      // Fuzzy pg_trgm matching was removed because it returned poor relevance
      // for Malay inventory names (example: "periuk" matched air-conditioner first).
      filters.push(sql`(
        ${items.name} ILIKE ${like}
        OR ${items.assetCode} ILIKE ${like}
      )`);
    }
    if (params.categoryId) filters.push(eq(items.categoryId, params.categoryId));
    if (params.locationId) filters.push(eq(items.currentLocationId, params.locationId));
    if (params.status) filters.push(eq(items.status, params.status));
    if (params.condition) filters.push(eq(items.condition, params.condition));
    if (params.trackingMode) filters.push(eq(items.trackingMode, params.trackingMode));

    // Per client decision C3: hide disposed/lost by default
    if (!params.includeArchived) {
      filters.push(ne(items.status, 'dilupuskan'));
      filters.push(ne(items.status, 'hilang'));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderCol = params.sortBy === 'name' ? items.name :
      params.sortBy === 'createdAt' ? items.createdAt : items.updatedAt;
    const orderFn = params.sortOrder === 'asc' ? asc : desc;

    const [{ total }] = await db.select({ total: count() }).from(items).where(where) as [{ total: number }];

    const rows = await db
      .select({
        id: items.id,
        name: items.name,
        quantity: items.quantity,
        status: items.status,
        condition: items.condition,
        trackingMode: items.trackingMode,
        assetCode: items.assetCode,
        acquiredDate: items.acquiredDate,
        nextServiceDate: items.nextServiceDate,
        warrantyExpiry: items.warrantyExpiry,
        expectedLifespanYears: items.expectedLifespanYears,
        expiryDate: items.expiryDate,
        minimumQuantity: items.minimumQuantity,
        category: { id: categories.id, nameMs: categories.nameMs, prefix: categories.prefix },
        location: { id: locations.id, nameMs: locations.nameMs },
        unit: { id: units.id, nameMs: units.nameMs },
        updatedAt: items.updatedAt,
      })
      .from(items)
      .innerJoin(categories, eq(categories.id, items.categoryId))
      .innerJoin(locations, eq(locations.id, items.currentLocationId))
      .innerJoin(units, eq(units.id, items.unitId))
      .where(where)
      .orderBy(orderFn(orderCol))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize);

    return paged(rows, params.page, params.pageSize, total);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const rawBody = await req.json();
    const body    = createItemInput.parse(rawBody);
    const extra   = pendingPhotosInput.parse(rawBody);

    // Auto-generate asset code if tracking_mode='asset' and not provided
    let assetCode = body.assetCode ?? null;
    if (body.trackingMode === 'asset' && !assetCode) {
      const [cat] = await db
        .select({ prefix: categories.prefix })
        .from(categories)
        .where(eq(categories.id, body.categoryId))
        .limit(1);
      if (!cat) throw new ApiError(400, 'BUSINESS_RULE', 'Kategori tidak dijumpai');
      assetCode = await generateAssetCode(cat.prefix);
    }

    let inserted;
    try {
      inserted = await db
        .insert(items)
        .values({
          name: body.name,
          categoryId: body.categoryId,
          unitId: body.unitId,
          quantity: body.quantity,
          currentLocationId: body.currentLocationId,
          status: body.status,
          notes: body.notes ?? null,
          trackingMode: body.trackingMode,
          assetCode,
          acquiredDate: body.acquiredDate ?? null,
          price: body.price !== undefined ? String(body.price) : null,
          acquisitionMethod: body.acquisitionMethod ?? null,
          supplier: body.supplier ?? null,
          receiptReference: body.receiptReference ?? null,
          expiryDate: body.expiryDate ?? null,
          condition: body.condition ?? null,
          maintenanceNotes: body.maintenanceNotes ?? null,
          warrantyExpiry: body.warrantyExpiry ?? null,
          expectedLifespanYears: body.expectedLifespanYears ?? null,
          maintenanceIntervalDays: body.maintenanceIntervalDays ?? null,
          minimumQuantity: body.minimumQuantity ?? null,
          createdBy: session.user.id,
        })
        .returning();
    } catch (err) {
      if (isUniqueViolation(err, 'items_asset_code_unique')) {
        throw new ApiError(409, 'DUPLICATE_ASSET_CODE', 'Kod aset sudah digunakan. Sila cuba lagi atau masukkan kod lain.');
      }
      throw err;
    }
    const created = inserted[0];
    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal mencipta barang');

    // Save any photos uploaded during create (key must come from our presign flow)
    const validPendingKey = (k: string) => k.startsWith('photos/');
    const photosToSave = (extra?.pendingPhotos ?? []).filter(
      (p) => validPendingKey(p.pendingPhotoKey) &&
             isAllowedPhotoType(p.pendingPhotoMimeType) &&
             p.pendingPhotoSizeBytes <= MAX_PHOTO_BYTES,
    );
    if (photosToSave.length > 0) {
      await db.insert(attachments).values(
        photosToSave.map((p) => ({
          itemId:     created.id,
          kind:       'photo' as const,
          r2Key:      p.pendingPhotoKey,
          fileName:   p.pendingPhotoFileName ?? null,
          mimeType:   p.pendingPhotoMimeType,
          sizeBytes:  p.pendingPhotoSizeBytes,
          uploadedBy: session.user.id,
        })),
      ).catch((e) => console.error('Failed to save pending photos:', e));
    }

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'item.create',
      entityType: 'item',
      entityId: String(created.id),
      changes: { after: { name: created.name, assetCode: created.assetCode, status: created.status } },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
