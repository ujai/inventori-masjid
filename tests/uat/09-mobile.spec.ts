/**
 * UAT §9 — Pengalaman Mudah Alih (Mobile UX)
 * Viewport: Pixel 7 (412×915)
 */

import { test, expect } from '../fixtures';

test.describe('§9 — Mobile UX (Pixel 7 — 412×915)', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 412, height: 915 });
  });

  test('§9.1 — Dashboard stat cards visible, no horizontal scroll', async ({ adminPage }) => {
    await adminPage.goto('/');
    for (const label of ['Aktif', 'Rosak', 'Dalam Servis', 'Tidak Cukup', 'Dipinjam', 'Hilang']) {
      await expect(adminPage.getByText(label)).toBeVisible({ timeout: 15_000 });
    }
    const scrollWidth = await adminPage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await adminPage.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, 'No horizontal scroll on dashboard').toBeLessThanOrEqual(clientWidth + 2);
  });

  test('§9.2 — Items list no horizontal scroll at mobile width', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await expect(
      adminPage.locator('a[href*="/items/"]:not([href="/items/new"])').first(),
    ).toBeVisible({ timeout: 15_000 });

    const scrollWidth = await adminPage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await adminPage.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, 'No horizontal scroll on items list').toBeLessThanOrEqual(clientWidth + 2);
  });

  test('§9.3 — Add item form Save button visible at bottom', async ({ adminPage }) => {
    await adminPage.goto('/items/new');
    await adminPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(adminPage.getByRole('button', { name: /Simpan|Save/i })).toBeVisible({ timeout: 5_000 });
  });

  test('§9.4 — Mobile hamburger menu opens drawer with nav links', async ({ adminPage }) => {
    await adminPage.goto('/');

    // The mobile toggle button has aria-label="Menu" (see Header.tsx line 77)
    const menuBtn = adminPage.getByRole('button', { name: 'Menu' });
    await expect(menuBtn).toBeVisible({ timeout: 10_000 });
    await menuBtn.click();

    // Mobile drawer: div.md:hidden.border-t (rendered when open=true)
    // Use a more specific selector matching the actual element
    const drawer = adminPage.locator('div.md\\:hidden.border-t').first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });

    const navLinks = drawer.locator('a[href]');
    expect(await navLinks.count(), 'Drawer should have navigation links').toBeGreaterThan(0);
  });

  test('§9.5 — Lightbox close button within mobile viewport', async ({ adminPage }) => {
    await adminPage.goto('/items');
    await adminPage.getByText(/Penghawa Dingin/i).first().click();
    await expect(adminPage).toHaveURL(/\/items\/\d+/);

    const thumbnail = adminPage.locator('img[src*="r2"], [class*="thumbnail"], [class*="photo"] img').first();
    if (await thumbnail.count() === 0) {
      console.log('§9.5 — No photos found; skipping lightbox test');
      return;
    }
    await thumbnail.click();

    const lightbox = adminPage.locator('[role="dialog"], [class*="lightbox"], [class*="modal"]').first();
    await expect(lightbox).toBeVisible({ timeout: 5_000 });

    const closeBtn = lightbox.getByRole('button', { name: /tutup|close/i });
    if (await closeBtn.count() > 0) {
      const box = await closeBtn.boundingBox();
      if (box) {
        expect(box.y + box.height, 'Close button within 915px viewport').toBeLessThanOrEqual(915);
      }
    }
  });
});
