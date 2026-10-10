/**
 * Search helper — waits for the 300ms debounce + API response before returning.
 *
 * ItemListClient.tsx: setTimeout(() => setDebouncedQ(q.trim()), 300)
 *
 * Strategy: start listening for the next /api/items response BEFORE filling
 * the input (via Promise.all), then wait for it to complete. This handles
 * the debounce without any hard setTimeout.
 */

import type { Page } from '@playwright/test';

/**
 * Fill the items search box and wait for the debounced API call to complete.
 */
export async function searchItems(page: Page, query: string): Promise<void> {
  // Start listener BEFORE fill so we don't miss the response
  const [response] = await Promise.all([
    page.waitForResponse(
      // Match any successful /api/items call — avoids URL encoding differences
      // between encodeURIComponent (%20) and URLSearchParams (+)
      (res) => res.url().includes('/api/items') && res.status() === 200,
      { timeout: 10_000 },
    ),
    page.getByPlaceholder(/Cari barang/).fill(query),
  ]);
  await response.finished();
}
