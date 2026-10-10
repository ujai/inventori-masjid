import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { activityLogs, attachments } from '@/db/schema';
import { requireAdmin, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, noContent } from '@/lib/api/responses';
import { deleteObject } from '@/lib/r2';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const id = parseRouteId((await ctx.params).id);

    const [attachment] = await db
      .select({ id: attachments.id, r2Key: attachments.r2Key, itemId: attachments.itemId, kind: attachments.kind })
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    if (!attachment) throw new ApiError(404, 'NOT_FOUND', 'Lampiran tidak dijumpai');

    // Delete from R2 first, then DB record
    await deleteObject(attachment.r2Key);

    await db.batch([
      db.delete(attachments).where(eq(attachments.id, id)),
      db.insert(activityLogs).values({
        actorUserId: session.user.id,
        action:      `${attachment.kind}.delete`,
        entityType:  'item',
        entityId:    String(attachment.itemId),
        changes:     { before: { r2Key: attachment.r2Key, kind: attachment.kind } },
        ipAddress:   req.headers.get('x-forwarded-for') ?? null,
      }),
    ]);

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
