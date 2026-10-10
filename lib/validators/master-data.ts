import { z } from 'zod';

const codePattern = /^[a-z][a-z0-9_]{0,49}$/;

export const upsertCategoryInput = z.object({
  code: z.string().regex(codePattern, 'Kod hanya huruf kecil, angka, _ (mula dengan huruf)').max(50),
  nameMs: z.string().trim().min(1, 'Nama diperlukan').max(100),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Prefix mesti 2-5 huruf besar (cth: DPR)'),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export const upsertUnitInput = z.object({
  code: z.string().regex(codePattern, 'Kod hanya huruf kecil, angka, _').max(50),
  nameMs: z.string().trim().min(1).max(50),
  sortOrder: z.coerce.number().int().default(0),
});

export type UpsertCategoryInput = z.infer<typeof upsertCategoryInput>;
export type UpsertUnitInput = z.infer<typeof upsertUnitInput>;
