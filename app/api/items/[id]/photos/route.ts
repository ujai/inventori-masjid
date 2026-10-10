import type { NextRequest } from 'next/server';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { attachments, activityLogs } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { isAllowedPhotoType, MAX_PHOTO_BYTES, MAX_PHOTOS_PER_ITEM } from '@/lib/r2';

type RouteContext = { params: Promise<{ id: string }> };

const savePhotoInput = z.object({
  r2Key:     z.string().trim().min(1).max(500),
  fileName:  z.string().trim().min(1).max(200),
  mimeType:  z.string().trim().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive(),
});

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const rows = await db
      .select({
        id:        attachments.id,
        r2Key:     attachments.r2Key,
        fileName:  attachments.fileName,
        mimeType:  attachments.mimeType,
        sizeBytes: attachments.sizeBytes,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(and(eq(attachments.itemId, itemId), eq(attachments.kind, 'photo')))
      .orderBy(attachments.createdAt);

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const itemId  = parseRouteId((await ctx.params).id);

    const body = savePhotoInput.parse(await req.json());

    // Validate the r2Key was issued by our presign endpoint for this item
    if (body.r2Key.includes('..') || !body.r2Key.startsWith(`photos/${itemId}/`)) {
      throw new ApiError(400, 'INVALID_KEY', 'Kunci fail tidak sah untuk barang ini');
    }

    // Server-side re-validation of mime and size
    if (!isAllowedPhotoType(body.mimeType)) {
      throw new ApiError(400, 'INVALID_FILE_TYPE', 'Jenis fail tidak sah');
    }
    if (body.sizeBytes > MAX_PHOTO_BYTES) {
      throw new ApiError(400, 'FILE_TOO_LARGE', 'Fail terlalu besar');
    }

    // Re-check limit (race condition guard)
    const [row] = await db
      .select({ n: count() })
      .from(attachments)
      .where(and(eq(attachments.itemId, itemId), eq(attachments.kind, 'photo')));

    if ((row?.n ?? 0) >= MAX_PHOTOS_PER_ITEM) {
      throw new ApiError(400, 'LIMIT_REACHED', `Had maksimum ${MAX_PHOTOS_PER_ITEM} foto telah dicapai.`);
    }

    const [created] = await db
      .insert(attachments)
      .values({
        itemId,
        kind:       'photo',
        r2Key:      body.r2Key,
        fileName:   body.fileName,
        mimeType:   body.mimeType,
        sizeBytes:  body.sizeBytes,
        uploadedBy: session.user.id,
      })
      .returning();

    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal menyimpan foto');

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action:      'photo.upload',
      entityType:  'item',
      entityId:    String(itemId),
      changes:     { after: { fileName: body.fileName, sizeBytes: body.sizeBytes } },
      ipAddress:   req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
