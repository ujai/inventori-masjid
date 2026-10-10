'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, Plus, Save, X } from 'lucide-react';

import { Button, Field, Select, TextInput, Textarea } from '@/components/forms';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function MaintenanceForm({
  itemId,
  currentCondition,
  currentStatus,
}: {
  itemId: number;
  currentCondition: string | null;
  currentStatus: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serviceDate, setServiceDate] = useState(todayIso());
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [conditionBefore, setConditionBefore] = useState(currentCondition ?? '');
  const [conditionAfter, setConditionAfter] = useState('');
  const [statusAfter, setStatusAfter] = useState(currentStatus === 'dalam_servis' ? 'aktif' : currentStatus);
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res = await fetch(`/api/items/${itemId}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceDate,
        nextServiceDate,
        conditionBefore,
        conditionAfter,
        statusAfter,
        cost,
        notes,
      }),
    });

    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan log servis');
      return;
    }

    setOpen(false);
    setServiceDate(todayIso());
    setNextServiceDate('');
    setConditionAfter('');
    setCost('');
    setNotes('');
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="size-4" /> Tambah log servis
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
        <span>Log servis baru</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id="serviceDate" label="Tarikh servis" required>
          <TextInput id="serviceDate" type="date" value={serviceDate} onChange={setServiceDate} required />
        </Field>
        <Field id="nextServiceDate" label="Tarikh servis seterusnya">
          <TextInput id="nextServiceDate" type="date" value={nextServiceDate} onChange={setNextServiceDate} />
        </Field>
        <Field id="conditionBefore" label="Keadaan sebelum">
          <Select id="conditionBefore" value={conditionBefore} onChange={setConditionBefore}>
            <option value="">—</option>
            <option value="baik">Baik</option>
            <option value="sederhana">Sederhana</option>
            <option value="rosak">Rosak</option>
          </Select>
        </Field>
        <Field id="conditionAfter" label="Keadaan selepas">
          <Select id="conditionAfter" value={conditionAfter} onChange={setConditionAfter}>
            <option value="">Tidak ubah</option>
            <option value="baik">Baik</option>
            <option value="sederhana">Sederhana</option>
            <option value="rosak">Rosak</option>
          </Select>
        </Field>
        <Field id="statusAfter" label="Status selepas servis">
          <Select id="statusAfter" value={statusAfter} onChange={setStatusAfter}>
            <option value="aktif">Aktif</option>
            <option value="dalam_servis">Dalam Servis</option>
            <option value="rosak">Rosak</option>
            <option value="tidak_cukup">Tidak Cukup</option>
          </Select>
        </Field>
        <Field id="cost" label="Kos (RM)">
          <TextInput id="cost" type="number" value={cost} onChange={setCost} placeholder="0.00" />
        </Field>
      </div>

      <Field id="notes" label="Catatan servis">
        <Textarea id="notes" value={notes} onChange={setNotes} placeholder="Contoh: Tukar bateri, cuci filter, baiki wayar..." />
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
