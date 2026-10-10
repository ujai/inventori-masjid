import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { user, activityLogs } from '@/db/schema';
import { requireAdmin } from '@/lib/api/guards';
import { handleError, ok, ApiError, noContent } from '@/lib/api/responses';
import { updateUserInput } from '@/lib/validators/users';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;
    const body = updateUserInput.parse(await req.json());

    const [existing] = await db
      .select({
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        active: user.active,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!existing) {
      throw new ApiError(404, 'NOT_FOUND', 'Pengguna tidak dijumpai');
    }

    // Self-protection: an admin cannot demote or deactivate themselves
    if (session.user.id === id) {
      if (body.role && body.role !== 'admin') {
        throw new ApiError(400, 'BUSINESS_RULE', 'Anda tidak boleh menukar role anda sendiri');
      }
      if (body.active === false) {
        throw new ApiError(400, 'BUSINESS_RULE', 'Anda tidak boleh menyahaktifkan akaun anda sendiri');
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.role !== undefined) updates.role = body.role;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.active !== undefined) updates.active = body.active;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(user)
      .set(updates)
      .where(eq(user.id, id))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
      });

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'user.update',
      entityType: 'user',
      entityId: id,
      changes: { before: existing, after: updates },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  // Soft delete via active=false (per client decision: deletion is admin-only and we don't truly delete)
  try {
    const session = await requireAdmin();
    const { id } = await ctx.params;

    if (session.user.id === id) {
      throw new ApiError(400, 'BUSINESS_RULE', 'Anda tidak boleh menyahaktifkan akaun anda sendiri');
    }

    const [updated] = await db
      .update(user)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning({ id: user.id });

    if (!updated) {
      throw new ApiError(404, 'NOT_FOUND', 'Pengguna tidak dijumpai');
    }

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'user.deactivate',
      entityType: 'user',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
