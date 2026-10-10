import Link from 'next/link';
import {
  AlertTriangle, Calendar, ClipboardList, FileText, MapPin, Tag, Trash2, Wrench,
} from 'lucide-react';

const REPORTS = [
  {
    slug:  'ikut-kategori',
    title: 'Ikut Kategori',
    sub:   'Bilangan barang mengikut kategori dan status.',
    icon:  <Tag className="size-5" />,
    color: 'text-primary-600 bg-primary-50',
  },
  {
    slug:  'ikut-lokasi',
    title: 'Ikut Lokasi',
    sub:   'Bilangan barang mengikut lokasi dan status.',
    icon:  <MapPin className="size-5" />,
    color: 'text-violet-600 bg-violet-50',
  },
  {
    slug:  'perlu-servis',
    title: 'Perlu Servis',
    sub:   'Barang yang perlu servis dalam 30 hari akan datang.',
    icon:  <Wrench className="size-5" />,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    slug:  'dipinjam',
    title: 'Sedang Dipinjam',
    sub:   'Barang yang sedang dipinjam dan belum dipulangkan.',
    icon:  <AlertTriangle className="size-5" />,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    slug:  'hampir-luput',
    title: 'Hampir Luput',
    sub:   'Barang yang akan luput dalam 60 hari akan datang.',
    icon:  <Calendar className="size-5" />,
    color: 'text-orange-600 bg-orange-50',
  },
  {
    slug:  'pelupusan',
    title: 'Rekod Pelupusan',
    sub:   'Barang rosak, dijual, atau disumbang keluar.',
    icon:  <Trash2 className="size-5" />,
    color: 'text-red-600 bg-red-50',
  },
  {
    slug:  'kehilangan-kecurian',
    title: 'Kehilangan & Kecurian',
    sub:   'Barang hilang atau dicuri beserta rujukan laporan polis.',
    icon:  <AlertTriangle className="size-5" />,
    color: 'text-amber-600 bg-amber-50',
  },
] as const;

const HANDOVER_REPORT = {
  href:  '/reports/handover',
  title: 'Serah Terima AJK',
  sub:   'Laporan lengkap inventori untuk proses serah terima jawatankuasa. Boleh dicetak sebagai PDF.',
  icon:  <FileText className="size-5" />,
  color: 'text-emerald-600 bg-emerald-50',
};

export default function ReportsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-6 text-primary-700" />
        <h1 className="text-2xl font-bold text-primary-700">Laporan</h1>
      </div>
      <p className="text-sm text-slate-600">
        Pilih laporan di bawah untuk melihat data dan muat turun CSV.
      </p>

      {/* Featured: handover report */}
      <Link
        href={HANDOVER_REPORT.href}
        className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl hover:border-emerald-400 hover:shadow-sm transition"
      >
        <span className={`p-2 rounded-lg shrink-0 ${HANDOVER_REPORT.color}`}>{HANDOVER_REPORT.icon}</span>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 text-sm">{HANDOVER_REPORT.title}</div>
          <div className="text-xs text-slate-600 mt-0.5 leading-snug">{HANDOVER_REPORT.sub}</div>
        </div>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => (
          <Link
            key={r.slug}
            href={`/reports/${r.slug}`}
            className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary-300 hover:shadow-sm transition"
          >
            <span className={`p-2 rounded-lg shrink-0 ${r.color}`}>{r.icon}</span>
            <div className="min-w-0">
              <div className="font-medium text-slate-900 text-sm">{r.title}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{r.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
