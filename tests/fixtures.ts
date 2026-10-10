/**
 * Shared Playwright test fixtures for Inventori Masjid UAT.
 *
 * Extends base `test` with:
 *   - `adminPage`  — page with admin session pre-loaded
 *   - `ajkPage`    — page with AJK session pre-loaded
 *   - `anonPage`   — page with no session (security tests)
 *   - `uatPrefix`  — string prefix for test-created items
 */

import { test as base, type Page } from '@playwright/test';
import path from 'path';

export const UAT_PREFIX = '[UAT]';
export const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:3000';

type Fixtures = {
  adminPage: Page;
  ajkPage: Page;
  anonPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '../playwright/.auth/admin.json'),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  ajkPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '../playwright/.auth/ajk.json'),
    });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  anonPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
