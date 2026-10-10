/**
 * UAT §7 — Laporan & CSV
 *
 * Covers:
 *   7.1–7.8  Report pages, CSV download, handover report (existing)
 *   7.9      Timestamps shown in UI use Malaysia time (UTC+8), not UTC
 */

import { test, expect, BASE_URL } from '../fixtures';

const REPORT_SLUGS = [
  'ikut-kategori', 'ikut-lokasi', 'perlu-servis',
  'dipinjam', 'hampir-luput', 'pelupusan', 'kehilangan-kecurian',
] as const;

test.describe('§7 — Laporan & CSV', () => {
  test('§7.1 — Reports page shows all 7 report cards', async ({ adminPage }) => {
    await adminPage.goto('/reports');

    // Use .first() to avoid strict-mode when card title + subtitle both match
    for (const label of [
      /Ikut Kategori/i, /Ikut Lokasi/i, /Perlu Servis/i,
      /Sedang Dipinjam/i, /Hampir Luput/i, /Pelupusan/i, /Kehilangan/i,
    ]) {
      await expect(adminPage.getByText(label).first()).toBeVisible({ timeout: 10_000 });
    }

    const links = adminPage.locator('a[href*="/reports/"]');
    expect(await links.count()).toBeGreaterThanOrEqual(7);
  });

  test('§7.2 — Ikut Kategori shows per-category counts', async ({ adminPage }) => {
    await adminPage.goto('/reports/ikut-kategori');
    await expect(adminPage.getByRole('table').first()).toBeVisible({ timeout: 10_000 });

    for (const cat of ['Dapur', 'Elektronik', 'Fasiliti']) {
      await expect(adminPage.getByText(cat, { exact: true }).first()).toBeVisible();
    }
    const numericCells = adminPage.locator('td').filter({ hasText: /^\d+$/ });
    expect(await numericCells.count()).toBeGreaterThan(0);
  });

  test('§7.3 — Download CSV returns a .csv file', async ({ adminPage }) => {
    await adminPage.goto('/reports/ikut-kategori');

    const [download] = await Promise.all([
      adminPage.waitForEvent('download'),
      adminPage.getByRole('link', { name: /Muat turun CSV|CSV/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('§7.4 — CSV starts with UTF-8 BOM for Excel compatibility', async ({ adminPage }) => {
    const cookies = await adminPage.context().cookies(BASE_URL);
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const res = await adminPage.request.get(`${BASE_URL}/api/reports/ikut-kategori/export`, {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');

    const buf = await res.body();
    expect(
      buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf,
      'CSV must start with UTF-8 BOM (EF BB BF)',
    ).toBe(true);
  });

  test('§7.5 — Sedang Dipinjam report loads without error', async ({ adminPage }) => {
    await adminPage.goto('/reports/dipinjam');
    await expect(adminPage.getByText(/Sedang Dipinjam|dipinjam/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByText(/500|Ralat dalaman/i)).not.toBeVisible();
  });

  for (const slug of REPORT_SLUGS) {
    test(`§7 — /reports/${slug} loads without error`, async ({ adminPage }) => {
      await adminPage.goto(`/reports/${slug}`);
      await expect(adminPage.getByText(/500|Ralat dalaman|Something went wrong/i)).not.toBeVisible({ timeout: 10_000 });
    });
  }

  test('§7.6 — Reports page shows Serah Terima AJK featured card', async ({ adminPage }) => {
    await adminPage.goto('/reports');
    await expect(adminPage.getByText(/Serah Terima AJK/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(adminPage.locator('a[href="/reports/handover"]')).toBeVisible();
  });

  test('§7.7 — Handover report loads, shows category sections and print button', async ({ adminPage }) => {
    await adminPage.goto('/reports/handover');
    await expect(adminPage.getByText(/500|Ralat dalaman|Something went wrong/i)).not.toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('button', { name: /Cetak/i })).toBeVisible({ timeout: 10_000 });
    // At least one category section heading should be visible
    await expect(adminPage.locator('h2, h3').first()).toBeVisible();
  });

  test('§7.8 — Handover report shows summary stats', async ({ adminPage }) => {
    await adminPage.goto('/reports/handover');
    await expect(adminPage.getByText(/Jumlah Barang|Aktif|Rosak\/Servis|Dipinjam/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('§7.9 — Timestamps use Malaysia time (MYT = UTC+8), not UTC', async ({ adminPage }) => {
    // Record UTC time before page load
    const beforeUtc = new Date();
    const utcHour   = beforeUtc.getUTCHours();
    const mytHour   = (utcHour + 8) % 24; // MYT is UTC+8

    // The handover report embeds the current time as "Dijana pada: <timestamp>"
    await adminPage.goto('/reports/handover');
    await adminPage.waitForLoadState('networkidle');

    // Find the "Dijana pada" line
    const generatedAtEl = adminPage.locator('text=/Dijana pada/i');
    await expect(generatedAtEl).toBeVisible({ timeout: 10_000 });

    const rawText = await generatedAtEl.textContent() ?? '';
    console.log(`\n  🕐 Handover report generated-at text: "${rawText}"`);

    // The text should NOT contain an ISO timestamp (UTC leakage)
    expect(rawText, 'Timestamp must not be raw ISO format').not.toMatch(/T\d{2}:\d{2}:\d{2}/);
    expect(rawText, 'Timestamp must not end with Z (UTC marker)').not.toMatch(/\d{2}Z/);

    // The text should include a recognizable Malay locale date fragment
    // e.g. "12 Mei 2026" or "12/05/2026" — not just a bare number
    expect(rawText, 'Timestamp should include a year').toMatch(/202\d/);

    // Verify the displayed hour matches MYT, not UTC.
    // We accept ±1 hour tolerance for clocks crossing midnight.
    // Extract hour from the timestamp string — look for HH:MM pattern
    const timeMatch = rawText.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const displayedHour = parseInt(timeMatch[1]!, 10);
      const expectedHours = new Set([
        mytHour,
        (mytHour - 1 + 24) % 24, // -1 tolerance
        (mytHour + 1) % 24,       // +1 tolerance
      ]);
      const isUtcHour = displayedHour === utcHour;

      // Only assert MYT if UTC and MYT hours are meaningfully different (≥2h apart)
      const hourDiff = Math.min(
        Math.abs(mytHour - utcHour),
        24 - Math.abs(mytHour - utcHour),
      );
      if (hourDiff >= 2) {
        expect(
          expectedHours.has(displayedHour),
          `Expected MYT hour ~${mytHour} but got ${displayedHour} (UTC hour is ${utcHour}). Timezone may be wrong.`,
        ).toBe(true);
        expect(
          isUtcHour,
          `Displayed hour ${displayedHour} matches UTC hour — timestamps are in UTC, not MYT`,
        ).toBe(false);
      }
      console.log(`  ✅ Displayed hour: ${displayedHour}  MYT expected: ${mytHour}  UTC: ${utcHour}`);
    }

    // Also verify the activity log page uses locale formatting (not raw UTC)
    await adminPage.goto('/activity');
    await adminPage.waitForLoadState('networkidle');

    // Activity log timestamps should not contain ISO 'T' separator
    const activityItems = adminPage.locator('li time, li .text-slate-400, li .text-xs');
    const count = await activityItems.count();
    if (count > 0) {
      const firstTs = await activityItems.first().textContent() ?? '';
      console.log(`  🕐 Activity log first timestamp: "${firstTs}"`);
      expect(firstTs, 'Activity timestamp must not be raw ISO').not.toMatch(/T\d{2}:\d{2}:\d{2}/);
    }
  });

  test('§7.10 — Handover report shows PDF download button', async ({ adminPage }) => {
    await adminPage.goto('/reports/handover');
    await expect(adminPage.getByText(/500|Ralat dalaman|Something went wrong/i)).not.toBeVisible({ timeout: 10_000 });
    await expect(adminPage.getByRole('link', { name: /Muat turun PDF|PDF/i })).toBeVisible({ timeout: 10_000 });
  });

  test('§7.11 — GET /api/reports/handover/export returns application/pdf', async ({ adminPage }) => {
    const cookies = await adminPage.context().cookies(BASE_URL);
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    const res = await adminPage.request.get(`${BASE_URL}/api/reports/handover/export`, {
      headers: { Cookie: cookieHeader },
    });

    expect(res.status(), 'PDF export should return 200').toBe(200);
    expect(res.headers()['content-type'], 'Response should be application/pdf').toContain('application/pdf');

    const buf = await res.body();
    // PDF magic bytes: %PDF-
    expect(
      buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46,
      'Response body should start with PDF magic bytes (%PDF-)',
    ).toBe(true);

    console.log(`\n  ✅ PDF export: ${buf.length} bytes, content-type: ${res.headers()['content-type']}`);
  });
});
