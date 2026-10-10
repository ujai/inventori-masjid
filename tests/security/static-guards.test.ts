import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'bun:test';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('security guard placement', () => {
  test('item create/update API routes require admin role', () => {
    const listRoute = source('app/api/items/route.ts');
    const detailRoute = source('app/api/items/[id]/route.ts');

    expect(/export async function POST[\s\S]*?const session = await requireAdmin\(\)/.test(listRoute)).toBe(true);
    expect(/export async function PATCH[\s\S]*?const session = await requireAdmin\(\)/.test(detailRoute)).toBe(true);
  });

  test('item create/edit pages are admin-only', () => {
    const newPage = source('app/(app)/items/new/page.tsx');
    const editPage = source('app/(app)/items/[id]/edit/page.tsx');

    expect(newPage.includes("session.user.role !== 'admin'")).toBe(true);
    expect(editPage.includes("session.user.role !== 'admin'")).toBe(true);
  });
});
