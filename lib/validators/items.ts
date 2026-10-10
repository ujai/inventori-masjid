import { z } from 'zod';
import { malaysianMoney, optionalDateString } from './shared';

const dateString = optionalDateString;

export const itemStatus = z.enum([
  'aktif', 'tidak_cukup', 'rosak', 'dalam_servis', 'dilupuskan', 'dipinjam', 'hilang',
]);
export const itemCondition = z.enum(['baik', 'sederhana', 'rosak']);
export const acquisitionMethod = z.enum(['beli', 'sewa', 'sumbangan']);
export const trackingMode = z.enum(['quantity', 'asset']);

const optionalString = (max = 200) =>
  z.string().trim().max(max).optional().transform((v) => (v === '' ? undefined : v));

// Base shape — shared between create and update
const createItemBase = z.object({
  name: z.string().trim().min(1, 'Nama barang diperlukan').max(200),
  categoryId: z.coerce.number().int().positive('Kategori diperlukan'),
  unitId: z.coerce.number().int().positive('Unit diperlukan'),
  quantity: z.coerce.number().int().min(0).default(1),
  currentLocationId: z.coerce.number().int().positive('Lokasi diperlukan'),
  status: itemStatus.default('aktif'),
  notes: optionalString(2000),

  trackingMode: trackingMode.default('quantity'),
  assetCode: z
    .string()
    .trim()
    .max(50)
    .regex(/^[A-Z]{2,5}-\d{2,6}$/, 'Format kod aset tidak sah (cth: DPR-0001)')
    .optional()
    .or(z.literal('').transform(() => undefined)),

  // Maklumat Tambahan
  acquiredDate: dateString.optional(),
  price: malaysianMoney('Harga').optional(),
  acquisitionMethod: acquisitionMethod.optional().or(z.literal('').transform(() => undefined)),
  supplier: optionalString(200),
  receiptReference: optionalString(100),

  expiryDate: dateString.optional(),
  condition: itemCondition.optional().or(z.literal('').transform(() => undefined)),
  maintenanceNotes: optionalString(2000),

  // Feature #3 — Warranty & Lifespan Tracking
  warrantyExpiry: dateString.optional(),
  expectedLifespanYears: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  maintenanceIntervalDays: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)),
  minimumQuantity: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
});

export const createItemInput = createItemBase.refine(
  (v) => v.trackingMode === 'quantity' || v.quantity === 1,
  { message: 'Mod aset memerlukan kuantiti = 1', path: ['quantity'] },
);

// Partial uses the base shape directly (refinement not needed for partial updates)
export const updateItemInput = createItemBase.partial();

export const itemListQuery = z.object({
  q: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  status: itemStatus.optional(),
  condition: itemCondition.optional(),
  trackingMode: trackingMode.optional(),
  includeArchived: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateItemInput = z.infer<typeof createItemInput>;
export type UpdateItemInput = z.infer<typeof updateItemInput>;
export type ItemListQuery = z.infer<typeof itemListQuery>;
