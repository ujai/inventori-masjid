'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, Plus, Save, X } from 'lucide-react';

import { Button, Field, NumberInput, Select, TextInput, Textarea } from '@/components/forms';

type Location = { id: number; nameMs: string };

type Purpose = 'pinjam' | 'pindah_lokasi' | 'kenduri' | 'kelas' | 'qurban' | 'lain';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MovementForm({
  itemId,
  currentLocationId,
  quantity,
  disabled,
}: {
  itemId: number;
  currentLocationId: number;
  quantity: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [purpose, setPurpose] = useState<Purpose>('pindah_lokasi');
  const [quantityMoved, setQuantityMoved] = useState<number | ''>(quantity);
  const [toLocationId, setToLocationId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/locations')
      .then((r) => r.json())
      .then((json) => setLocations(json.data ?? []));
  }, [open]);

  function updatePurpose(v: Purpose) {
    setPurpose(v);
    setError(null);
    if (v === 'pindah_lokasi') setQuantityMoved(quantity);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/items/${itemId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purpose,
        quantityMoved,
        toLocationId,
        borrowerName,
        expectedReturnDate,
        notes,
      }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan log pergerakan');
      return;
    }

    setOpen(false);
    setPurpose('pindah_lokasi');
    setQuantityMoved(quantity);
    setToLocationId('');
    setBorrowerName('');
    setExpectedReturnDate('');
    setNotes('');
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} disabled={disabled} className="w-full sm:w-auto">
        <Plus className="size-4" /> Tambah pergerakan
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="w-full flex items-center justify-between text-left font-medium text-slate-800"
        aria-expanded={open}
      >
        <span>Log pergerakan baru</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="purpose" label="Jenis pergerakan" required>
          <Select id="purpose" value={purpose} onChange={(v) => updatePurpose(v as Purpose)} required>
            <option value="pindah_lokasi">Pindah lokasi</option>
            <option value="pinjam">Pinjam</option>
            <option value="kenduri">Kenduri</option>
            <option value="kelas">Kelas</option>
            <option value="qurban">Qurban</option>
            <option value="lain">Lain-lain</option>
          </Select>
        </Field>
        <Field id="quantityMoved" label="Kuantiti" required hint={purpose === 'pindah_lokasi' ? 'Pindah lokasi mesti semua kuantiti dalam rekod ini.' : undefined}>
          <NumberInput
            id="quantityMoved"
            value={quantityMoved}
            onChange={setQuantityMoved}
            min={1}
            max={quantity}
            required
            disabled={purpose === 'pindah_lokasi'}
          />
        </Field>

        {(purpose === 'pindah_lokasi' || purpose !== 'pinjam') && (
          <Field id="toLocationId" label="Lokasi tujuan" required={purpose === 'pindah_lokasi'}>
            <Select id="toLocationId" value={toLocationId} onChange={setToLocationId} required={purpose === 'pindah_lokasi'}>
              <option value="">Pilih lokasi</option>
              {locations
                .filter((l) => l.id !== currentLocationId)
                .map((l) => (
                  <option key={l.id} value={l.id}>{l.nameMs}</option>
                ))}
            </Select>
          </Field>
        )}

        {purpose === 'pinjam' && (
          <>
            <Field id="borrowerName" label="Nama peminjam" required>
              <TextInput id="borrowerName" value={borrowerName} onChange={setBorrowerName} required placeholder="Nama orang / kumpulan" />
            </Field>
            <Field id="expectedReturnDate" label="Jangka pulang">
              <TextInput id="expectedReturnDate" type="date" value={expectedReturnDate} onChange={setExpectedReturnDate} />
            </Field>
          </>
        )}
      </div>

      <Field id="movementNotes" label="Catatan">
        <Textarea id="movementNotes" value={notes} onChange={setNotes} placeholder="Contoh: Dipinjam untuk program, pindah ke stor sementara..." />
      </Field>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          <X className="size-4" /> Batal
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan log
        </Button>
      </div>
    </form>
  );
}

export function ReturnMovementButton({ itemId, movementId }: { itemId: number; movementId: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [returnedDate, setReturnedDate] = useState(todayIso());
  const [returnCondition, setReturnCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReturn() {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/items/${itemId}/movements/${movementId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnedDate, returnCondition: returnCondition || undefined, notes }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal rekod pulangan');
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-9 px-3 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium"
      >
        Rekod pulangan
      </button>
    );
  }

  return (
    <div className="mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-3">
      <Field id={`return-date-${movementId}`} label="Tarikh pulang" required>
        <TextInput id={`return-date-${movementId}`} type="date" value={returnedDate} onChange={setReturnedDate} required />
      </Field>
      <Field id={`return-condition-${movementId}`} label="Keadaan semasa pulang">
        <Select id={`return-condition-${movementId}`} value={returnCondition} onChange={setReturnCondition}>
          <option value="">— Tidak dinyatakan —</option>
          <option value="baik">Baik</option>
          <option value="sederhana">Sederhana</option>
          <option value="rosak">Rosak</option>
        </Select>
      </Field>
      <Field id={`return-notes-${movementId}`} label="Catatan pulangan">
        <Textarea id={`return-notes-${movementId}`} value={notes} onChange={setNotes} rows={2} />
      </Field>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-2.5">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Batal</Button>
        <Button onClick={handleReturn} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Sahkan pulang
        </Button>
      </div>
    </div>
  );
}
