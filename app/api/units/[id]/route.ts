import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { units, activityLogs } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { upsertUnitInput } from '@/lib/validators/master-data';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireSession();
    const id = parseRouteId((await ctx.params).id);
    const body = upsertUnitInput.partial().parse(await req.json());

    const [existing] = await db.select().from(units).where(eq(units.id, id)).limit(1);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Unit tidak dijumpai');

    const [updated] = await db
      .update(units)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(units.id, id))
      .returning();

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'unit.update',
      entityType: 'unit',
      entityId: String(id),
      changes: { before: existing, after: body },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}
