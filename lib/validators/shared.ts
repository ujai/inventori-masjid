import { z } from 'zod';

export function malaysianMoney(label: string) {
  return z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === 'number') return v;
      if (v.trim() === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
      message: `${label} tidak sah`,
    });
}

export const optionalDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarikh tidak sah (YYYY-MM-DD)')
  .or(z.literal(''))
  .transform((v) => (v === '' ? undefined : v));
