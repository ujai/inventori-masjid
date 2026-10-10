/**
 * UAT §6 — Data Induk
 */

import { test, expect } from '../fixtures';

test.describe('§6 — Data Induk', () => {
  test('§6.1 — 8 categories with prefix codes are visible', async ({ adminPage }) => {
    await adminPage.goto('/admin/master-data');
    for (const prefix of ['DWN', 'MSL', 'ELK', 'FSI', 'PEJ', 'DPR', 'KBS', 'LAI']) {
      await expect(adminPage.getByText(prefix, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    }
    for (const name of ['Dewan Solat', 'Elektronik', 'Fasiliti', 'Dapur']) {
      await expect(adminPage.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test('§6.2 — Edit category name → saved → restored', async ({ adminPage }) => {
    await adminPage.goto('/admin/master-data');
    const editBtn = adminPage.getByRole('button', { name: /Edit/i }).first();
    await editBtn.click();
    const nameInput = adminPage.getByLabel(/Nama|name/i).first();
    const original = await nameInput.inputValue();
    const testName = `${original} UAT`;
    await nameInput.clear();
    await nameInput.fill(testName);
    await adminPage.getByRole('button', { name: /Simpan|Save/i }).click();
    await expect(adminPage.getByText(testName, { exact: false })).toBeVisible({ timeout: 10_000 });
    // Restore
    await adminPage.getByRole('button', { name: /Edit/i }).first().click();
    const nameInput2 = adminPage.getByLabel(/Nama|name/i).first();
    await nameInput2.clear();
    await nameInput2.fill(original);
    await adminPage.getByRole('button', { name: /Simpan|Save/i }).click();
    await expect(adminPage.getByText(original, { exact: false })).toBeVisible();
  });

  test('§6.3 — Add unit "tin" → appears in dropdown → cleaned up', async ({ adminPage }) => {
    await adminPage.goto('/admin/master-data');

    // Tab buttons are plain <button> elements with text "Kategori" / "Unit"
    // NOT role="tab" — use getByRole('button') with exact text
    await adminPage.getByRole('button', { name: 'Unit' }).click();

    // "Unit baru" button (from UnitsTab in MasterDataClient.tsx)
    const addBtn = adminPage.getByRole('button', { name: /Unit baru/i });
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();

    // Form IDs from MasterDataClient.tsx: #unit-name, #unit-code
    await adminPage.locator('#unit-name').fill('tin');
    await adminPage.locator('#unit-code').fill('tin');
    await adminPage.getByRole('button', { name: /Simpan|Save/i }).click();

    // Unit should appear in the list
    await expect(adminPage.getByText('tin', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    // Verify "tin" appears in /items/new unit dropdown
    await adminPage.goto('/items/new');
    const tinOption = adminPage.locator('#unitId option', { hasText: /^tin$/i });
    await expect(tinOption).toBeAttached({ timeout: 5_000 });

    // Clean up — delete "tin" unit
    await adminPage.goto('/admin/master-data');
    await adminPage.getByRole('button', { name: 'Unit' }).click();
    const tinRow = adminPage.locator('li, tr').filter({ hasText: /^tin$/i });
    const deleteBtn = tinRow.getByRole('button', { name: /Padam|Delete|Hapus/i });
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      const confirmBtn = adminPage.getByRole('button', { name: /Sahkan|Ya/i });
      if (await confirmBtn.count() > 0) await confirmBtn.click();
    }
  });
});
