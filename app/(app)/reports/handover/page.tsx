import { headers } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { asc, eq, ne, and, count, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { APP_NAME, ORG_NAME } from '@/lib/site';
import { items, categories, locations, units } from '@/db/schema';
import { auth } from '@/lib/auth';
import { formatDateTimeMY } from '@/lib/format';
import { PrintButton } from './PrintButton';
import { PdfDownloadButton } from './PdfDownloadButton';

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif', tidak_cukup: 'Tidak Cukup', rosak: 'Rosak',
  dalam_servis: 'Dalam Servis', dipinjam: 'Dipinjam',
  hilang: 'Hilang', dilupuskan: 'Dilupuskan',
};
const CONDITION_LABELS: Record<string, string> = {
  baik: 'Baik', sederhana: 'Sederhana', rosak: 'Rosak',
};

export default async function HandoverReportPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const generatedAt = formatDateTimeMY(new Date());

  // All non-archived items with full details
  const rows = await db
    .select({
      id:              items.id,
      name:            items.name,
      assetCode:       items.assetCode,
      quantity:        items.quantity,
      status:          items.status,
      condition:       items.condition,
      nextServiceDate: items.nextServiceDate,
      acquiredDate:    items.acquiredDate,
      price:           items.price,
      categoryId:      items.categoryId,
      categoryName:    categories.nameMs,
      locationName:    locations.nameMs,
      unitName:        units.nameMs,
    })
    .from(items)
    .innerJoin(categories, eq(categories.id, items.categoryId))
    .innerJoin(locations,  eq(locations.id,  items.currentLocationId))
    .innerJoin(units,      eq(units.id,       items.unitId))
    .where(and(ne(items.status, 'dilupuskan'), ne(items.status, 'hilang')))
    .orderBy(asc(categories.nameMs), asc(items.name));

  // Summary counts
  const totalRows = await db
    .select({ total: count() })
    .from(items)
    .where(and(ne(items.status, 'dilupuskan'), ne(items.status, 'hilang')));
  const total = totalRows[0]?.total ?? 0;

  const archivedRows = await db
    .select({ archived: count() })
    .from(items)
    .where(sql`${items.status} IN ('dilupuskan', 'hilang')`);
  const archived = archivedRows[0]?.archived ?? 0;

  const activeCount  = rows.filter((r) => r.status === 'aktif').length;
  const rosakCount   = rows.filter((r) => r.status === 'rosak' || r.status === 'dalam_servis').length;
  const dipinjamCount = rows.filter((r) => r.status === 'dipinjam').length;

  // Group by category
  const grouped: Record<string, { categoryName: string; rows: typeof rows }> = {};
  for (const row of rows) {
    if (!grouped[row.categoryId]) {
      grouped[row.categoryId] = { categoryName: row.categoryName, rows: [] };
    }
    grouped[row.categoryId]!.rows.push(row);
  }

  return (
    <>
      {/* Print-specific global styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .no-print { display: none !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
        {/* Nav — hidden on print */}
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ChevronLeft className="size-4" /> Kembali ke laporan
          </Link>
          <div className="flex items-center gap-2">
            <PrintButton />
            <PdfDownloadButton />
          </div>
        </div>

        {/* Report header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 print:border-0 print:p-0 print:rounded-none">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Laporan Serah Terima AJK</h1>
            <p className="text-base font-medium text-slate-700 mt-1">{ORG_NAME}</p>
            <p className="text-sm text-slate-500 mt-1">Dijana pada: {generatedAt}</p>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Jumlah Rekod Aktif', value: total, color: 'text-primary-700' },
              { label: 'Aktif', value: activeCount, color: 'text-green-700' },
              { label: 'Rosak / Servis', value: rosakCount, color: 'text-amber-700' },
              { label: 'Dipinjam', value: dipinjamCount, color: 'text-blue-700' },
            ].map((s) => (
              <div key={s.label} className="border border-slate-200 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Items by category */}
          {Object.values(grouped).map(({ categoryName, rows: catRows }) => (
            <div key={categoryName} className="mb-6">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
                {categoryName} ({catRows.length} item)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nama Barang</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Kod Aset</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Kuantiti</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Lokasi</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Keadaan</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Servis Seterusnya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map((row, idx) => (
                      <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-3 py-2 border-t border-slate-100 font-medium text-slate-900">{row.name}</td>
                        <td className="px-3 py-2 border-t border-slate-100 font-mono text-slate-600 text-xs">{row.assetCode ?? '—'}</td>
                        <td className="px-3 py-2 border-t border-slate-100 text-right font-medium">{row.quantity} {row.unitName}</td>
                        <td className="px-3 py-2 border-t border-slate-100 text-slate-700">{row.locationName}</td>
                        <td className="px-3 py-2 border-t border-slate-100">
                          <span className={`text-xs font-medium ${
                            row.status === 'aktif' ? 'text-green-700' :
                            row.status === 'rosak' || row.status === 'dalam_servis' ? 'text-amber-700' :
                            row.status === 'dipinjam' ? 'text-blue-700' : 'text-slate-600'
                          }`}>
                            {STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                          {row.condition ? CONDITION_LABELS[row.condition] : '—'}
                        </td>
                        <td className="px-3 py-2 border-t border-slate-100 text-slate-600">
                          {row.nextServiceDate ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="text-slate-500 italic text-sm text-center py-8">Tiada rekod barang aktif.</p>
          )}

          {/* Signature block */}
          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-12">Diserah oleh:</p>
              <div className="border-b border-slate-400 mb-1"></div>
              <p className="text-xs text-slate-500">Nama & Tandatangan (AJK Lama)</p>
              <p className="text-xs text-slate-400 mt-1">Tarikh: _______________</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-12">Diterima oleh:</p>
              <div className="border-b border-slate-400 mb-1"></div>
              <p className="text-xs text-slate-500">Nama & Tandatangan (AJK Baru)</p>
              <p className="text-xs text-slate-400 mt-1">Tarikh: _______________</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center mt-4">
            Laporan ini dijana secara automatik oleh Sistem {APP_NAME}.
            Rekod arkib ({archived} item dilupuskan/hilang) tidak disertakan.
          </p>
        </div>
      </div>
    </>
  );
}
