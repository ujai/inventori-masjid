'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';

export function DeleteItemButton({ itemId }: { itemId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      alert(json?.error?.message ?? 'Gagal melupuskan barang');
      return;
    }
    router.push('/items');
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium"
      >
        <Trash2 className="size-4" /> Lupuskan
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-red-700">Pasti lupuskan?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Ya, lupuskan
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="inline-flex items-center h-10 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
      >
        Batal
      </button>
    </div>
  );
}
