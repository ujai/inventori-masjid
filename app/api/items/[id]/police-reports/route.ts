/**
 * Save police report attachments (PDF / JPG / PNG) uploaded to R2.
 * Admin-only — matches the police report upload presign check.
 */
import type { NextRequest } from 'next/server';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { activityLogs, attachments } from '@/db/schema';
import { requireAdmin, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { isAllowedDocumentType, MAX_DOCUMENT_BYTES } from '@/lib/r2';

type RouteContext = { params: Promise<{ id: string }> };

const MAX_POLICE_REPORTS = 5;

const saveInput = z.object({
  r2Key:     z.string().trim().min(1).max(500),
  fileName:  z.string().trim().min(1).max(200),
  mimeType:  z.string().trim().min(1).max(100),
  sizeBytes: z.coerce.number().int().positive(),
});

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const itemId  = parseRouteId((await ctx.params).id);

    const body = saveInput.parse(await req.json());

    // Validate the r2Key was issued by our presign endpoint for this item
    if (body.r2Key.includes('..') || !body.r2Key.startsWith(`police-reports/${itemId}/`)) {
      throw new ApiError(400, 'INVALID_KEY', 'Kunci fail tidak sah untuk barang ini');
    }

    if (!isAllowedDocumentType(body.mimeType)) throw new ApiError(400, 'INVALID_FILE_TYPE', 'Jenis fail tidak sah');
    if (body.sizeBytes > MAX_DOCUMENT_BYTES) throw new ApiError(400, 'FILE_TOO_LARGE', 'Fail terlalu besar');

    // Guard: max 5 police report files per item
    const [row] = await db
      .select({ n: count() })
      .from(attachments)
      .where(and(eq(attachments.itemId, itemId), eq(attachments.kind, 'police_report')));

    if ((row?.n ?? 0) >= MAX_POLICE_REPORTS) {
      throw new ApiError(400, 'LIMIT_REACHED', `Had maksimum ${MAX_POLICE_REPORTS} fail laporan polis telah dicapai.`);
    }

    const [created] = await db
      .insert(attachments)
      .values({
        itemId,
        kind:       'police_report',
        r2Key:      body.r2Key,
        fileName:   body.fileName,
        mimeType:   body.mimeType,
        sizeBytes:  body.sizeBytes,
        uploadedBy: session.user.id,
      })
      .returning();

    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal menyimpan fail');

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action:      'police_report.upload',
      entityType:  'item',
      entityId:    String(itemId),
      changes:     { after: { fileName: body.fileName } },
      ipAddress:   req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
