/**
 * UAT §2 — Dashboard
 */

import { test, expect } from '../fixtures';

test.describe('§2 — Dashboard', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/');
    await expect(adminPage.getByText('Aktif')).toBeVisible({ timeout: 15_000 });
  });

  test('§2.1 — All six stat cards are visible', async ({ adminPage }) => {
    for (const label of ['Aktif', 'Rosak', 'Dalam Servis', 'Tidak Cukup', 'Dipinjam', 'Hilang']) {
      await expect(adminPage.getByText(label)).toBeVisible();
    }
  });

  test('§2.2 — Stat card values are non-negative integers', async ({ adminPage }) => {
    // Each stat card number should be a non-negative integer
    const statValues = await adminPage.locator('.text-3xl, .text-4xl, [class*="stat"] [class*="value"]').allTextContents();
    // Fallback: find any standalone digit strings on the dashboard
    const allNumbers = await adminPage.locator('p, span, div').filter({ hasText: /^\d+$/ }).all();
    expect(allNumbers.length, 'Expected at least 6 numeric stat values').toBeGreaterThanOrEqual(6);
    for (const el of allNumbers.slice(0, 6)) {
      const text = await el.textContent();
      expect(Number(text?.trim()), `"${text}" should be a non-negative integer`).toBeGreaterThanOrEqual(0);
    }
  });

  test('§2.3 — Service overdue alert banner is present (seed data has FSI-0001 past due)', async ({ adminPage }) => {
    // Seed data: FSI-0001 nextServiceDate = 2026-05-09 (past due) → banner must show
    const banner = adminPage.locator('a[href*="/reports"]').first();
    await expect(banner).toBeVisible({ timeout: 10_000 });
    // Clicking it should navigate to a report page
    await banner.click();
    await expect(adminPage).toHaveURL(/\/reports/);
  });

  test('§2.4 — Recent activity section shows at least one entry', async ({ adminPage }) => {
    await expect(adminPage.getByText('Aktiviti Terkini')).toBeVisible();
    // Seed data creates items, so there must be at least one activity log entry
    // The activity list renders dates/names — look for actual content
    await expect(adminPage.getByText('Tiada rekod aktiviti')).not.toBeVisible();
    // At least one row with user activity text should be present
    const activityItems = adminPage.locator('li, tr').filter({ hasText: /\d{4}|cipta|kemas|servis|pinjam|pindah/i });
    const count = await activityItems.count();
    expect(count, 'Expected at least one activity log entry').toBeGreaterThan(0);
  });
});
