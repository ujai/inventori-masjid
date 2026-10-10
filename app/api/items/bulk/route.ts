import type { NextRequest } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { activityLogs, items, locations } from '@/db/schema';
import { requireSession } from '@/lib/api/guards';
import { ApiError, handleError, ok } from '@/lib/api/responses';
import { itemStatus } from '@/lib/validators/items';

// dilupuskan/hilang must go through their dedicated endpoints (audit trail).
// dipinjam must go through the movement log endpoint (audit trail + borrower tracking).
const BULK_BLOCKED_STATUSES = new Set(['dilupuskan', 'hilang', 'dipinjam']);

const bulkUpdateInput = z
  .object({
    ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
    action: z.enum(['status', 'location']),
    value: z.string().trim().min(1),
  })
  .superRefine((v, ctx) => {
    if (v.action === 'status') {
      if (BULK_BLOCKED_STATUSES.has(v.value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ['value'],
          message: "Status ini mesti ditetapkan melalui endpoint khas (pergerakan/pelupusan/kehilangan)",
        });
        return;
      }
      const parsed = itemStatus.safeParse(v.value);
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Status tidak sah' });
      }
    } else {
      const n = Number(v.value);
      if (!Number.isFinite(n) || n < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'ID lokasi tidak sah' });
      }
    }
  });

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = bulkUpdateInput.parse(await req.json());

    // Validate location exists before touching any rows (M6)
    if (body.action === 'location') {
      const locationId = Number(body.value);
      const [loc] = await db.select({ id: locations.id }).from(locations).where(eq(locations.id, locationId)).limit(1);
      if (!loc) throw new ApiError(400, 'VALIDATION_ERROR', 'Lokasi tidak dijumpai');
    }

    const updateFields =
      body.action === 'status'
        ? { status: body.value as z.infer<typeof itemStatus>, updatedAt: new Date() }
        : { currentLocationId: Number(body.value), updatedAt: new Date() };

    const updated = await db
      .update(items)
      .set(updateFields)
      .where(inArray(items.id, body.ids))
      .returning({ id: items.id });

    if (updated.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Tiada barang dikemaskini');

    // Log one activity entry per updated item so the audit feed links work correctly (M5)
    await db.insert(activityLogs).values(
      updated.map(({ id }) => ({
        actorUserId: session.user.id,
        action: 'item.update' as const,
        entityType: 'item',
        entityId: String(id),
        changes: {
          before: null,
          after: { bulkAction: body.action, value: body.value },
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
      })),
    );

    return ok({ updated: updated.length });
  } catch (err) {
    return handleError(err);
  }
}
