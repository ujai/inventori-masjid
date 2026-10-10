import type { NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { units, activityLogs } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { upsertUnitInput } from '@/lib/validators/master-data';

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(units).orderBy(asc(units.sortOrder), asc(units.nameMs));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = upsertUnitInput.parse(await req.json());

    const [existing] = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.code, body.code))
      .limit(1);
    if (existing) {
      throw new ApiError(409, 'CONFLICT', `Kod unit "${body.code}" sudah wujud`);
    }

    const inserted = await db.insert(units).values(body).returning();
    const created = inserted[0];
    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal mencipta unit');

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'unit.create',
      entityType: 'unit',
      entityId: String(created.id),
      changes: { after: created },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
