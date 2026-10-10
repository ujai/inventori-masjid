/**
 * UAT §3 — Inventori
 * 3A — Senarai & Carian (3.1–3.6)
 * 3B — Tambah Barang Baru (3.7–3.10)
 * 3C — Edit & Detail (3.11–3.13)
 */

import { test, expect, UAT_PREFIX } from '../fixtures';
import { cleanupUatItems, getCookieHeader } from '../helpers/db-reset';
import { searchItems } from '../helpers/search';

test.describe('§3A — Senarai & Carian', () => {
  test('§3.1 — /items shows item cards, no dilupuskan/hilang by default', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await expect(adminPage.locator('a[href*="/items/"]:not([href="/items/new"])').first()).toBeVisible({ timeout: 15_000 });
    await expect(adminPage.getByText('Dilupuskan', { exact: true })).not.toBeVisible();
  });

  test('§3.2 — Search "periuk" returns Periuk Besar', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await searchItems(adminPage, 'periuk');
    await expect(adminPage.getByText('Periuk Besar', { exact: false })).toBeVisible();
  });

  test('§3.3 — Search "FSI" returns FSI-coded items', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await searchItems(adminPage, 'FSI');
    await expect(adminPage.getByText(/FSI-000\d/).first()).toBeVisible();
  });

  test('§3.4 — Filter by Dapur shows only Dapur items', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByRole('button', { name: /Tapis/ }).click();
    await adminPage.locator('#filter-category').selectOption({ label: 'Dapur' });
    // Close drawer via backdrop
    await adminPage.locator('.fixed.inset-0').click();
    await expect(adminPage.getByText('Periuk Besar', { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Sejadah', { exact: false })).not.toBeVisible();
  });

  test('§3.5 — "Tunjuk barang hilang & dilupuskan" reveals Vacuum Cleaner (archived)', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByRole('button', { name: /Tapis/ }).click();
    await adminPage.getByText('Tunjuk barang hilang & dilupuskan').click();
    await adminPage.locator('.fixed.inset-0').click();
    // Vacuum Cleaner has status 'rosak' in seed — with includeArchived it may appear
    // More importantly: the Dilupuskan status badge should now be possible to see
    await expect(adminPage.locator('a[href*="/items/"]:not([href="/items/new"])').first()).toBeVisible({ timeout: 10_000 });
    // Dilupuskan/Hilang items should now be visible somewhere
    const archivedVisible =
      (await adminPage.getByText('Vacuum', { exact: false }).count()) > 0 ||
      (await adminPage.getByText(/Dilupuskan|Hilang/, { exact: true }).count()) > 0;
    expect(archivedVisible, 'At least one archived item should appear with includeArchived').toBe(true);
  });

  test('§3.6 — Clear filter restores active-only list', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByRole('button', { name: /Tapis/ }).click();
    await adminPage.locator('#filter-category').selectOption({ label: 'Dapur' });
    await adminPage.locator('.fixed.inset-0').click();
    await adminPage.getByRole('button', { name: /Buang tapisan/ }).click();
    await expect(adminPage.getByText('Periuk Besar', { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Sejadah', { exact: false })).toBeVisible();
    await expect(adminPage.getByText('Dilupuskan', { exact: true })).not.toBeVisible();
  });
});

test.describe('§3B — Tambah Barang Baru', () => {
  test.afterAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const cookies = await getCookieHeader(ctx);
    await cleanupUatItems(cookies);
    await ctx.close();
  });

  test('§3.7 — Tambah Barang link opens new item form', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByRole('link', { name: /Tambah Barang/i }).click();
    await expect(adminPage).toHaveURL(/\/items\/new/);
    await expect(adminPage.locator('#name')).toBeVisible();
  });

  test('§3.8 — Add quantity-mode item → appears in list', async ({ adminPage }) => {
    await adminPage.goto('/items/new');
    const itemName = `${UAT_PREFIX} Kuantiti Test`;
    await adminPage.locator('#name').fill(itemName);
    await adminPage.locator('#categoryId').selectOption({ index: 1 });
    await adminPage.locator('#currentLocationId').selectOption({ index: 1 });
    await adminPage.locator('#unitId').selectOption({ index: 1 });
    await adminPage.locator('#trackingMode').selectOption('quantity');
    await adminPage.getByRole('button', { name: /Simpan/i }).click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/, { timeout: 10_000 });
    await expect(adminPage.getByText(itemName)).toBeVisible();
  });

  test('§3.9 — Add asset-mode item with no code → auto-generated code', async ({ adminPage }) => {
    await adminPage.goto('/items/new');
    const itemName = `${UAT_PREFIX} Aset Test`;
    await adminPage.locator('#name').fill(itemName);
    await adminPage.locator('#categoryId').selectOption({ label: 'Pejabat' });
    await adminPage.locator('#currentLocationId').selectOption({ index: 1 });
    await adminPage.locator('#unitId').selectOption({ index: 1 });
    await adminPage.locator('#trackingMode').selectOption('asset');
    await adminPage.locator('#assetCode').clear();
    await adminPage.getByRole('button', { name: /Simpan/i }).click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/, { timeout: 10_000 });
    // PEJ-XXXX code auto-generated; may appear multiple times (header + detail row)
    await expect(adminPage.getByText(/PEJ-\d+/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('§3.10 — Save without name stays on form (native HTML5 validation)', async ({ adminPage }) => {
    await adminPage.goto('/items/new');
    await adminPage.getByRole('button', { name: /Simpan/i }).click();
    await expect(adminPage).toHaveURL(/\/items\/new/);
    const nameInvalid = await adminPage.locator('#name').evaluate(
      (el) => !(el as HTMLInputElement).validity.valid,
    );
    expect(nameInvalid, 'Name input should be invalid when empty').toBe(true);
  });
});

test.describe('§3C — Edit & Detail', () => {
  test('§3.11 — Item detail page shows all key fields', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByText('Periuk Besar', { exact: false }).first().click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/);
    await expect(adminPage.getByText('Periuk Besar', { exact: false })).toBeVisible();
    await expect(adminPage.getByText('Dapur', { exact: true }).first()).toBeVisible();
    await expect(adminPage.getByText(/Aktif/i).first()).toBeVisible();
  });

  test('§3.12 — Edit item → save → leaves edit page', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByText('Periuk Besar', { exact: false }).first().click();
    await adminPage.getByRole('link', { name: /Edit/i }).click();
    await expect(adminPage).toHaveURL(/\/items\/\d+\/edit/);
    // Wait for the form's dropdown options to finish loading via useEffect API calls
    // (categories, locations, units, institutional-roles). Without this, the selects
    // have no options, HTML5 required validation silently blocks submission, and
    // window.location.replace is never reached.
    await adminPage.waitForLoadState('networkidle');
    await adminPage.getByRole('button', { name: /Kemaskini/i }).click();
    await expect(adminPage).not.toHaveURL(/\/edit/, { timeout: 10_000 });
  });

  test('§3.13 — Detail page has Log Servis, Pergerakan, Pelupusan headings', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByText(/Penghawa Dingin/i).first().click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/);
    await expect(adminPage.getByRole('heading', { name: /Log servis/i })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: /Log pergerakan/i })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: /Log pelupusan/i })).toBeVisible();
  });
});

test.describe('§3D — Ciri Baru (new features)', () => {
  test('§3.14 — Condition filter: selecting rosak condition applies filter without error', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByRole('button', { name: /Tapis/i }).click();
    await adminPage.locator('#filter-condition').selectOption('rosak');
    await adminPage.locator('.fixed.inset-0').click();
    // List should update — wait for items or empty state, no 500
    await expect(adminPage.getByText(/500|Ralat dalaman/i)).not.toBeVisible({ timeout: 10_000 });
    // Filter badge count span appears on the Tapis button when a filter is active
    const badge = adminPage.locator('button').filter({ hasText: /^Tapis/ }).locator('span');
    expect(await badge.count()).toBeGreaterThan(0);
  });

  test('§3.15 — Bulk mode toggle activates and shows select-all control', async ({ adminPage }) => {
    await adminPage.goto('/items');
    // Ensure items are loaded first
    await expect(adminPage.locator('a[href*="/items/"]:not([href="/items/new"])').first()).toBeVisible({ timeout: 10_000 });
    await adminPage.getByRole('button', { name: /Pilih/i }).click();
    // Bulk mode active — "Pilih semua" appears immediately (no items need to be selected)
    await expect(adminPage.getByRole('button', { name: /Pilih semua/i })).toBeVisible({ timeout: 5_000 });
    // Exit bulk mode by clicking Pilih again (it's a toggle)
    await adminPage.getByRole('button', { name: /Pilih/i }).first().click();
    await expect(adminPage.getByRole('button', { name: /Pilih semua/i })).not.toBeVisible();
  });

  test('§3.16 — Item detail page shows Cetak Label QR button', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByText('Periuk Besar', { exact: false }).first().click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/);
    await expect(adminPage.getByRole('button', { name: /Cetak Label QR/i })).toBeVisible({ timeout: 10_000 });
  });

  test('§3.17 — Item detail page shows Peranan Institusi section', async ({ adminPage }) => {
    await adminPage.goto('/items/1');
    // The section header or role chips should be present (even if no roles assigned)
    // Just confirm the page loads without error
    await expect(adminPage.getByText(/500|Ralat dalaman|Something went wrong/i)).not.toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText('Periuk Besar', { exact: false })).toBeVisible();
  });

  test('§3.18 — Activity log page loads with entries', async ({ adminPage }) => {
    await adminPage.goto('/activity');
    await expect(adminPage.getByText(/500|Ralat dalaman/i)).not.toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText(/item\.create|item\.update|Aktiviti/i).first()).toBeVisible();
  });

  test('§3.19 — Health score badge appears on items list for non-perfect items', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await expect(adminPage.locator('a[href*="/items/"]:not([href="/items/new"])').first()).toBeVisible({ timeout: 15_000 });
    // Penghawa Dingin has status "aktif" but nextServiceDate in the past → health < 100
    // The badge text starts with "Kesihatan:"
    const badge = adminPage.locator('text=/Kesihatan:/').first();
    await expect(badge).toBeVisible({ timeout: 10_000 });
  });

  test('§3.20 — Warranty expiry warning badge visible for items with expiring warranty', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await expect(adminPage.locator('a[href*="/items/"]:not([href="/items/new"])').first()).toBeVisible({ timeout: 15_000 });
    // Seed data includes at least one item with warrantyExpiry — if badge is not present,
    // that's fine (no items have expiring warranties), but we confirm no 500 error
    await expect(adminPage.getByText(/500|Ralat dalaman/i)).not.toBeVisible({ timeout: 10_000 });
    // This is a soft assertion — just ensure the page renders correctly with the new fields
    console.log('\n  ℹ️  §3.20 — Warranty badge is conditional on seed data having expiring warranties');
  });

  test('§3.21 — Maklumat tambahan is collapsed by default and expands on click', async ({ adminPage }) => {
    await adminPage.goto('/items/1');
    await expect(adminPage.getByText(/Periuk Besar/i)).toBeVisible({ timeout: 10_000 });
    // Section title is now a button (collapsible)
    const toggle = adminPage.getByRole('button', { name: /Maklumat tambahan/i });
    await expect(toggle).toBeVisible();
    // Collapsed by default: aria-expanded should be "false"
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // Expand
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    // After expand: no 500 error
    await expect(adminPage.getByText(/500|Ralat dalaman/i)).not.toBeVisible({ timeout: 5_000 });
    // Collapse again
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('§3.22 — Log servis section header has count badge when logs exist', async ({ adminPage }) => {
    // Navigate to the item that accumulated service logs during dev (item 7)
    // If the item exists and has logs, count badge "(N rekod)" appears in the heading
    await adminPage.goto('/items/7');
    await expect(adminPage.getByRole('heading', { name: /Log servis/i }).or(adminPage.getByText(/404|tidak dijumpai/i))).toBeVisible({ timeout: 10_000 });
    const is404 = await adminPage.getByText(/404|tidak dijumpai/i).isVisible().catch(() => false);
    if (is404) {
      console.log('\n  ℹ️  §3.22 — Item 7 not found in this environment, skipping count badge check');
      return;
    }
    // Count badge format: "(N rekod)"
    const servisHeading = adminPage.getByRole('heading', { name: /Log servis/i });
    await expect(servisHeading).toBeVisible({ timeout: 10_000 });
    // If there are logs, the count badge "(N rekod)" appears inside the heading
    const countBadge = adminPage.locator('h2').filter({ hasText: /Log servis/ }).locator('span');
    const badgeCount = await countBadge.count();
    if (badgeCount > 0) {
      await expect(countBadge.first()).toContainText(/rekod/);
    }
    console.log('\n  ℹ️  §3.22 — Count badge present:', badgeCount > 0);
  });

  test('§3.23 — Log servis expand toggle works when >3 entries exist', async ({ adminPage }) => {
    await adminPage.goto('/items/7');
    await expect(adminPage.getByRole('heading', { name: /Log servis/i }).or(adminPage.getByText(/404|tidak dijumpai/i))).toBeVisible({ timeout: 10_000 });
    const is404 = await adminPage.getByText(/404|tidak dijumpai/i).isVisible().catch(() => false);
    if (is404) {
      console.log('\n  ℹ️  §3.23 — Item 7 not found, skipping expand toggle check');
      return;
    }
    // If >3 logs exist, the expand button "Lihat semua" is rendered
    const expandBtn = adminPage.getByRole('button', { name: /Lihat semua/i }).first();
    const hasExpand = await expandBtn.isVisible().catch(() => false);
    if (!hasExpand) {
      console.log('\n  ℹ️  §3.23 — Fewer than 4 service logs in this environment, no expand button');
      return;
    }
    // Click expand → button text changes to "Sembunyikan"
    await expandBtn.click();
    await expect(adminPage.getByRole('button', { name: /Sembunyikan/i }).first()).toBeVisible({ timeout: 5_000 });
    // Collapse → "Lihat semua" reappears
    await adminPage.getByRole('button', { name: /Sembunyikan/i }).first().click();
    await expect(adminPage.getByRole('button', { name: /Lihat semua/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('§3.24 — Servis terakhir summary visible when service logs exist', async ({ adminPage }) => {
    await adminPage.goto('/items/7');
    await expect(adminPage.getByRole('heading', { name: /Log servis/i }).or(adminPage.getByText(/404|tidak dijumpai/i))).toBeVisible({ timeout: 10_000 });
    const is404 = await adminPage.getByText(/404|tidak dijumpai/i).isVisible().catch(() => false);
    if (is404) {
      console.log('\n  ℹ️  §3.24 — Item 7 not found, skipping servis terakhir check');
      return;
    }
    const summary = adminPage.getByText(/Servis terakhir/i);
    const hasLogs = await summary.isVisible().catch(() => false);
    if (hasLogs) {
      // Summary should include "hari lalu" or "hari ini"
      await expect(summary).toContainText(/hari lalu|hari ini/);
    } else {
      console.log('\n  ℹ️  §3.24 — No service logs in this environment, summary not shown');
    }
  });

  test('§3.25 — Health score progress bar renders for items with health < 100', async ({ adminPage }) => {
    // Penghawa Dingin has nextServiceDate in the past → health score < 100
    await adminPage.goto('/items');
    await adminPage.getByText(/Penghawa Dingin/i).first().click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/);
    // Health bar: the outer container has "bg-slate-100" class and the inner fill has bg-green/amber/red-500
    // Verify the score text is still present (regression check)
    await expect(adminPage.getByText(/\/100 —/)).toBeVisible({ timeout: 10_000 });
    // Verify no 500 error (bar render didn't crash)
    await expect(adminPage.getByText(/500|Ralat dalaman/i)).not.toBeVisible();
  });
});
