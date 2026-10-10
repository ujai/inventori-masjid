import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { locations } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { handleError, ok } from '@/lib/api/responses';

// Locations are READ-ONLY (per client decision B1 — locked at setup).
// To add or rename, edit db/seed.ts and apply via migration.
export async function GET() {
  try {
    await requireSession();
    const rows = await db
      .select()
      .from(locations)
      .orderBy(asc(locations.sortOrder), asc(locations.nameMs));
    return ok(rows);
  } catch (err) {
    return handleError(err);
  }
}
