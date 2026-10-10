import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load .env.test so RESEND_API_KEY and UAT_BASE_URL are available at test runtime
config({ path: '.env.test', override: false });

/**
 * UAT test suite — Inventori Masjid
 *
 * Auth strategy: storageState (cookies saved after one-time manual login).
 *   1. Run `bun run test:uat:setup` once — headed browser opens, log in as
 *      admin then AJK, cookies saved to playwright/.auth/*.json
 *   2. Run `bun run test:uat` — all tests reuse saved sessions (no re-login)
 *
 * Projects:
 *   setup:admin  — saves admin session (runs first, once)
 *   setup:ajk    — saves AJK session (runs first, once)
 *   admin        — tests that require admin role
 *   ajk          — tests that require AJK role
 *   no-auth      — tests with no session (security checks)
 */

const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  outputDir: './playwright-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },

  /* Retry flaky tests once on CI */
  retries: process.env.CI ? 1 : 0,

  /* Run tests sequentially — we share a live DB with seed data */
  workers: 1,

  /* Prevent accidental test.only() from silently passing CI */
  forbidOnly: !!process.env.CI,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ms-MY',
    timezoneId: 'Asia/Kuala_Lumpur',
  },

  projects: [
    // ── Setup projects (manual login, run once) ──────────────────────────────
    // Uses real system Chrome (not bundled Chromium) so Google OAuth works.
    {
      name: 'setup:admin',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',        // real Chrome — Google blocks Playwright's Chromium
        headless: false,
        storageState: undefined,
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },
    {
      name: 'setup:ajk',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: false,
        storageState: undefined,
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },

    // ── Admin role tests ─────────────────────────────────────────────────────
    // NOTE: storageState must exist before running. Generate it once with:
    //   SETUP_ROLE=admin bun run test:uat:setup:admin
    {
      name: 'admin',
      testMatch: /uat\/(?!09-mobile)/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
    },

    // ── AJK role tests ───────────────────────────────────────────────────────
    // NOTE: storageState must exist before running. Generate it once with:
    //   SETUP_ROLE=ajk bun run test:uat:setup:ajk
    {
      name: 'ajk',
      testMatch: /uat\/01-auth-security|uat\/03-inventory|uat\/04-operations|uat\/06-master-data/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/ajk.json',
      },
    },

    // ── No-auth / security tests ─────────────────────────────────────────────
    {
      name: 'no-auth',
      testMatch: /uat\/01-auth-security/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined,
      },
    },

    // ── Mobile viewport ──────────────────────────────────────────────────────
    {
      name: 'mobile',
      testMatch: /uat\/09-mobile/,
      use: {
        ...devices['Pixel 7'],
        storageState: 'playwright/.auth/admin.json',
      },
    },
  ],
});
