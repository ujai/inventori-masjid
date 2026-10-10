import { headers } from 'next/headers';
import Link from 'next/link';
import { desc, eq, sql } from 'drizzle-orm';
import { formatDateTimeMY } from '@/lib/format';
import { db } from '@/db/client';
import { activityLogs, user } from '@/db/schema';
import { auth } from '@/lib/auth';

const ACTION_LABELS: Record<string, string> = {
  'item.create':       'Barang dicipta',
  'item.update':       'Barang dikemaskini',
  'item.delete':       'Barang dipadam',
  'item.recovered':    'Barang ditemui semula',
  'maintenance.create':'Log servis dicatat',
  'movement.create':   'Pergerakan direkod',
  'movement.return':   'Pulangan direkod',
  'disposal.create':   'Pelupusan direkod',
  'photo.upload':      'Foto dimuat naik',
  'photo.delete':      'Foto dipadam',
};

const PAGE_SIZE = 20;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id:          activityLogs.id,
        action:      activityLogs.action,
        entityType:  activityLogs.entityType,
        entityId:    activityLogs.entityId,
        createdAt:   activityLogs.createdAt,
        actorName:   user.name,
      })
      .from(activityLogs)
      .leftJoin(user, eq(user.id, activityLogs.actorUserId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(activityLogs),
  ]);

  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <h1 className="text-2xl font-bold text-primary-700">Log Aktiviti</h1>
      <p className="text-sm text-slate-500">{total} rekod aktiviti</p>

      {rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm italic">
          Tiada aktiviti direkod lagi.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const label = ACTION_LABELS[row.action] ?? row.action;
            const isItemEntity = row.entityType === 'item';
            const itemId = isItemEntity ? Number(row.entityId) : null;

            return (
              <li key={row.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 text-sm">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{row.actorName ?? 'Sistem'}</span>
                    <span className="text-slate-300">·</span>
                    <span>{formatDateTimeMY(row.createdAt)}</span>
                    {row.entityId && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-xs text-slate-400">{row.entityType} #{row.entityId}</span>
                      </>
                    )}
                  </div>
                </div>
                {itemId && (
                  <Link
                    href={`/items/${itemId}`}
                    className="shrink-0 text-xs text-primary-600 hover:underline"
                  >
                    Lihat →
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          {page > 1 && (
            <Link
              href={`/activity?page=${page - 1}`}
              className="h-9 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              ← Sebelum
            </Link>
          )}
          <span className="text-sm text-slate-600">Halaman {page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/activity?page=${page + 1}`}
              className="h-9 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              Seterusnya →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
