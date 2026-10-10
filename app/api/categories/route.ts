import type { NextRequest } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { categories, activityLogs } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { upsertCategoryInput } from '@/lib/validators/master-data';

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameMs));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = upsertCategoryInput.parse(await req.json());

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.code, body.code))
      .limit(1);
    if (existing) {
      throw new ApiError(409, 'CONFLICT', `Kod kategori "${body.code}" sudah wujud`);
    }

    const inserted = await db
      .insert(categories)
      .values({
        code: body.code,
        nameMs: body.nameMs,
        prefix: body.prefix,
        description: body.description ?? null,
        sortOrder: body.sortOrder,
      })
      .returning();
    const created = inserted[0];
    if (!created) throw new ApiError(500, 'INTERNAL', 'Gagal mencipta kategori');

    await db.insert(activityLogs).values({
      actorUserId: session.user.id,
      action: 'category.create',
      entityType: 'category',
      entityId: String(created.id),
      changes: { after: created },
      ipAddress: req.headers.get('x-forwarded-for') ?? null,
    });

    return ok(created, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
