/**
 * UAT §1 — Log Masuk & Pengurusan Pengguna
 * UAT §10 — Semak Keselamatan Asas
 *
 * Project mapping:
 *   §10.1, §10.3, §1.1 → unauthenticated checks → valid in BOTH admin + no-auth projects
 *   §1.3               → requires adminPage (admin session)
 *   §1.4               → requires ajkPage (AJK session)
 *
 * The no-auth project has no storageState. Tests that use adminPage/ajkPage
 * fixtures still work because those fixtures load their own storageState files
 * independently of the project — but §1.3 and §1.4 are meaningful only once,
 * so we guard them to only assert the security property, not re-test the same thing.
 */

import { test, expect, BASE_URL } from '../fixtures';

// ── §10.1 — Unauthenticated redirects ────────────────────────────────────────
test.describe('§10.1 — No session redirects to sign-in', () => {
  test('GET /admin/users → redirects to /sign-in', async ({ anonPage }) => {
    await anonPage.goto('/admin/users');
    await expect(anonPage).toHaveURL(/\/sign-in/);
    await expect(anonPage.getByText('Log Masuk dengan Google')).toBeVisible();
  });

  test('GET / → redirects to /sign-in when unauthenticated', async ({ anonPage }) => {
    await anonPage.goto('/');
    await expect(anonPage).toHaveURL(/\/sign-in/);
  });
});

// ── §10.3 — API returns 401 without session ───────────────────────────────────
test('§10.3 — GET /api/items without session → 401', async ({ anonPage }) => {
  const res = await anonPage.request.get(`${BASE_URL}/api/items`);
  expect(res.status()).toBe(401);
  const json = await res.json();
  expect(json).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
});

// ── §1.1 — Sign-in page ───────────────────────────────────────────────────────
test('§1.1 — Sign-in page renders Google button', async ({ anonPage }) => {
  await anonPage.goto('/sign-in');
  await expect(anonPage.getByText('Log Masuk dengan Google')).toBeVisible();
});

// ── §1.3 — Admin access ───────────────────────────────────────────────────────
test('§1.3 — Admin can access /admin/users', async ({ adminPage }) => {
  await adminPage.goto('/admin/users');
  await expect(adminPage.getByRole('heading', { name: 'Urus Pengguna' })).toBeVisible();
  // At least one user row should exist
  await expect(adminPage.locator('table tbody tr, ul li').first()).toBeVisible();
});

// ── §1.4 / §10.2 — AJK is blocked from admin pages ───────────────────────────
test('§1.4 / §10.2 — AJK cannot access /admin/users', async ({ ajkPage }) => {
  await ajkPage.goto('/admin/users');
  const url = ajkPage.url();
  // Must NOT remain on /admin/users — app redirects AJK to / (dashboard)
  expect(url, `AJK should be redirected away from /admin/users, got: ${url}`).not.toContain(
    '/admin/users',
  );
});
