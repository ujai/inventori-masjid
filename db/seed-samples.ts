/**
 * Seed sample inventory items for testing & demos.
 *
 * Run: bun run db/seed-samples.ts
 *
 * Idempotent — uses asset_code or supplier+receipt as natural keys for skip.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from './client';
import { items, categories, locations, units, movementLogs } from './schema';

async function getCategoryId(code: string): Promise<number> {
  const [r] = await db.select({ id: categories.id }).from(categories).where(eq(categories.code, code));
  if (!r) throw new Error(`Category not found: ${code}`);
  return r.id;
}
async function getLocationId(code: string): Promise<number> {
  const [r] = await db.select({ id: locations.id }).from(locations).where(eq(locations.code, code));
  if (!r) throw new Error(`Location not found: ${code}`);
  return r.id;
}
async function getUnitId(code: string): Promise<number> {
  const [r] = await db.select({ id: units.id }).from(units).where(eq(units.code, code));
  if (!r) throw new Error(`Unit not found: ${code}`);
  return r.id;
}

function dateInDays(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log('🌱  Seeding sample inventory items...');

  // Computed at seed-run time so service-due notification triggers this week.
  const serviceDueSoon = dateInDays(5);

  const dapur     = await getCategoryId('dapur');
  const muslimat  = await getCategoryId('muslimat');
  const elektro   = await getCategoryId('elektronik');
  const fasiliti  = await getCategoryId('fasiliti');
  const dewan     = await getCategoryId('dewan_solat');
  const kebersih  = await getCategoryId('kebersihan');

  const locDapur     = await getLocationId('dapur_masjid');
  const locMuslimat  = await getLocationId('bilik_muslimat');
  const locPa        = await getLocationId('bilik_pa');
  const locDewan     = await getLocationId('dewan_solat_utama');
  const locStor      = await getLocationId('stor_belakang');

  const uUnit    = await getUnitId('unit');
  const uHelai   = await getUnitId('helai');
  const uNaskhah = await getUnitId('naskhah');
  const uSet     = await getUnitId('set');

  const samples = [
    // Quantity-mode items
    {
      name: 'Periuk Besar', categoryId: dapur, unitId: uUnit, quantity: 4,
      currentLocationId: locDapur, status: 'aktif' as const,
      notes: '2 unit saiz besar, 2 unit saiz sederhana',
      acquiredDate: '2025-03-10', price: '450.00', acquisitionMethod: 'beli' as const,
      // minimumQuantity > quantity → low stock notification always triggers
      minimumQuantity: 6,
    },
    {
      name: 'Telekung', categoryId: muslimat, unitId: uHelai, quantity: 35,
      currentLocationId: locMuslimat, status: 'aktif' as const, condition: 'baik' as const,
    },
    {
      name: 'Sejadah', categoryId: dewan, unitId: uHelai, quantity: 50,
      currentLocationId: locDewan, status: 'aktif' as const,
    },
    {
      name: 'Al-Quran', categoryId: dewan, unitId: uNaskhah, quantity: 20,
      currentLocationId: locDewan, status: 'aktif' as const,
    },
    {
      name: 'Talam', categoryId: dapur, unitId: uUnit, quantity: 12,
      currentLocationId: locDapur, status: 'aktif' as const,
    },
    {
      name: 'Mop dan Baldi', categoryId: kebersih, unitId: uSet, quantity: 3,
      currentLocationId: locStor, status: 'aktif' as const,
    },
    // Asset-mode items
    {
      name: 'Penghawa Dingin Dewan Solat', categoryId: fasiliti, unitId: uUnit, quantity: 1,
      currentLocationId: locDewan, status: 'aktif' as const,
      trackingMode: 'asset' as const, assetCode: 'FSI-0001',
      condition: 'baik' as const,
      acquiredDate: '2024-08-15', price: '3200.00', acquisitionMethod: 'beli' as const,
      lastServiceDate: '2026-01-10',
      // nextServiceDate = today + 5 days so service-due notification triggers this week.
      // Re-run the seed to refresh this when testing again later.
      nextServiceDate: serviceDueSoon,
      maintenanceNotes: 'Servis berkala setiap 6 bulan',
    },
    {
      name: 'Amplifier Utama', categoryId: elektro, unitId: uUnit, quantity: 1,
      currentLocationId: locPa, status: 'aktif' as const,
      trackingMode: 'asset' as const, assetCode: 'ELK-0001', condition: 'baik' as const,
    },
    {
      name: 'Mic Wireless', categoryId: elektro, unitId: uUnit, quantity: 1,
      currentLocationId: locPa, status: 'dalam_servis' as const,
      trackingMode: 'asset' as const, assetCode: 'ELK-0002', condition: 'rosak' as const,
      maintenanceNotes: 'Bateri tidak cas. Dihantar untuk baikpulih.',
    },
    {
      name: 'Projektor LCD', categoryId: elektro, unitId: uUnit, quantity: 1,
      currentLocationId: locPa, status: 'aktif' as const,
      trackingMode: 'asset' as const, assetCode: 'ELK-0003', condition: 'baik' as const,
    },
    {
      name: 'Vacuum Cleaner', categoryId: kebersih, unitId: uUnit, quantity: 1,
      currentLocationId: locStor, status: 'rosak' as const,
      trackingMode: 'asset' as const, assetCode: 'KBS-0001', condition: 'rosak' as const,
      maintenanceNotes: 'Hos pecah, perlu beli ganti.',
    },
    {
      name: 'TV LED 55"', categoryId: elektro, unitId: uUnit, quantity: 1,
      currentLocationId: locDewan, status: 'aktif' as const,
      trackingMode: 'asset' as const, assetCode: 'ELK-0004',
      acquiredDate: '2025-11-20', price: '2400.00',
    },
  ];

  for (const sample of samples) {
    // Idempotent: skip by assetCode for asset-mode, by name for quantity-mode.
    const [existing] = await db
      .select({ id: items.id })
      .from(items)
      .where(
        sample.trackingMode === 'asset' && sample.assetCode
          ? eq(items.assetCode, sample.assetCode)
          : eq(items.name, sample.name),
      )
      .limit(1);

    if (existing) {
      // Always refresh nextServiceDate on Penghawa Dingin so it stays within 7 days.
      if (sample.assetCode === 'FSI-0001') {
        await db.update(items).set({ nextServiceDate: serviceDueSoon }).where(eq(items.id, existing.id));
        console.log(`   ~ FSI-0001 nextServiceDate refreshed → ${serviceDueSoon}`);
      }
      // Always refresh minimumQuantity on Periuk Besar so low-stock stays active.
      if (sample.name === 'Periuk Besar') {
        await db.update(items).set({ minimumQuantity: 6 }).where(eq(items.id, existing.id));
        console.log(`   ~ Periuk Besar minimumQuantity refreshed → 6`);
      }
      console.log(`   skip ${sample.name}${sample.assetCode ? ' (' + sample.assetCode + ')' : ''} (already exists)`);
      continue;
    }

    await db.insert(items).values(sample);
    console.log(`   + ${sample.name}${sample.assetCode ? ' (' + sample.assetCode + ')' : ''}`);
  }

  // ── Overdue borrow log ────────────────────────────────────────────────────
  // Find Periuk Besar and insert an unreturned borrow dated 2020-01-01.
  // This permanently satisfies the overdue-borrow notification condition.
  const [periuk] = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.name, 'Periuk Besar'))
    .limit(1);

  if (periuk) {
    const [existingBorrow] = await db
      .select({ id: movementLogs.id })
      .from(movementLogs)
      .where(
        and(
          eq(movementLogs.itemId, periuk.id),
          eq(movementLogs.purpose, 'pinjam'),
          isNull(movementLogs.returnedDate),
          eq(movementLogs.expectedReturnDate, '2020-01-01'),
        ),
      )
      .limit(1);

    if (!existingBorrow) {
      await db.insert(movementLogs).values({
        itemId:             periuk.id,
        quantityMoved:      1,
        purpose:            'pinjam',
        borrowerName:       'Ahmad bin Ujian (Demo)',
        expectedReturnDate: '2020-01-01',
        returnedDate:       null,
        notes:              'Data demo — pinjaman lampau untuk menguji cron notifikasi',
      });
      console.log('   + overdue borrow log for Periuk Besar (demo)');
    } else {
      console.log('   skip overdue borrow log (already exists)');
    }
  }

  console.log('✅  Sample seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Sample seed failed:', err);
  process.exit(1);
});
