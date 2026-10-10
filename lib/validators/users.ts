import { z } from 'zod';

const phoneMy = z.string().regex(/^\+60\d{8,11}$/, 'Format telefon tidak sah (cth: +60123456789)');

export const createUserInput = z.object({
  name: z.string().trim().min(1, 'Nama diperlukan').max(200),
  email: z.string().trim().toLowerCase().email('Emel tidak sah'),
  role: z.enum(['admin', 'ajk']).default('ajk'),
  phone: phoneMy.optional(),
});

export const updateUserInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['admin', 'ajk']).optional(),
  phone: phoneMy.optional(),
  active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserInput>;
export type UpdateUserInput = z.infer<typeof updateUserInput>;
