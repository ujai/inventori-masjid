import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { attachments } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { presignGet } from '@/lib/r2';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession(); // any authenticated user may view audit docs

    const id = parseRouteId((await ctx.params).id);

    const [attachment] = await db
      .select({ id: attachments.id, r2Key: attachments.r2Key, fileName: attachments.fileName })
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    if (!attachment) throw new ApiError(404, 'NOT_FOUND', 'Lampiran tidak dijumpai');

    const url = await presignGet(attachment.r2Key);
    return ok({ url, fileName: attachment.fileName });
  } catch (err) {
    return handleError(err);
  }
}
