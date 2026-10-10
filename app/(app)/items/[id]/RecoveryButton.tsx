'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { Button, Field, TextInput, Textarea } from '@/components/forms';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RecoveryButton({ itemId }: { itemId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recoveredDate, setRecoveredDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setRecoveredDate(todayIso());
    setNotes('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/items/${itemId}/recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveredDate, notes }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal merekod penemuan');
      return;
    }

    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 text-sm font-medium"
      >
        <CheckCircle className="size-4" /> Barang dijumpai semula
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-4"
    >
      <p className="font-medium text-green-800 flex items-center gap-2">
        <CheckCircle className="size-4" /> Rekod penemuan semula
      </p>
      <p className="text-sm text-slate-600">
        Rekod ini akan disimpan sebagai peristiwa baru dalam sejarah barang.
        Rekod kehilangan asal <strong>tidak akan dipadam</strong> — kedua-duanya kekal untuk tujuan audit.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="recovered-date" label="Tarikh dijumpai" required>
          <TextInput
            id="recovered-date"
            type="date"
            value={recoveredDate}
            onChange={setRecoveredDate}
            required
          />
        </Field>
      </div>

      <Field
        id="recovery-notes"
        label="Catatan"
        hint="Contoh: Dijumpai di stor belakang, diserahkan oleh jemaah, dsb."
      >
        <Textarea
          id="recovery-notes"
          value={notes}
          onChange={setNotes}
          placeholder="Di mana dijumpai? Siapa yang jumpa? Keadaan barang selepas dijumpai?"
          rows={3}
        />
      </Field>

      {error && (
        <div className="rounded-lg bg-white border border-red-300 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={reset} disabled={busy}>
          <X className="size-4" /> Batal
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="bg-green-700 hover:bg-green-800 text-white"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
          Sahkan dijumpai
        </Button>
      </div>
    </form>
  );
}
