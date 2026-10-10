import type { NextRequest } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { institutionalRoles, itemRoles, items } from '@/db/schema';
import { requireSession, parseRouteId } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';

type RouteContext = { params: Promise<{ id: string }> };

const putRolesInput = z.object({
  roleIds: z.array(z.coerce.number().int().positive()).max(20),
});

// GET — return current roles for an item
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const itemId = parseRouteId((await ctx.params).id);

    const rows = await db
      .select({ id: institutionalRoles.id, code: institutionalRoles.code, nameMs: institutionalRoles.nameMs })
      .from(itemRoles)
      .innerJoin(institutionalRoles, eq(institutionalRoles.id, itemRoles.roleId))
      .where(eq(itemRoles.itemId, itemId));

    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

// PUT — replace all roles atomically
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const itemId = parseRouteId((await ctx.params).id);
    const body = putRolesInput.parse(await req.json());

    const [item] = await db.select({ id: items.id }).from(items).where(eq(items.id, itemId)).limit(1);
    if (!item) throw new ApiError(404, 'NOT_FOUND', 'Barang tidak dijumpai');

    if (body.roleIds.length > 0) {
      const validRoles = await db
        .select({ id: institutionalRoles.id })
        .from(institutionalRoles)
        .where(inArray(institutionalRoles.id, body.roleIds));
      if (validRoles.length !== body.roleIds.length) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Satu atau lebih peranan tidak sah');
      }
    }

    // Replace atomically: batch delete + insert (neon-http doesn't support db.transaction())
    const deleteStmt = db.delete(itemRoles).where(eq(itemRoles.itemId, itemId));
    if (body.roleIds.length > 0) {
      await db.batch([
        deleteStmt,
        db.insert(itemRoles).values(body.roleIds.map((roleId) => ({ itemId, roleId }))),
      ]);
    } else {
      await deleteStmt;
    }

    return ok({ updated: body.roleIds.length });
  } catch (err) {
    return handleError(err);
  }
}
