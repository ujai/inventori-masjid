import { z } from 'zod';
import { malaysianMoney } from './shared';

const requiredDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarikh tidak sah (YYYY-MM-DD)');

const optionalString = (max = 1000) =>
  z.string().trim().max(max).optional().transform((v) => (v === '' ? undefined : v));

export const disposalReason = z.enum([
  'rosak_total',
  'dijual_besi_buruk',
  'dijual_terpakai',
  'sumbangan_keluar',
  'hilang',
  'dicuri',
  'lain_lain',
]);

export const createDisposalInput = z
  .object({
    disposalDate: requiredDateString,
    reason: disposalReason,
    quantityDisposed: z.coerce.number().int().positive('Kuantiti mesti lebih daripada 0'),
    policeReportReference: optionalString(200),
    saleAmount: malaysianMoney('Jumlah'),
    buyer: optionalString(200),
    notes: optionalString(2000),
  })
  .superRefine((v, ctx) => {
    const requiresPolice = v.reason === 'hilang' || v.reason === 'dicuri';
    if (requiresPolice && !v.policeReportReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['policeReportReference'],
        message: 'No. laporan polis diperlukan untuk kes hilang/dicuri',
      });
    }
    // Sale amount is optional even for dijual reasons — no validation needed.
  });

export type CreateDisposalInput = z.infer<typeof createDisposalInput>;
