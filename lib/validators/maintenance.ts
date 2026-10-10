import { z } from 'zod';
import { itemCondition } from './items';
import { malaysianMoney, optionalDateString } from './shared';

const requiredDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarikh tidak sah (YYYY-MM-DD)');

const optionalString = (max = 2000) =>
  z.string().trim().max(max).optional().transform((v) => (v === '' ? undefined : v));

export const createMaintenanceLogInput = z.object({
  serviceDate: requiredDateString,
  nextServiceDate: optionalDateString.optional(),
  conditionBefore: itemCondition.optional().or(z.literal('').transform(() => undefined)),
  conditionAfter: itemCondition.optional().or(z.literal('').transform(() => undefined)),
  cost: malaysianMoney('Kos'),
  notes: optionalString(2000),
  statusAfter: z
    .enum(['aktif', 'tidak_cukup', 'rosak', 'dalam_servis'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogInput>;
