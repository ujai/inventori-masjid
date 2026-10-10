import { asc } from 'drizzle-orm';

import { db } from '@/db/client';
import { institutionalRoles } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';

export async function GET() {
  try {
    await requireSession();
    const roles = await db
      .select({ id: institutionalRoles.id, code: institutionalRoles.code, nameMs: institutionalRoles.nameMs })
      .from(institutionalRoles)
      .orderBy(asc(institutionalRoles.sortOrder), asc(institutionalRoles.nameMs));
    return ok(roles);
  } catch (err) {
    return handleError(err);
  }
}
