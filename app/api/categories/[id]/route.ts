import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, activityLogs } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { upsertCategoryInput } from '@/lib/validators/master-data';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const id = parseRouteId((await ctx.params).id);
    const body = upsertCategoryInput.partial().parse(await req.json());

    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Kategori tidak dijumpai');

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.code !== undefined) updates.code = body.code;
    if (body.nameMs !== undefined) updates.nameMs = body.nameMs;
    if (body.prefix !== undefined) updates.prefix = body.prefix;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'category.update',
      entityType: 'category',
      entityId: String(id),
      changes: { before: existing, after: updates },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
