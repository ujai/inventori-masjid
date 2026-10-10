/**
 * Test data cleanup utilities.
 *
 * UAT tests that create or mutate data prefix item names with "[UAT]".
 * Call `cleanupUatItems()` in afterAll to remove all test-created items.
 *
 * For state-mutating tests (borrow, move, dispose), each test creates its
 * own [UAT]-prefixed item so cleanup is simple.
 *
 * Usage (in spec files):
 *   import { cleanupUatItems } from '../helpers/db-reset';
 *   test.afterAll(async () => { await cleanupUatItems(adminCookies); });
 */

import { UAT_PREFIX, BASE_URL } from '../fixtures';

/**
 * Deletes all items whose name starts with "[UAT]" by calling the items API.
 * Requires admin cookies (only admins can delete).
 *
 * @param cookies  Cookie header string from the admin Playwright context
 */
export async function cleanupUatItems(cookies: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/items?q=${encodeURIComponent(UAT_PREFIX)}&limit=100`, {
    headers: { Cookie: cookies },
  });
  if (!res.ok) {
    console.warn(`[db-reset] Could not list UAT items: ${res.status}`);
    return;
  }

  const json = await res.json() as { data?: { id: number; name: string }[] };
  const uatItems = (json.data ?? []).filter(i => i.name.startsWith(UAT_PREFIX));

  for (const item of uatItems) {
    const del = await fetch(`${BASE_URL}/api/items/${item.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookies },
    });
    if (!del.ok) {
      console.warn(`[db-reset] Could not delete item ${item.id} (${item.name}): ${del.status}`);
    } else {
      console.log(`[db-reset] Deleted UAT item: ${item.name} (id=${item.id})`);
    }
  }
}

/**
 * Extract the Cookie header string from a Playwright context's cookies.
 * Use in beforeAll / afterAll when you need to make raw fetch calls.
 */
export async function getCookieHeader(
  context: import('@playwright/test').BrowserContext,
): Promise<string> {
  const cookies = await context.cookies(BASE_URL);
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
