/**
 * One-time auth setup — run with `bun run test:uat:setup`
 *
 * Opens a headed browser so you can complete Google OAuth manually.
 * After login is detected, saves the storageState (cookies + localStorage)
 * to playwright/.auth/{role}.json for reuse across all tests.
 *
 * Usage:
 *   SETUP_ROLE=admin bun run test:uat:setup   → saves playwright/.auth/admin.json
 *   SETUP_ROLE=ajk   bun run test:uat:setup   → saves playwright/.auth/ajk.json
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:3000';
const role = (process.env.SETUP_ROLE ?? 'admin') as 'admin' | 'ajk';
const authFile = path.join(__dirname, `../playwright/.auth/${role}.json`);

// Ensure the directory exists
fs.mkdirSync(path.dirname(authFile), { recursive: true });

// Allow 5 minutes — Google OAuth + 2FA can be slow
setup.setTimeout(300_000);

setup(`save ${role} session`, async ({ page }) => {
  console.log(`\n🔑  Opening browser for ${role.toUpperCase()} login…`);
  console.log(`    → Using real Chrome so Google OAuth works.`);
  console.log(`    → Click "Log Masuk dengan Google", pick your account, and wait.\n`);

  await page.goto(`${BASE_URL}/sign-in`);

  // Verify the sign-in page loaded
  await expect(page.getByText('Log Masuk dengan Google')).toBeVisible({ timeout: 15_000 });

  console.log('    ⌛  Waiting for you to complete Google login (up to 3 minutes)…');
  console.log('    ⌛  The window will close automatically once you reach the dashboard.\n');

  // Wait for the dashboard to load after successful login.
  // The user must complete Google OAuth manually in the headed Chrome window.
  // Allow up to 3 minutes for slow account chooser / 2FA.
  await page.waitForURL(`${BASE_URL}/`, { timeout: 180_000 });

  // Confirm we're really on the dashboard (stat cards are visible)
  await expect(page.getByText('Aktif')).toBeVisible({ timeout: 15_000 });

  // Save all cookies and localStorage
  await page.context().storageState({ path: authFile });

  console.log(`\n✅  Session saved → ${authFile}`);
  console.log(`    Valid for 7 days. Re-run this script when it expires.\n`);
});
