/**
 * Seed lookup tables — run once after first migration.
 * Usage: bun run db:seed
 *
 * Locations are LOCKED at setup per client decision B1.
 * To change locations later, edit this file, run a new migration, and review.
 */

import { db } from './client';
import { categories, units, locations } from './schema';

async function main() {
  console.log('🌱  Seeding categories...');
  await db.insert(categories).values([
    { code: 'dewan_solat', nameMs: 'Dewan Solat', prefix: 'DWN', sortOrder: 1 },
    { code: 'muslimat',    nameMs: 'Muslimat',    prefix: 'MSL', sortOrder: 2 },
    { code: 'elektronik',  nameMs: 'Elektronik',  prefix: 'ELK', sortOrder: 3 },
    { code: 'fasiliti',    nameMs: 'Fasiliti',    prefix: 'FSI', sortOrder: 4 },
    { code: 'pejabat',     nameMs: 'Pejabat',     prefix: 'PEJ', sortOrder: 5 },
    { code: 'dapur',       nameMs: 'Dapur',       prefix: 'DPR', sortOrder: 6 },
    { code: 'kebersihan',  nameMs: 'Kebersihan',  prefix: 'KBS', sortOrder: 7 },
    { code: 'lain_lain',   nameMs: 'Lain-lain',   prefix: 'LAI', sortOrder: 99 },
  ]).onConflictDoNothing();

  console.log('🌱  Seeding units...');
  await db.insert(units).values([
    { code: 'unit',    nameMs: 'Unit',    sortOrder: 1 },
    { code: 'set',     nameMs: 'Set',     sortOrder: 2 },
    { code: 'helai',   nameMs: 'Helai',   sortOrder: 3 },
    { code: 'biji',    nameMs: 'Biji',    sortOrder: 4 },
    { code: 'naskhah', nameMs: 'Naskhah', sortOrder: 5 },
    { code: 'keping',  nameMs: 'Keping',  sortOrder: 6 },
    { code: 'pek',     nameMs: 'Pek',     sortOrder: 7 },
    { code: 'kotak',   nameMs: 'Kotak',   sortOrder: 8 },
  ]).onConflictDoNothing();

  console.log('🌱  Seeding locations (LOCKED at setup per B1)...');
  await db.insert(locations).values([
    { code: 'dewan_solat_utama', nameMs: 'Dewan Solat Utama', sortOrder: 1 },
    { code: 'bilik_muslimat',    nameMs: 'Bilik Muslimat',    sortOrder: 2 },
    { code: 'bilik_pa',          nameMs: 'Bilik PA / Audio',  sortOrder: 3 },
    { code: 'pejabat_masjid',    nameMs: 'Pejabat Masjid',    sortOrder: 4 },
    { code: 'dapur_masjid',      nameMs: 'Dapur Masjid',      sortOrder: 5 },
    { code: 'stor_belakang',     nameMs: 'Stor Belakang',     sortOrder: 6 },
    { code: 'kawasan_luar',      nameMs: 'Kawasan Luar',      sortOrder: 7 },
    { code: 'bilik_kuliah',      nameMs: 'Bilik Kuliah',      sortOrder: 8 },
  ]).onConflictDoNothing();

  console.log('✅  Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
