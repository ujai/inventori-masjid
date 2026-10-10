/**
 * Drizzle ORM schema for the mosque inventory system.
 *
 * Conventions:
 *  - snake_case at SQL level, camelCase in TS
 *  - TIMESTAMPTZ for timestamps; DATE for calendar dates
 *  - integer().generatedAlwaysAsIdentity() for primary keys (modern Postgres)
 *  - bigint for activity_logs.id (highest growth table)
 *  - Locations are READ-ONLY via API (per client decision B1)
 */

import {
  pgTable, integer, bigint, text, boolean, timestamp, date,
  numeric, pgEnum, jsonb, index, uniqueIndex, check, primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// =====================================================
// Enums
// =====================================================

export const userRole = pgEnum('user_role', ['admin', 'ajk']);

export const trackingMode = pgEnum('item_tracking_mode', ['quantity', 'asset']);

export const itemStatus = pgEnum('item_status', [
  'aktif',
  'tidak_cukup',
  'rosak',
  'dalam_servis',
  'dilupuskan',
  'dipinjam',
  'hilang',
]);

export const itemCondition = pgEnum('item_condition', ['baik', 'sederhana', 'rosak']);

export const acquisitionMethod = pgEnum('acquisition_method', ['beli', 'sewa', 'sumbangan']);

export const movementPurpose = pgEnum('movement_purpose', [
  'pinjam',
  'pindah_lokasi',
  'kenduri',
  'kelas',
  'qurban',
  'lain',
]);

export const disposalReason = pgEnum('disposal_reason', [
  'rosak_total',
  'dijual_besi_buruk',
  'dijual_terpakai',
  'sumbangan_keluar',
  'hilang',
  'dicuri',
  'lain_lain',
]);

// =====================================================
// Better Auth tables
// =====================================================

export const user = pgTable('user', {
  id:                          text('id').primaryKey(),
  name:                        text('name').notNull(),
  email:                       text('email').notNull().unique(),
  emailVerified:               boolean('email_verified').notNull().default(false),
  image:                       text('image'),
  role:                        userRole('role').notNull().default('ajk'),
  phone:                       text('phone'),
  active:                      boolean('active').notNull().default(true),

  // Telegram (per client decisions G4, I3)
  telegramChatId:              text('telegram_chat_id').unique(),
  telegramUsername:            text('telegram_username'),

  // Notification preferences
  notificationEmailEnabled:    boolean('notification_email_enabled').notNull().default(true),
  notificationTelegramEnabled: boolean('notification_telegram_enabled').notNull().default(false),

  createdAt:                   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token:     text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable('account', {
  id:                     text('id').primaryKey(),
  userId:                 text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId:              text('account_id').notNull(),
  providerId:             text('provider_id').notNull(),
  accessToken:            text('access_token'),
  refreshToken:           text('refresh_token'),
  accessTokenExpiresAt:   timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt:  timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope:                  text('scope'),
  idToken:                text('id_token'),
  password:               text('password'),
  createdAt:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const telegramLinkTokens = pgTable('telegram_link_tokens', {
  token:     text('token').primaryKey(),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// Lookup tables
// =====================================================

export const categories = pgTable('categories', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code:        text('code').notNull().unique(),
  nameMs:      text('name_ms').notNull(),
  // 3-letter prefix used for asset codes (e.g. DPR for Dapur → DPR-0001)
  prefix:      text('prefix').notNull().unique(),
  description: text('description'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const locations = pgTable('locations', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code:        text('code').notNull().unique(),
  nameMs:      text('name_ms').notNull(),
  description: text('description'),
  sortOrder:   integer('sort_order').notNull().default(0),
  active:      boolean('active').notNull().default(true),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const units = pgTable('units', {
  id:        integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code:      text('code').notNull().unique(),
  nameMs:    text('name_ms').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// =====================================================
// Items (core, hybrid model)
// =====================================================

export const items = pgTable('items', {
  id:                  integer('id').primaryKey().generatedAlwaysAsIdentity(),

  name:                text('name').notNull(),
  categoryId:          integer('category_id').notNull().references(() => categories.id),
  unitId:              integer('unit_id').notNull().references(() => units.id),
  quantity:            integer('quantity').notNull().default(1),
  currentLocationId:   integer('current_location_id').notNull().references(() => locations.id),
  status:              itemStatus('status').notNull().default('aktif'),
  notes:               text('notes'),

  trackingMode:        trackingMode('tracking_mode').notNull().default('quantity'),
  assetCode:           text('asset_code').unique(),

  acquiredDate:        date('acquired_date'),
  price:               numeric('price', { precision: 12, scale: 2 }),
  acquisitionMethod:   acquisitionMethod('acquisition_method'),
  supplier:            text('supplier'),
  receiptReference:    text('receipt_reference'),

  lastServiceDate:     date('last_service_date'),
  nextServiceDate:     date('next_service_date'),
  expiryDate:          date('expiry_date'),
  condition:           itemCondition('condition'),
  maintenanceNotes:    text('maintenance_notes'),

  maintenanceIntervalDays: integer('maintenance_interval_days'),
  warrantyExpiry:          date('warranty_expiry'),
  expectedLifespanYears:   integer('expected_lifespan_years'),
  minimumQuantity:         integer('minimum_quantity'),

  responsibleUserId:   text('responsible_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdBy:           text('created_by').references(() => user.id, { onDelete: 'set null' }),

  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byCategory:          index('idx_items_category').on(t.categoryId),
  byLocation:          index('idx_items_location').on(t.currentLocationId),
  byStatus:            index('idx_items_status').on(t.status),
  byCatLoc:            index('idx_items_cat_loc').on(t.categoryId, t.currentLocationId),
  byNextService:       index('idx_items_next_service').on(t.nextServiceDate),
  byExpiry:            index('idx_items_expiry').on(t.expiryDate),
  byResponsible:       index('idx_items_responsible').on(t.responsibleUserId),
  uqSupplierReceipt:   uniqueIndex('uq_items_supplier_receipt').on(t.supplier, t.receiptReference),
  assetRequiresCode:   check(
    'items_asset_requires_code',
    sql`${t.trackingMode} = 'quantity' OR ${t.assetCode} IS NOT NULL`,
  ),
  assetQtyOne:         check(
    'items_asset_qty_one',
    sql`${t.trackingMode} = 'quantity' OR ${t.quantity} = 1`,
  ),
  qtyNonNeg:           check('items_qty_non_neg', sql`${t.quantity} >= 0`),
}));

// =====================================================
// Maintenance logs
// =====================================================

export const maintenanceLogs = pgTable('maintenance_logs', {
  id:               integer('id').primaryKey().generatedAlwaysAsIdentity(),
  itemId:           integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  serviceDate:      date('service_date').notNull(),
  nextServiceDate:  date('next_service_date'),
  conditionBefore:  itemCondition('condition_before'),
  conditionAfter:   itemCondition('condition_after'),
  cost:             numeric('cost', { precision: 12, scale: 2 }),
  notes:            text('notes'),
  performedBy:      text('performed_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byItem:        index('idx_maintenance_item').on(t.itemId),
  byServiceDate: index('idx_maintenance_service_date').on(t.serviceDate),
}));

// =====================================================
// Movement logs
// =====================================================

export const movementLogs = pgTable('movement_logs', {
  id:                  integer('id').primaryKey().generatedAlwaysAsIdentity(),
  itemId:              integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  quantityMoved:       integer('quantity_moved').notNull(),
  fromLocationId:      integer('from_location_id').references(() => locations.id),
  toLocationId:        integer('to_location_id').references(() => locations.id),
  purpose:             movementPurpose('purpose').notNull(),
  borrowerName:        text('borrower_name'),
  expectedReturnDate:  date('expected_return_date'),
  returnedDate:        date('returned_date'),
  returnCondition:     itemCondition('return_condition'),
  notes:               text('notes'),
  handledBy:           text('handled_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byItem:    index('idx_movement_item').on(t.itemId),
  qtyCheck:  check('movement_qty_check', sql`${t.quantityMoved} > 0`),
}));

// =====================================================
// Attachments (Cloudflare R2)
// =====================================================

export const attachments = pgTable('attachments', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  itemId:      integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  kind:        text('kind').notNull(),
  r2Key:       text('r2_key').notNull(),
  fileName:    text('file_name'),
  mimeType:    text('mime_type'),
  sizeBytes:   integer('size_bytes'),
  uploadedBy:  text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byItem:    index('idx_attachments_item').on(t.itemId),
  byKind:    index('idx_attachments_kind').on(t.kind),
  kindCheck: check(
    'attachments_kind_check',
    sql`${t.kind} IN ('photo','barcode','qr','document','police_report')`,
  ),
}));

// =====================================================
// Disposal logs (lost / stolen / disposed)
// =====================================================

export const disposalLogs = pgTable('disposal_logs', {
  id:                       integer('id').primaryKey().generatedAlwaysAsIdentity(),
  itemId:                   integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  disposalDate:             date('disposal_date').notNull(),
  reason:                   disposalReason('reason').notNull(),
  quantityDisposed:         integer('quantity_disposed').notNull(),
  policeReportReference:    text('police_report_reference'),
  policeReportAttachmentId: integer('police_report_attachment_id').references(() => attachments.id, { onDelete: 'set null' }),
  saleAmount:               numeric('sale_amount', { precision: 12, scale: 2 }),
  buyer:                    text('buyer'),
  notes:                    text('notes'),
  recordedBy:               text('recorded_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt:                timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byItem:   index('idx_disposal_item').on(t.itemId),
  byReason: index('idx_disposal_reason').on(t.reason),
  byDate:   index('idx_disposal_date').on(t.disposalDate),
  qtyCheck: check('disposal_qty_check', sql`${t.quantityDisposed} > 0`),
}));

// =====================================================
// Institutional Roles (Feature #14)
// =====================================================

export const institutionalRoles = pgTable('institutional_roles', {
  id:          integer('id').primaryKey().generatedAlwaysAsIdentity(),
  code:        text('code').notNull().unique(),
  nameMs:      text('name_ms').notNull(),
  description: text('description'),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const itemRoles = pgTable('item_roles', {
  itemId:  integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  roleId:  integer('role_id').notNull().references(() => institutionalRoles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk:     primaryKey({ columns: [t.itemId, t.roleId] }),
  byRole: index('idx_item_roles_role').on(t.roleId),
}));

// =====================================================
// Activity log (audit trail)
// =====================================================

export const activityLogs = pgTable('activity_logs', {
  id:           bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  actorUserId:  text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
  action:       text('action').notNull(),
  entityType:   text('entity_type').notNull(),
  entityId:     text('entity_id').notNull(),
  changes:      jsonb('changes'),
  ipAddress:    text('ip_address'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byActor:   index('idx_activity_actor').on(t.actorUserId),
  byEntity:  index('idx_activity_entity').on(t.entityType, t.entityId),
  byCreated: index('idx_activity_created').on(t.createdAt),
}));
