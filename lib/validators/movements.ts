import { z } from 'zod';
import { optionalDateString } from './shared';

const requiredDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarikh tidak sah (YYYY-MM-DD)');

const optionalString = (max = 1000) =>
  z.string().trim().max(max).optional().transform((v) => (v === '' ? undefined : v));

export const movementPurpose = z.enum([
  'pinjam',
  'pindah_lokasi',
  'kenduri',
  'kelas',
  'qurban',
  'lain',
]);

export const createMovementInput = z
  .object({
    purpose: movementPurpose,
    quantityMoved: z.coerce.number().int().positive('Kuantiti mesti lebih daripada 0'),
    toLocationId: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
    borrowerName: optionalString(200),
    expectedReturnDate: optionalDateString.optional(),
    notes: optionalString(1000),
  })
  .superRefine((v, ctx) => {
    if (v.purpose === 'pindah_lokasi' && !v.toLocationId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['toLocationId'], message: 'Lokasi baru diperlukan' });
    }
    if (v.purpose === 'pinjam' && !v.borrowerName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['borrowerName'], message: 'Nama peminjam diperlukan' });
    }
  });

export const returnMovementInput = z.object({
  returnedDate: requiredDateString,
  returnCondition: z.enum(['baik', 'sederhana', 'rosak']).optional(),
  notes: optionalString(1000),
});

export type CreateMovementInput = z.infer<typeof createMovementInput>;
export type ReturnMovementInput = z.infer<typeof returnMovementInput>;
