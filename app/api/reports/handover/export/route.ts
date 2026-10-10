// @react-pdf/renderer requires the Node.js runtime (uses fs, canvas, fontkit).
// Declaring this prevents accidental Edge runtime deployment.
export const runtime = 'nodejs';

import { readFileSync } from 'fs';
import { join } from 'path';
import { asc, eq, ne, and, count, sql } from 'drizzle-orm';
import { Document, Page, Text, View, StyleSheet, Image, renderToBuffer } from '@react-pdf/renderer';
import React from 'react';

import { requireSession } from '@/lib/api/guards';
import { handleError } from '@/lib/api/responses';
import { db } from '@/db/client';
import { APP_NAME, ORG_NAME } from '@/lib/site';
import { items, categories, locations, units } from '@/db/schema';

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif', tidak_cukup: 'Tidak Cukup', rosak: 'Rosak',
  dalam_servis: 'Dalam Servis', dipinjam: 'Dipinjam',
  hilang: 'Hilang', dilupuskan: 'Dilupuskan',
};
const CONDITION_LABELS: Record<string, string> = {
  baik: 'Baik', sederhana: 'Sederhana', rosak: 'Rosak',
};

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, padding: 32, color: '#1e293b' },
  header:      { alignItems: 'center', marginBottom: 16 },
  logo:        { width: 48, height: 48, marginBottom: 6 },
  title:       { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  subtitle:    { fontSize: 11, marginTop: 2, color: '#475569' },
  generated:   { fontSize: 8, marginTop: 4, color: '#94a3b8' },
  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox:     { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 8, alignItems: 'center' },
  statVal:     { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  statLabel:   { fontSize: 7, color: '#64748b', marginTop: 2 },
  section:     { marginBottom: 14 },
  sectionHead: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569', textTransform: 'uppercase',
                 letterSpacing: 0.8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 3, marginBottom: 4 },
  table:       { width: '100%' },
  thead:       { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  th:          { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', paddingHorizontal: 4, paddingVertical: 3,
                 textTransform: 'uppercase' },
  tr:          { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  trAlt:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8fafc' },
  td:          { fontSize: 8, paddingHorizontal: 4, paddingVertical: 3, color: '#334155' },
  colName:     { width: '24%' },
  colCode:     { width: '12%' },
  colQty:      { width: '10%', textAlign: 'right' },
  colLoc:      { width: '18%' },
  colStatus:   { width: '12%' },
  colCond:     { width: '11%' },
  colSvc:      { width: '13%' },
  sigRow:      { flexDirection: 'row', gap: 32, marginTop: 32, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  sigBlock:    { flex: 1 },
  sigLabel:    { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 32 },
  sigLine:     { borderBottomWidth: 1, borderBottomColor: '#94a3b8', marginBottom: 4 },
  sigSub:      { fontSize: 7, color: '#94a3b8' },
  footer:      { fontSize: 7, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
});

type Row = {
  id: number; name: string; assetCode: string | null; quantity: number;
  status: string; condition: string | null; nextServiceDate: string | null;
  categoryId: number; categoryName: string; locationName: string; unitName: string;
};

function HandoverPdf({
  rows, generatedAt, total, activeCount, rosakCount, dipinjamCount, archived, logoBase64,
}: {
  rows: Row[]; generatedAt: string; total: number;
  activeCount: number; rosakCount: number; dipinjamCount: number;
  archived: number; logoBase64: string;
}) {
  const grouped: Record<string, { categoryName: string; rows: Row[] }> = {};
  for (const row of rows) {
    if (!grouped[row.categoryId]) grouped[row.categoryId] = { categoryName: row.categoryName, rows: [] };
    grouped[row.categoryId]!.rows.push(row);
  }

  return React.createElement(
    Document,
    { title: 'Laporan Serah Terima AJK' },
    React.createElement(
      Page,
      { size: 'A4', style: s.page },
      // Header
      React.createElement(View, { style: s.header },
        React.createElement(Image, { style: s.logo, src: logoBase64 }),
        React.createElement(Text, { style: s.title }, 'Laporan Serah Terima AJK'),
        React.createElement(Text, { style: s.subtitle }, ORG_NAME),
        React.createElement(Text, { style: s.generated }, `Dijana pada: ${generatedAt}`),
      ),
      // Summary stats
      React.createElement(View, { style: s.statsRow },
        ...[
          { label: 'Jumlah Rekod Aktif', value: total },
          { label: 'Aktif', value: activeCount },
          { label: 'Rosak / Servis', value: rosakCount },
          { label: 'Dipinjam', value: dipinjamCount },
        ].map((stat) =>
          React.createElement(View, { key: stat.label, style: s.statBox },
            React.createElement(Text, { style: s.statVal }, String(stat.value)),
            React.createElement(Text, { style: s.statLabel }, stat.label),
          ),
        ),
      ),
      // Category sections
      ...Object.values(grouped).map(({ categoryName, rows: catRows }) =>
        React.createElement(View, { key: categoryName, style: s.section },
          React.createElement(Text, { style: s.sectionHead },
            `${categoryName} (${catRows.length} item)`,
          ),
          React.createElement(View, { style: s.table },
            // Table header
            React.createElement(View, { style: s.thead },
              React.createElement(Text, { style: { ...s.th, ...s.colName } }, 'Nama Barang'),
              React.createElement(Text, { style: { ...s.th, ...s.colCode } }, 'Kod Aset'),
              React.createElement(Text, { style: { ...s.th, ...s.colQty } }, 'Kuantiti'),
              React.createElement(Text, { style: { ...s.th, ...s.colLoc } }, 'Lokasi'),
              React.createElement(Text, { style: { ...s.th, ...s.colStatus } }, 'Status'),
              React.createElement(Text, { style: { ...s.th, ...s.colCond } }, 'Keadaan'),
              React.createElement(Text, { style: { ...s.th, ...s.colSvc } }, 'Servis Seterusnya'),
            ),
            // Table rows
            ...catRows.map((row, idx) =>
              React.createElement(View, { key: row.id, style: idx % 2 === 0 ? s.tr : s.trAlt },
                React.createElement(Text, { style: { ...s.td, ...s.colName } }, row.name),
                React.createElement(Text, { style: { ...s.td, ...s.colCode } }, row.assetCode ?? '—'),
                React.createElement(Text, { style: { ...s.td, ...s.colQty } }, String(row.quantity)),
                React.createElement(Text, { style: { ...s.td, ...s.colLoc } }, row.locationName),
                React.createElement(Text, { style: { ...s.td, ...s.colStatus } }, STATUS_LABELS[row.status] ?? row.status),
                React.createElement(Text, { style: { ...s.td, ...s.colCond } }, row.condition ? (CONDITION_LABELS[row.condition] ?? row.condition) : '—'),
                React.createElement(Text, { style: { ...s.td, ...s.colSvc } }, row.nextServiceDate ?? '—'),
              ),
            ),
          ),
        ),
      ),
      // Signature block
      React.createElement(View, { style: s.sigRow },
        React.createElement(View, { style: s.sigBlock },
          React.createElement(Text, { style: s.sigLabel }, 'Diserah oleh:'),
          React.createElement(View, { style: s.sigLine }),
          React.createElement(Text, { style: s.sigSub }, 'Nama & Tandatangan (AJK Lama)'),
          React.createElement(Text, { style: s.sigSub }, 'Tarikh: _______________'),
        ),
        React.createElement(View, { style: s.sigBlock },
          React.createElement(Text, { style: s.sigLabel }, 'Diterima oleh:'),
          React.createElement(View, { style: s.sigLine }),
          React.createElement(Text, { style: s.sigSub }, 'Nama & Tandatangan (AJK Baru)'),
          React.createElement(Text, { style: s.sigSub }, 'Tarikh: _______________'),
        ),
      ),
      React.createElement(Text, { style: s.footer },
        `Laporan ini dijana secara automatik oleh Sistem ${APP_NAME}. Rekod arkib (${archived} item dilupuskan/hilang) tidak disertakan.`,
      ),
    ),
  );
}

export async function GET() {
  try {
    await requireSession();

    const TZ = 'Asia/Kuala_Lumpur';
    const generatedAt = new Date().toLocaleString('ms-MY', {
      timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });

    const [rows, totalRows, archivedRows] = await Promise.all([
      db
        .select({
          id:              items.id,
          name:            items.name,
          assetCode:       items.assetCode,
          quantity:        items.quantity,
          status:          items.status,
          condition:       items.condition,
          nextServiceDate: items.nextServiceDate,
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
        .orderBy(asc(categories.nameMs), asc(items.name)),

      db.select({ total: count() }).from(items)
        .where(and(ne(items.status, 'dilupuskan'), ne(items.status, 'hilang'))),

      db.select({ archived: count() }).from(items)
        .where(sql`${items.status} IN ('dilupuskan', 'hilang')`),
    ]);

    const total        = totalRows[0]?.total ?? 0;
    const archived     = archivedRows[0]?.archived ?? 0;
    const activeCount  = rows.filter((r) => r.status === 'aktif').length;
    const rosakCount   = rows.filter((r) => r.status === 'rosak' || r.status === 'dalam_servis').length;
    const dipinjamCount = rows.filter((r) => r.status === 'dipinjam').length;

    const logoPath   = join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = readFileSync(logoPath);
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(HandoverPdf as any, {
      rows, generatedAt, total, activeCount, rosakCount, dipinjamCount, archived, logoBase64,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any);
    const filename  = `laporan-serah-terima-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
