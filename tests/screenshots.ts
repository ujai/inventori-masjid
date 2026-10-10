/**
 * Capture all panduan (user-guide) screenshots in one go.
 *
 * Usage:
 *   bun run screenshot:guides              capture everything
 *   bun run screenshot:guides 01-login     capture one guide only
 *   bun run screenshot:guides 01-login 02-dashboard-tour   multiple
 *
 * Re-uses the storageState saved by `bun run test:uat:setup:admin` / `:ajk`.
 * If a role file is missing, the script skips and tells you which setup to run.
 *
 * Google OAuth screens (login guide step 2-3) and the browser-native print
 * dialog (QR label step 3, handover step 4) are captured manually in real
 * Chrome — listed in MANUAL_NOTES.
 */

import { chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:3000';
const ROOT = path.join(__dirname, '..');
const SHOTS_DIR = path.join(ROOT, 'docs/panduan/screenshots');
const AUTH_DIR = path.join(ROOT, 'playwright/.auth');

type Role = 'admin' | 'ajk' | 'none';

interface Shot {
  guide: string;     // e.g. '01-login'
  step: number;      // e.g. 1
  url: string;       // path relative to BASE_URL (may include {ID} placeholder)
  role: Role;
  waitFor?: string;  // selector to wait for before action / screenshot
  action?: (page: Page) => Promise<void>;  // optional click/scroll before screenshot
  fullPage?: boolean;
}

/**
 * Shot manifest — add an entry for every screenshot a guide needs.
 * Use {ID} in url to substitute the first real item ID from the live inventory.
 */
const SHOTS: Shot[] = [
  // 01 — Login (step 2-3 manual: Google account chooser)
  { guide: '01-login', step: 1, url: '/sign-in', role: 'none', waitFor: 'text=Log Masuk dengan Google' },
  { guide: '01-login', step: 4, url: '/', role: 'admin', waitFor: 'text=Aktif' },

  // 02 — Dashboard tour
  { guide: '02-dashboard-tour', step: 1, url: '/', role: 'admin', waitFor: 'text=Aktif', fullPage: true },

  // 03 — Cari item (list closed, then with filter panel open)
  { guide: '03-cari-item', step: 1, url: '/items', role: 'admin', waitFor: 'input[placeholder*="Cari barang"]' },
  {
    guide: '03-cari-item', step: 3, url: '/items', role: 'admin',
    waitFor: 'input[placeholder*="Cari barang"]',
    action: async (page) => {
      await page.getByRole('button', { name: /Tapis/i }).first().click();
      await page.waitForTimeout(300);  // drawer slide animation
    },
  },

  // 04 — Lihat detail item
  { guide: '04-lihat-detail-item', step: 1, url: '/items/{ID}', role: 'admin', fullPage: true },

  // 05 — Tambah barang baru
  { guide: '05-tambah-item', step: 1, url: '/items/new', role: 'admin', waitFor: 'text=Tambah Barang Baru', fullPage: true },

  // 06 — Edit barang
  { guide: '06-edit-item', step: 1, url: '/items/{ID}/edit', role: 'admin', waitFor: 'text=Edit Barang', fullPage: true },

  // 07 — Pinjam barang (open movement form drawer)
  {
    guide: '07-pinjam-barang', step: 1, url: '/items/{ID}', role: 'admin',
    action: async (page) => {
      const btn = page.getByRole('button', { name: /Rekod Pergerakan|Pergerakan/i }).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(400);
        await page.locator('#purpose').selectOption('pinjam');
      }
    },
    fullPage: true,
  },

  // 08 — Pulang barang (item detail showing Sejarah Pergerakan)
  { guide: '08-pulang-barang', step: 1, url: '/items/{ID}', role: 'admin', fullPage: true },

  // 09 — Rekod servis (open maintenance form drawer)
  {
    guide: '09-log-servis', step: 1, url: '/items/{ID}', role: 'admin',
    action: async (page) => {
      const btn = page.getByRole('button', { name: /Rekod Servis|Servis/i }).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(400);
      }
    },
    fullPage: true,
  },

  // 10 — Cetak QR (item detail; print dialog manual)
  { guide: '10-cetak-qr', step: 1, url: '/items/{ID}', role: 'admin', fullPage: true },

  // 11 — Lapor rosak / hilang (admin actions visible)
  { guide: '11-lapor-rosak-hilang', step: 1, url: '/items/{ID}', role: 'admin', fullPage: true },

  // 12 — Lihat laporan
  { guide: '12-lihat-laporan', step: 1, url: '/reports', role: 'admin', waitFor: 'h1:has-text("Laporan")', fullPage: true },

  // 13 — Serah terima AJK
  { guide: '13-serah-terima-ajk', step: 1, url: '/reports/handover', role: 'admin', waitFor: 'text=Serah Terima', fullPage: true },

  // 14 — Master data
  { guide: '14-uruskan-master-data', step: 1, url: '/admin/master-data', role: 'admin', waitFor: 'text=Data Induk', fullPage: true },
];

const MANUAL_NOTES: Record<string, string[]> = {
  '01-login': [
    'step-2.png — Google "Pilih akaun" chooser. Capture in real Chrome.',
    'step-3.png — Google sign-in form / 2FA. Capture in real Chrome.',
  ],
  '10-cetak-qr': [
    'step-2.png — browser print preview after clicking Cetak Label QR.',
    'step-3.png — browser print dialog with destination/paper options.',
  ],
  '13-serah-terima-ajk': [
    'step-4.png — Ctrl+P print dialog for the handover report.',
  ],
};

// Item used for {ID} shots. Default is a db:seed:samples item with movement history.
const SHOT_ITEM_NAME = process.env.SCREENSHOT_ITEM_NAME ?? 'Periuk Besar';

async function getFirstItemId(ctx: BrowserContext): Promise<number | null> {
  const page = await ctx.newPage();
  try {
    // In-page fetch: ctx.request crashes under Bun when the response sets a cookie.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const namedId = await page.evaluate(async (name) => {
      const res = await fetch(`/api/items?q=${encodeURIComponent(name)}&limit=1`);
      if (!res.ok) return null;
      const body = (await res.json()) as { data?: { id: number }[] };
      return body.data?.[0]?.id ?? null;
    }, SHOT_ITEM_NAME);
    if (namedId != null) return namedId;

    await page.goto(`${BASE_URL}/items`, { waitUntil: 'networkidle', timeout: 30_000 });
    const firstItem = page.locator('a[href^="/items/"]').filter({ hasNot: page.locator('text=/Tambah|Kembali/') }).first();
    const count = await firstItem.count();
    if (count === 0) return null;
    const href = await firstItem.getAttribute('href', { timeout: 5_000 });
    if (!href) return null;
    const m = href.match(/\/items\/(\d+)/);
    return m ? Number(m[1]) : null;
  } finally {
    await page.close();
  }
}

async function shoot(ctx: BrowserContext, shot: Shot, itemId: number | null): Promise<void> {
  let url = shot.url;
  if (url.includes('{ID}')) {
    if (itemId == null) throw new Error('Shot needs {ID} but no items found in inventory');
    url = url.replace('{ID}', String(itemId));
  }

  const page: Page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle', timeout: 30_000 });

  if (shot.waitFor) {
    await page.waitForSelector(shot.waitFor, { timeout: 15_000 });
  }

  if (shot.action) {
    await shot.action(page);
    // Actions can scroll the page; full-page captures then draw the sticky header mid-page.
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  const dir = path.join(SHOTS_DIR, shot.guide);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `step-${shot.step}.png`);
  await page.screenshot({ path: file, fullPage: shot.fullPage ?? false });
  console.log(`  ✓  ${shot.guide}/step-${shot.step}.png  (${shot.role})`);

  await page.close();
}

async function main(): Promise<void> {
  const filterArgs = process.argv.slice(2);
  const filtered = filterArgs.length > 0
    ? SHOTS.filter(s => filterArgs.includes(s.guide))
    : SHOTS;

  if (filtered.length === 0) {
    const all = [...new Set(SHOTS.map(s => s.guide))].sort();
    console.error(`No matching shots. Available guides:\n  ${all.join('\n  ')}`);
    process.exit(1);
  }

  console.log(`Capturing ${filtered.length} screenshot(s) from ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  let failures = 0;

  // Group by role for one BrowserContext per role
  const byRole = new Map<Role, Shot[]>();
  for (const s of filtered) {
    if (!byRole.has(s.role)) byRole.set(s.role, []);
    byRole.get(s.role)!.push(s);
  }

  // Pre-fetch first item ID if any shot needs it (only meaningful with auth)
  let itemId: number | null = null;
  const needsId = filtered.some(s => s.url.includes('{ID}'));

  for (const [role, shots] of byRole) {
    const storageState = role === 'none' ? undefined : path.join(AUTH_DIR, `${role}.json`);

    if (storageState && !fs.existsSync(storageState)) {
      console.error(`\n⚠  Missing ${role}.json — run:  bun run test:uat:setup:${role}\n   Skipping ${shots.length} ${role} shot(s).`);
      continue;
    }

    console.log(`[${role}] ${shots.length} shot(s)`);
    const ctx = await browser.newContext({ storageState });

    // Resolve item ID once using the first authenticated context
    if (needsId && itemId == null && role !== 'none') {
      itemId = await getFirstItemId(ctx);
      if (itemId == null) {
        console.error(`  ⚠  No items in inventory — skipping shots that need {ID}`);
      } else {
        console.log(`  → Using item ID ${itemId} for {ID}-templated shots`);
      }
    }

    for (const s of shots) {
      try {
        await shoot(ctx, s, itemId);
      } catch (err) {
        failures += 1;
        const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
        console.error(`  ✗  ${s.guide}/step-${s.step}  FAILED  →  ${msg}`);
      }
    }
    await ctx.close();
  }

  await browser.close();

  const touchedGuides = new Set(filtered.map(s => s.guide));
  const manualReminders = Object.entries(MANUAL_NOTES).filter(([g]) => touchedGuides.has(g));
  if (manualReminders.length > 0) {
    console.log('\n--- Manual captures still needed ---');
    for (const [guide, notes] of manualReminders) {
      console.log(`${guide}:`);
      notes.forEach(n => console.log(`  • ${n}`));
    }
  }

  console.log(`\nDone. PNGs in ${path.relative(ROOT, SHOTS_DIR)}/`);
  if (failures > 0) {
    console.error(`${failures} screenshot(s) failed.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
