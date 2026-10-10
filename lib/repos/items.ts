/**
 * Item repository helpers — encapsulate query patterns that we don't want to
 * duplicate across route handlers.
 */

import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { items } from '@/db/schema';

/**
 * Generate the next sequential asset code for a given category prefix.
 * Format: `{PREFIX}-{NNNN}` (4-digit zero-padded).
 *
 * Race-condition note: at masjid scale (1-3 admins, occasional inserts) the
 * read-then-insert race is negligible. The `asset_code` UNIQUE constraint
 * provides a hard backstop. Caller can retry on 23505 (unique violation).
 */
export async function generateAssetCode(prefix: string): Promise<string> {
  const [row] = await db
    .select({
      next: sql<number>`
        COALESCE(
          MAX(CAST(SUBSTRING(${items.assetCode} FROM '[0-9]+$') AS INTEGER)),
          0
        ) + 1
      `,
    })
    .from(items)
    .where(sql`${items.assetCode} LIKE ${prefix + '-%'}`);

  const next = Number(row?.next ?? 1);
  return `${prefix}-${String(next).padStart(4, '0')}`;
}
