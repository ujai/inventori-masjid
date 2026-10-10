'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium print:hidden"
    >
      🖨️ Cetak / Simpan PDF
    </button>
  );
}
