import type { NextRequest } from 'next/server';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { attachments } from '@/db/schema';
import { requireAdmin, requireSession } from '@/lib/api/guards';
import { handleError, ok, ApiError } from '@/lib/api/responses';
import {
  isAllowedDocumentType,
  isAllowedPhotoType,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS_PER_ITEM,
  photoKey,
  photoKeyPending,
  policeReportKey,
  presignPut,
} from '@/lib/r2';

const presignInput = z.object({
  // itemId=0 is valid for new items (photo uploaded before item is saved)
  itemId:    z.coerce.number().int().min(0),
  kind:      z.enum(['photo', 'police_report']),
  mimeType:  z.string().trim().min(1),
  sizeBytes: z.coerce.number().int().positive(),
  fileName:  z.string().trim().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    // Auth before parsing body — prevents unauthenticated body parsing
    // We do a lightweight session check first, then re-check role per kind below.
    await requireSession();

    const body = presignInput.parse(await req.json());

    if (body.kind === 'police_report') {
      await requireAdmin(); // escalate to admin check
      if (!isAllowedDocumentType(body.mimeType)) {
        throw new ApiError(400, 'INVALID_FILE_TYPE', 'Hanya PDF, JPG, atau PNG dibenarkan untuk laporan polis.');
      }
      if (body.sizeBytes > MAX_DOCUMENT_BYTES) {
        throw new ApiError(400, 'FILE_TOO_LARGE', 'Fail terlalu besar. Had maksimum 10MB.');
      }
      const key        = policeReportKey(body.itemId, body.mimeType);
      const presignUrl = await presignPut(key, body.mimeType);
      return ok({ key, presignUrl });
    }

    // kind === 'photo' — AJK and admin (session already verified above)
    if (!isAllowedPhotoType(body.mimeType)) {
      throw new ApiError(400, 'INVALID_FILE_TYPE', 'Hanya JPG atau PNG dibenarkan untuk foto.');
    }
    if (body.sizeBytes > MAX_PHOTO_BYTES) {
      throw new ApiError(400, 'FILE_TOO_LARGE', 'Foto terlalu besar. Had maksimum 2MB.');
    }

    // itemId=0 means a new item (not yet saved) — skip limit check, use pending key
    if (body.itemId === 0) {
      const key        = photoKeyPending(body.mimeType);
      const presignUrl = await presignPut(key, body.mimeType);
      return ok({ key, presignUrl });
    }

    // Existing item — enforce 5-photo limit before issuing upload URL
    const [row] = await db
      .select({ n: count() })
      .from(attachments)
      .where(and(eq(attachments.itemId, body.itemId), eq(attachments.kind, 'photo')));

    if ((row?.n ?? 0) >= MAX_PHOTOS_PER_ITEM) {
      throw new ApiError(400, 'LIMIT_REACHED', `Had maksimum ${MAX_PHOTOS_PER_ITEM} foto setiap barang telah dicapai.`);
    }

    const key        = photoKey(body.itemId, body.mimeType);
    const presignUrl = await presignPut(key, body.mimeType);
    return ok({ key, presignUrl });
  } catch (err) {
    return handleError(err);
  }
}
