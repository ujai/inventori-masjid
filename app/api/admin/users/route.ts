import type { NextRequest } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/db/client';
import { user, activityLogs } from '@/db/schema';
import { requireAdmin } from '@/lib/api/guards';
import { handleError, ok, ApiError } from '@/lib/api/responses';
import { createUserInput } from '@/lib/validators/users';
import { sendInviteEmail } from '@/lib/notifications/email';

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.createdAt));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = createUserInput.parse(await req.json());

    // Check duplicate email up-front
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, body.email))
      .limit(1);
    if (existing) {
      throw new ApiError(409, 'CONFLICT', `Emel ${body.email} sudah didaftarkan`);
    }

    // Direct insert: no account/password row needed.
    // Better Auth links the Google account on first sign-in via accountLinking.trustedProviders.
    const inserted = await db
      .insert(user)
      .values({
        id: randomUUID(),
        name: body.name,
        email: body.email,
        role: body.role,
        phone: body.phone ?? null,
        active: true,
        emailVerified: false,
      })
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
      });
    const created = inserted[0];
    if (!created) {
      throw new ApiError(500, 'INTERNAL', 'Gagal mencipta pengguna');
    }

    // Activity log
    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'user.create',
      entityType: 'user',
      entityId: created.id,
      changes: {
        after: { name: body.name, email: body.email, role: body.role },
      },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    // Send invite email — informational only (no password)
    try {
      await sendInviteEmail({
        to: body.email,
        name: body.name,
        role: body.role,
      });
    } catch (emailErr) {
      console.error('Invite email failed (user still created):', emailErr);
    }

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
