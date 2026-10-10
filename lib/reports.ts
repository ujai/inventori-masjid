/**
 * Report queries — all server-side only, called from Server Components
 * and CSV export route handlers.
 *
 * Karpathy note: each query is a single focused DB call. No abstraction
 * layers, no generics — just typed results for each report type.
 */

import { and, count, desc, eq, gte, inArray, isNotNull, lte, ne, notInArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  activityLogs,
  categories,
  disposalLogs,
  items,
  locations,
  movementLogs,
  user,
} from '@/db/schema';

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [statusRows, dueSoonRow, expiringSoonRow, recentActivity] =
    await Promise.all([
      // Counts by status (excludes permanently archived)
      db
        .select({ status: items.status, n: count() })
        .from(items)
        .groupBy(items.status),

      // Items due for service within 30 days
      db
        .select({ n: count() })
        .from(items)
        .where(
          and(
            isNotNull(items.nextServiceDate),
            lte(items.nextServiceDate, sql`CURRENT_DATE + INTERVAL '30 days'`),
            gte(items.nextServiceDate, sql`CURRENT_DATE`),
            ne(items.status, 'dilupuskan'),
            ne(items.status, 'hilang'),
          ),
        ),

      // Items expiring within 60 days
      db
        .select({ n: count() })
        .from(items)
        .where(
          and(
            isNotNull(items.expiryDate),
            lte(items.expiryDate, sql`CURRENT_DATE + INTERVAL '60 days'`),
            gte(items.expiryDate, sql`CURRENT_DATE`),
            ne(items.status, 'dilupuskan'),
            ne(items.status, 'hilang'),
          ),
        ),

      // Recent activity (last 10 mutations)
      db
        .select({
          id:         activityLogs.id,
          action:     activityLogs.action,
          entityId:   activityLogs.entityId,
          createdAt:  activityLogs.createdAt,
          actorName:  user.name,
        })
        .from(activityLogs)
        .leftJoin(user, eq(user.id, activityLogs.actorUserId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(10),
    ]);

  const statusMap = Object.fromEntries(statusRows.map((r) => [r.status, r.n]));
  return {
    aktif:        statusMap['aktif']        ?? 0,
    rosak:        statusMap['rosak']        ?? 0,
    dalamServis:  statusMap['dalam_servis'] ?? 0,
    tidakCukup:   statusMap['tidak_cukup']  ?? 0,
    dipinjam:     statusMap['dipinjam']     ?? 0,
    hilang:       statusMap['hilang']       ?? 0,
    dilupuskan:   statusMap['dilupuskan']   ?? 0,
    dueSoon:      dueSoonRow[0]?.n          ?? 0,
    expiringSoon: expiringSoonRow[0]?.n     ?? 0,
    recentActivity,
  };
}

// ─── Report: by category ──────────────────────────────────────────────────────

export async function getReportByCategory() {
  return db
    .select({
      categoryName: categories.nameMs,
      prefix:       categories.prefix,
      total:        count(),
      aktif:        sql<number>`SUM(CASE WHEN ${items.status} = 'aktif' THEN 1 ELSE 0 END)`,
      rosak:        sql<number>`SUM(CASE WHEN ${items.status} = 'rosak' THEN 1 ELSE 0 END)`,
      dalamServis:  sql<number>`SUM(CASE WHEN ${items.status} = 'dalam_servis' THEN 1 ELSE 0 END)`,
      dipinjam:     sql<number>`SUM(CASE WHEN ${items.status} = 'dipinjam' THEN 1 ELSE 0 END)`,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .where(and(ne(items.status, 'dilupuskan'), ne(items.status, 'hilang')))
    .groupBy(categories.id, categories.nameMs, categories.prefix)
    .orderBy(categories.nameMs);
}

// ─── Report: by location ─────────────────────────────────────────────────────

export async function getReportByLocation() {
  return db
    .select({
      locationName: locations.nameMs,
      total:        count(),
      aktif:        sql<number>`SUM(CASE WHEN ${items.status} = 'aktif' THEN 1 ELSE 0 END)`,
      rosak:        sql<number>`SUM(CASE WHEN ${items.status} = 'rosak' THEN 1 ELSE 0 END)`,
      dalamServis:  sql<number>`SUM(CASE WHEN ${items.status} = 'dalam_servis' THEN 1 ELSE 0 END)`,
      dipinjam:     sql<number>`SUM(CASE WHEN ${items.status} = 'dipinjam' THEN 1 ELSE 0 END)`,
    })
    .from(items)
    .innerJoin(locations, eq(locations.id, items.currentLocationId))
    .where(and(ne(items.status, 'dilupuskan'), ne(items.status, 'hilang')))
    .groupBy(locations.id, locations.nameMs)
    .orderBy(locations.nameMs);
}

// ─── Report: due for service ─────────────────────────────────────────────────

export async function getReportDueService() {
  return db
    .select({
      id:              items.id,
      name:            items.name,
      assetCode:       items.assetCode,
      status:          items.status,
      nextServiceDate: items.nextServiceDate,
      lastServiceDate: items.lastServiceDate,
      categoryName:    categories.nameMs,
      locationName:    locations.nameMs,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .innerJoin(locations, eq(locations.id, items.currentLocationId))
    .where(
      and(
        isNotNull(items.nextServiceDate),
        lte(items.nextServiceDate, sql`CURRENT_DATE + INTERVAL '30 days'`),
        ne(items.status, 'dilupuskan'),
        ne(items.status, 'hilang'),
      ),
    )
    .orderBy(items.nextServiceDate);
}

// ─── Report: items currently borrowed ────────────────────────────────────────

export async function getReportDipinjam() {
  return db
    .select({
      movementId:         movementLogs.id,
      itemName:           items.name,
      assetCode:          items.assetCode,
      borrowerName:       movementLogs.borrowerName,
      expectedReturnDate: movementLogs.expectedReturnDate,
      movedAt:            movementLogs.createdAt,
      locationName:       locations.nameMs,
      handlerName:        user.name,
    })
    .from(movementLogs)
    .innerJoin(items, eq(items.id, movementLogs.itemId))
    .innerJoin(locations, eq(locations.id, items.currentLocationId))
    .leftJoin(user, eq(user.id, movementLogs.handledBy))
    .where(
      and(
        eq(movementLogs.purpose, 'pinjam'),
        sql`${movementLogs.returnedDate} IS NULL`,
      ),
    )
    .orderBy(movementLogs.createdAt);
}

// ─── Shared disposal select shape ───────────────────────────────────────────

const disposalSelect = {
  id:                    disposalLogs.id,
  itemName:              items.name,
  assetCode:             items.assetCode,
  disposalDate:          disposalLogs.disposalDate,
  reason:                disposalLogs.reason,
  quantityDisposed:      disposalLogs.quantityDisposed,
  policeReportReference: disposalLogs.policeReportReference,
  saleAmount:            disposalLogs.saleAmount,
  buyer:                 disposalLogs.buyer,
  notes:                 disposalLogs.notes,
  recorderName:          user.name,
} as const;

// ─── Report: disposals (rosak / jual / sumbangan / lain-lain) ────────────────

export async function getReportPelupusan() {
  return db
    .select(disposalSelect)
    .from(disposalLogs)
    .innerJoin(items, eq(items.id, disposalLogs.itemId))
    .leftJoin(user, eq(user.id, disposalLogs.recordedBy))
    .where(notInArray(disposalLogs.reason, ['hilang', 'dicuri']))
    .orderBy(desc(disposalLogs.disposalDate));
}

// ─── Report: loss and theft (hilang / dicuri) ─────────────────────────────────

export async function getReportKehilangan() {
  return db
    .select(disposalSelect)
    .from(disposalLogs)
    .innerJoin(items, eq(items.id, disposalLogs.itemId))
    .leftJoin(user, eq(user.id, disposalLogs.recordedBy))
    .where(inArray(disposalLogs.reason, ['hilang', 'dicuri']))
    .orderBy(desc(disposalLogs.disposalDate));
}

// ─── Report: expiring items ───────────────────────────────────────────────────

export async function getReportExpiringSoon() {
  return db
    .select({
      id:           items.id,
      name:         items.name,
      assetCode:    items.assetCode,
      expiryDate:   items.expiryDate,
      status:       items.status,
      categoryName: categories.nameMs,
      locationName: locations.nameMs,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .innerJoin(locations, eq(locations.id, items.currentLocationId))
    .where(
      and(
        isNotNull(items.expiryDate),
        lte(items.expiryDate, sql`CURRENT_DATE + INTERVAL '60 days'`),
        gte(items.expiryDate, sql`CURRENT_DATE`),
        ne(items.status, 'dilupuskan'),
        ne(items.status, 'hilang'),
      ),
    )
    .orderBy(items.expiryDate);
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

/** Escape a single CSV cell — wraps in quotes, escapes internal quotes. */
function cell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Build a CSV string from headers + row data. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(cell).join(','),
    ...rows.map((r) => r.map(cell).join(',')),
  ];
  return lines.join('\r\n');
}

// ─── Action label map ─────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  'item.create':      'Barang dicipta',
  'item.update':      'Barang dikemaskini',
  'item.delete':      'Barang dilupuskan',
  'item.recovered':   'Barang dijumpai semula',
  'maintenance.create': 'Log servis ditambah',
  'movement.create':  'Pergerakan direkod',
  'movement.return':  'Pulangan direkod',
  'disposal.create':  'Pelupusan direkod',
  'photo.upload':     'Foto dimuat naik',
  'photo.delete':     'Foto dipadam',
};

export const REASON_LABELS: Record<string, string> = {
  rosak_total:       'Rosak Teruk',
  dijual_besi_buruk: 'Dijual (Besi Buruk)',
  dijual_terpakai:   'Dijual (Terpakai)',
  sumbangan_keluar:  'Sumbangan Keluar',
  hilang:            'Hilang',
  dicuri:            'Dicuri',
  lain_lain:         'Lain-lain',
};
