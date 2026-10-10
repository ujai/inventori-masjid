'use client';

export function PdfDownloadButton() {
  return (
    <a
      href="/api/reports/handover/export"
      download
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium print:hidden"
    >
      📄 Muat turun PDF
    </a>
  );
}
