import type { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { activityLogs, attachments, disposalLogs, items, user } from '@/db/schema';
import { requireAdmin, requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { createDisposalInput } from '@/lib/validators/disposal';
import { deleteObject, isAllowedDocumentType, MAX_DOCUMENT_BYTES } from '@/lib/r2';

// Optional police report attachment fields sent after presigned upload completes
const attachmentFields = z.object({
  policeReportKey:      z.string().trim().min(1).max(500).optional(),
  policeReportFileName: z.string().trim().min(1).max(200).optional(),
  policeReportMimeType: z.string().trim().min(1).max(100).optional(),
  policeReportSizeBytes: z.coerce.number().int().positive().optional(),
}).optional();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    const rows = await db
      .select({
        id: disposalLogs.id,
        disposalDate: disposalLogs.disposalDate,
        reason: disposalLogs.reason,
        quantityDisposed: disposalLogs.quantityDisposed,
        policeReportReference: disposalLogs.policeReportReference,
        policeReportAttachmentId: disposalLogs.policeReportAttachmentId,
        saleAmount: disposalLogs.saleAmount,
        buyer: disposalLogs.buyer,
        notes: disposalLogs.notes,
        createdAt: disposalLogs.createdAt,
        recorderName: user.name,
      })
      .from(disposalLogs)
      .leftJoin(user, eq(user.id, disposalLogs.recordedBy))
      .where(eq(disposalLogs.itemId, itemId))
      .orderBy(desc(disposalLogs.createdAt));

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const itemId = parseRouteId((await ctx.params).id);

    const rawBody = await req.json();
    const body = createDisposalInput.parse(rawBody);
    const attach = attachmentFields.parse(rawBody);

    // Validate attachment fields if present
    if (attach?.policeReportKey) {
      if (!attach.policeReportMimeType || !isAllowedDocumentType(attach.policeReportMimeType)) {
        throw new ApiError(400, 'INVALID_FILE_TYPE', 'Jenis fail tidak sah');
      }
      if (!attach.policeReportSizeBytes || attach.policeReportSizeBytes > MAX_DOCUMENT_BYTES) {
        throw new ApiError(400, 'FILE_TOO_LARGE', 'Fail terlalu besar');
      }
    }

    const [existing] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');
    if (existing.status === 'dilupuskan' || existing.status === 'hilang') {
      throw new ApiError(400, 'BUSINESS_RULE', 'Barang ini sudah dilupuskan/hilang');
    }
    if (existing.status === 'dipinjam') {
      throw new ApiError(400, 'BUSINESS_RULE', 'Barang sedang dipinjam. Pulangkan dahulu sebelum lupuskan.');
    }
    if (body.quantityDisposed > existing.quantity) {
      throw new ApiError(400, 'BUSINESS_RULE', 'Kuantiti dilupuskan melebihi kuantiti barang');
    }

    const isLost = body.reason === 'hilang' || body.reason === 'dicuri';
    const newStatus = isLost ? 'hilang' : 'dilupuskan';
    const remainingQty = existing.quantity - body.quantityDisposed;

    const itemUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (remainingQty === 0) itemUpdates.status = newStatus;
    else itemUpdates.quantity = remainingQty;

    // Step 1: Insert attachment record first (if a file was uploaded)
    let attachmentId: number | null = null;
    if (attach?.policeReportKey && attach.policeReportMimeType && attach.policeReportSizeBytes) {
      const [insertedAttachment] = await db
        .insert(attachments)
        .values({
          itemId,
          kind: 'police_report',
          r2Key: attach.policeReportKey,
          fileName: attach.policeReportFileName ?? 'laporan-polis',
          mimeType: attach.policeReportMimeType,
          sizeBytes: attach.policeReportSizeBytes,
          uploadedBy: session.user.id,
        })
        .returning({ id: attachments.id });

      if (!insertedAttachment) {
        // Attachment DB insert failed — clean up the orphaned R2 object
        await deleteObject(attach.policeReportKey).catch(() => null);
        throw new ApiError(500, 'INTERNAL', 'Gagal menyimpan lampiran');
      }
      attachmentId = insertedAttachment.id;
    }

    // Step 2: batch disposal log + item update + audit log
    const [createdRows] = await db.batch([
      db
        .insert(disposalLogs)
        .values({
          itemId,
          disposalDate: body.disposalDate,
          reason: body.reason,
          quantityDisposed: body.quantityDisposed,
          policeReportReference: body.policeReportReference ?? null,
          policeReportAttachmentId: attachmentId,
          saleAmount: body.saleAmount !== undefined ? String(body.saleAmount) : null,
          buyer: body.buyer ?? null,
          notes: body.notes ?? null,
          recordedBy: session.user.id,
        })
        .returning(),
      db.update(items).set(itemUpdates).where(eq(items.id, itemId)),
      db.insert(activityLogs).values({
        actorUserId: session.user.id,
        action: 'disposal.create',
        entityType: 'item',
        entityId: String(itemId),
        changes: {
          before: { status: existing.status, quantity: existing.quantity },
          after: { reason: body.reason, quantityDisposed: body.quantityDisposed, remainingQty, itemUpdates, attachmentId },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      }),
    ]);

    const created = createdRows[0];
    if (!created) {
      // DB batch failed — clean up orphaned R2 object if one was uploaded
      if (attach?.policeReportKey) await deleteObject(attach.policeReportKey).catch(() => null);
      throw new ApiError(500, 'INTERNAL', 'Gagal mencipta log pelupusan');
    }

    return ok({ ...created, policeReportAttachmentId: attachmentId }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
