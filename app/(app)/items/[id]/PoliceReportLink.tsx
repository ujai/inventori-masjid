'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';

export function PoliceReportLink({ attachmentId, label = 'Lihat laporan polis' }: { attachmentId: number; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleOpen() {
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch(`/api/attachments/${attachmentId}/url`);
      const json = await res.json();
      if (!res.ok) { setError(json?.error?.message ?? 'Gagal buka fail'); return; }
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={handleOpen} disabled={loading}
        className="inline-flex items-center gap-1 text-primary-700 hover:underline text-sm disabled:opacity-60">
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
        {label}
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </span>
  );
}
