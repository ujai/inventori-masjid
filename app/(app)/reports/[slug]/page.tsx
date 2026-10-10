import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';

import { auth } from '@/lib/auth';
import { formatDateMY } from '@/lib/format';
import {
  getReportByCategory,
  getReportByLocation,
  getReportDipinjam,
  getReportDueService,
  getReportExpiringSoon,
  getReportKehilangan,
  getReportPelupusan,
  REASON_LABELS,
} from '@/lib/reports';

type Props = { params: Promise<{ slug: string }> };

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif', rosak: 'Rosak', dalam_servis: 'Dalam Servis',
  tidak_cukup: 'Tidak Cukup', dipinjam: 'Dipinjam', hilang: 'Hilang', dilupuskan: 'Dilupuskan',
};

export default async function ReportPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { slug } = await params;

  const titles: Record<string, string> = {
    'ikut-kategori':        'Laporan: Ikut Kategori',
    'ikut-lokasi':          'Laporan: Ikut Lokasi',
    'perlu-servis':         'Laporan: Perlu Servis',
    'dipinjam':             'Laporan: Sedang Dipinjam',
    'hampir-luput':         'Laporan: Hampir Luput',
    'pelupusan':            'Laporan: Rekod Pelupusan',
    'kehilangan-kecurian':  'Laporan: Kehilangan & Kecurian',
  };
  if (!titles[slug]) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ChevronLeft className="size-4" /> Kembali ke laporan
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-primary-700">{titles[slug]}</h1>
        <a
          href={`/api/reports/${slug}/export`}
          download
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700"
        >
          <Download className="size-4" /> Muat turun CSV
        </a>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {slug === 'ikut-kategori' && <ReportByCategory />}
        {slug === 'ikut-lokasi'   && <ReportByLocation />}
        {slug === 'perlu-servis'  && <ReportDueService />}
        {slug === 'dipinjam'      && <ReportDipinjam />}
        {slug === 'hampir-luput'  && <ReportExpiringSoon />}
        {slug === 'pelupusan'            && <ReportPelupusan />}
        {slug === 'kehilangan-kecurian'   && <ReportKehilangan />}
      </div>
    </div>
  );
}

// ─── Table helpers ─────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 whitespace-nowrap">{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-4 py-3 text-sm text-slate-800 border-t border-slate-100 ${mono ? 'font-mono' : ''}`}>{children ?? '—'}</td>;
}
function EmptyRow({ cols }: { cols: number }) {
  return <tr><td colSpan={cols} className="px-4 py-8 text-sm text-slate-500 italic text-center">Tiada rekod.</td></tr>;
}

// ─── Report components ─────────────────────────────────────────────────────────

async function ReportByCategory() {
  const rows = await getReportByCategory();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Kategori</Th><Th>Prefix</Th><Th>Jumlah</Th>
          <Th>Aktif</Th><Th>Rosak</Th><Th>Dlm Servis</Th><Th>Dipinjam</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow cols={7} /> : rows.map((r, i) => (
            <tr key={i}>
              <Td>{r.categoryName}</Td>
              <Td mono>{r.prefix}</Td>
              <Td><span className="font-semibold">{r.total}</span></Td>
              <Td>{r.aktif}</Td><Td>{r.rosak}</Td>
              <Td>{r.dalamServis}</Td><Td>{r.dipinjam}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ReportByLocation() {
  const rows = await getReportByLocation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Lokasi</Th><Th>Jumlah</Th><Th>Aktif</Th>
          <Th>Rosak</Th><Th>Dlm Servis</Th><Th>Dipinjam</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow cols={6} /> : rows.map((r, i) => (
            <tr key={i}>
              <Td>{r.locationName}</Td>
              <Td><span className="font-semibold">{r.total}</span></Td>
              <Td>{r.aktif}</Td><Td>{r.rosak}</Td>
              <Td>{r.dalamServis}</Td><Td>{r.dipinjam}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ReportDueService() {
  const rows = await getReportDueService();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Nama Barang</Th><Th>Kod Aset</Th><Th>Kategori</Th>
          <Th>Lokasi</Th><Th>Tarikh Servis</Th><Th>Status</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow cols={6} /> : rows.map((r) => (
            <tr key={r.id}>
              <Td><Link href={`/items/${r.id}`} className="text-primary-700 hover:underline">{r.name}</Link></Td>
              <Td mono>{r.assetCode}</Td>
              <Td>{r.categoryName}</Td>
              <Td>{r.locationName}</Td>
              <Td><span className="text-amber-700 font-medium">{r.nextServiceDate}</span></Td>
              <Td>{STATUS_LABELS[r.status] ?? r.status}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ReportDipinjam() {
  const rows = await getReportDipinjam();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Nama Barang</Th><Th>Peminjam</Th><Th>Jangka Pulang</Th>
          <Th>Tarikh Pinjam</Th><Th>Lokasi</Th><Th>Dikendalikan</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0
            ? <EmptyRow cols={6} />
            : rows.map((r) => (
              <tr key={r.movementId}>
                <Td>{r.itemName}{r.assetCode ? <span className="text-xs text-slate-400 ml-1 font-mono">({r.assetCode})</span> : null}</Td>
                <Td>{r.borrowerName}</Td>
                <Td>{r.expectedReturnDate
                  ? <span className={new Date(r.expectedReturnDate) < new Date() ? 'text-red-600 font-medium' : ''}>{r.expectedReturnDate}</span>
                  : '—'
                }</Td>
                <Td>{formatDateMY(r.movedAt)}</Td>
                <Td>{r.locationName}</Td>
                <Td>{r.handlerName}</Td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

async function ReportExpiringSoon() {
  const rows = await getReportExpiringSoon();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Nama Barang</Th><Th>Kod Aset</Th><Th>Kategori</Th>
          <Th>Lokasi</Th><Th>Tarikh Luput</Th><Th>Status</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow cols={6} /> : rows.map((r) => (
            <tr key={r.id}>
              <Td><Link href={`/items/${r.id}`} className="text-primary-700 hover:underline">{r.name}</Link></Td>
              <Td mono>{r.assetCode}</Td>
              <Td>{r.categoryName}</Td>
              <Td>{r.locationName}</Td>
              <Td><span className="text-orange-700 font-medium">{r.expiryDate}</span></Td>
              <Td>{STATUS_LABELS[r.status] ?? r.status}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ReportPelupusan() {
  const rows = await getReportPelupusan();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Nama Barang</Th><Th>Tarikh</Th><Th>Sebab</Th>
          <Th>Kuantiti</Th><Th>Jumlah Jualan</Th><Th>Pembeli</Th><Th>Direkod oleh</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow cols={7} /> : rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.itemName}{r.assetCode ? <span className="text-xs text-slate-400 ml-1 font-mono">({r.assetCode})</span> : null}</Td>
              <Td>{r.disposalDate}</Td>
              <Td>{REASON_LABELS[r.reason] ?? r.reason}</Td>
              <Td>{r.quantityDisposed}</Td>
              <Td>{r.saleAmount ? `RM ${Number(r.saleAmount).toFixed(2)}` : '—'}</Td>
              <Td>{r.buyer}</Td>
              <Td>{r.recorderName}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ReportKehilangan() {
  const rows = await getReportKehilangan();
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          <Th>Nama Barang</Th><Th>Tarikh</Th><Th>Jenis</Th>
          <Th>Kuantiti</Th><Th>No. Laporan Polis</Th><Th>Nota</Th><Th>Direkod oleh</Th>
        </tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow cols={7} /> : rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.itemName}{r.assetCode ? <span className="text-xs text-slate-400 ml-1 font-mono">({r.assetCode})</span> : null}</Td>
              <Td>{r.disposalDate}</Td>
              <Td>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  r.reason === 'dicuri' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {REASON_LABELS[r.reason] ?? r.reason}
                </span>
              </Td>
              <Td>{r.quantityDisposed}</Td>
              <Td>
                {r.policeReportReference
                  ? <span className="font-mono font-medium text-slate-900">{r.policeReportReference}</span>
                  : <span className="text-red-500 text-xs">Tiada rekod</span>}
              </Td>
              <Td>{r.notes}</Td>
              <Td>{r.recorderName}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
