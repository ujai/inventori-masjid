'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Save, Trash2, X } from 'lucide-react';

import { Button, Field, NumberInput, Select, TextInput, Textarea } from '@/components/forms';
import { MultiFileUpload } from '@/components/MultiFileUpload';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const DISPOSAL_REASONS = {
  rosak_total:       'Rosak Teruk / Tidak Boleh Dibaiki',
  dijual_besi_buruk: 'Dijual (Besi Buruk)',
  dijual_terpakai:   'Dijual (Terpakai)',
  sumbangan_keluar:  'Sumbangan Keluar',
  lain_lain:         'Lain-lain',
} as const;

const LOSS_REASONS = {
  hilang: 'Hilang',
  dicuri: 'Dicuri',
} as const;

const ALL_LABELS: Record<string, string> = { ...DISPOSAL_REASONS, ...LOSS_REASONS };

type Mode = 'disposal' | 'loss';

// ─── Shared state hook ────────────────────────────────────────────────────────

function useDisposalState(mode: Mode, quantity: number) {
  const [open,                  setOpen]                  = useState(false);
  const [step,                  setStep]                  = useState<'form' | 'confirm'>('form');
  const [disposalDate,          setDisposalDate]          = useState(todayIso());
  const [reason,                setReason]                = useState(mode === 'loss' ? 'hilang' : 'rosak_total');
  const [quantityDisposed,      setQuantityDisposed]      = useState<number | ''>(quantity);
  const [policeReportReference, setPoliceReportReference] = useState('');
  const [saleAmount,            setSaleAmount]            = useState('');
  const [buyer,                 setBuyer]                 = useState('');
  const [notes,                 setNotes]                 = useState('');
  const [busy,                  setBusy]                  = useState(false);
  const [error,                 setError]                 = useState<string | null>(null);

  function reset() {
    setOpen(false);
    setStep('form');
    setDisposalDate(todayIso());
    setReason(mode === 'loss' ? 'hilang' : 'rosak_total');
    setQuantityDisposed(quantity);
    setPoliceReportReference('');
    setSaleAmount('');
    setBuyer('');
    setNotes('');
    setError(null);
  }

  return {
    open, setOpen,
    step, setStep,
    disposalDate, setDisposalDate,
    reason, setReason,
    quantityDisposed, setQuantityDisposed,
    policeReportReference, setPoliceReportReference,
    saleAmount, setSaleAmount,
    buyer, setBuyer,
    notes, setNotes,
    busy, setBusy,
    error, setError,
    reset,
  };
}

// ─── Shared confirm step ──────────────────────────────────────────────────────

function ConfirmStep({
  state,
  quantity,
  onBack,
  onConfirm,
}: {
  state: ReturnType<typeof useDisposalState>;
  quantity: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const remaining = quantity - Number(state.quantityDisposed || 0);
  const isLost    = state.reason === 'hilang' || state.reason === 'dicuri';

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white border border-red-200 p-4 text-sm space-y-1.5">
        <p className="font-semibold text-red-800 mb-2">Sahkan maklumat:</p>
        <p><span className="text-slate-500 w-40 inline-block">Sebab:</span> {ALL_LABELS[state.reason] ?? state.reason}</p>
        <p><span className="text-slate-500 w-40 inline-block">Kuantiti:</span> {state.quantityDisposed} unit</p>
        <p><span className="text-slate-500 w-40 inline-block">Tarikh:</span> {state.disposalDate}</p>
        {state.policeReportReference && <p><span className="text-slate-500 w-40 inline-block">No. laporan polis:</span> {state.policeReportReference}</p>}
        {state.saleAmount && <p><span className="text-slate-500 w-40 inline-block">Jualan:</span> RM {state.saleAmount}{state.buyer ? ` kepada ${state.buyer}` : ''}</p>}
        {state.notes && <p><span className="text-slate-500 w-40 inline-block">Nota:</span> {state.notes}</p>}
        {remaining === 0 ? (
          <p className="text-red-700 font-medium pt-2 border-t border-red-100 mt-2">
            ⚠ Semua unit akan {isLost ? 'ditanda sebagai hilang' : 'dilupuskan'}.
          </p>
        ) : (
          <p className="text-slate-600 pt-2 border-t border-slate-100 mt-2">{remaining} unit akan tinggal selepas ini.</p>
        )}
      </div>

      {state.error && <div className="rounded-lg bg-white border border-red-300 text-red-700 text-sm p-3">{state.error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onBack} disabled={state.busy}>
          <X className="size-4" /> Semak semula
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={state.busy}>
          {state.busy ? <><Loader2 className="size-4 animate-spin" /> Menyimpan...</> : <><AlertTriangle className="size-4" /> Ya, sahkan</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Disposal form (rosak / jual / sumbangan / lain) ─────────────────────────

export function DisposalForm({ itemId, quantity }: { itemId: number; quantity: number }) {
  const router    = useRouter();
  const s         = useDisposalState('disposal', quantity);
  const isSale    = s.reason === 'dijual_besi_buruk' || s.reason === 'dijual_terpakai';
  const remaining = quantity - Number(s.quantityDisposed || 0);

  async function submit() {
    s.setError(null);
    s.setBusy(true);
    const res  = await fetch(`/api/items/${itemId}/disposal`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disposalDate:     s.disposalDate,
        reason:           s.reason,
        quantityDisposed: s.quantityDisposed,
        saleAmount:       s.saleAmount,
        buyer:            s.buyer,
        notes:            s.notes,
      }),
    });
    const json = await res.json();
    s.setBusy(false);
    if (!res.ok) { s.setStep('form'); s.setError(json?.error?.message ?? 'Gagal merekod pelupusan'); return; }
    s.reset();
    router.refresh();
  }

  if (!s.open) {
    return (
      <button type="button" onClick={() => s.setOpen(true)}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-medium">
        <Trash2 className="size-4" /> Rekod pelupusan
      </button>
    );
  }

  return (
    <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-4">
      <p className="font-medium text-red-800 flex items-center gap-2"><Trash2 className="size-4" /> Rekod pelupusan</p>

      {s.step === 'confirm' ? (
        <ConfirmStep state={s} quantity={quantity} onBack={() => s.setStep('form')} onConfirm={submit} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="dis-date" label="Tarikh pelupusan" required>
              <TextInput id="dis-date" type="date" value={s.disposalDate} onChange={s.setDisposalDate} required />
            </Field>
            <Field id="dis-reason" label="Sebab" required>
              <Select id="dis-reason" value={s.reason} onChange={s.setReason} required>
                {Object.entries(DISPOSAL_REASONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field id="dis-qty" label="Kuantiti" required
              hint={remaining > 0 ? `${remaining} unit akan tinggal` : 'Semua unit akan dilupuskan'}>
              <NumberInput id="dis-qty" value={s.quantityDisposed} onChange={s.setQuantityDisposed} min={1} max={quantity} required />
            </Field>
            {isSale && (
              <>
                <Field id="dis-sale" label="Jumlah jualan (RM)">
                  <TextInput id="dis-sale" type="number" value={s.saleAmount} onChange={s.setSaleAmount} placeholder="0.00" />
                </Field>
                <Field id="dis-buyer" label="Nama pembeli">
                  <TextInput id="dis-buyer" value={s.buyer} onChange={s.setBuyer} />
                </Field>
              </>
            )}
          </div>
          <Field id="dis-notes" label="Catatan">
            <Textarea id="dis-notes" value={s.notes} onChange={s.setNotes} />
          </Field>
          {s.error && <div className="rounded-lg bg-white border border-red-300 text-red-700 text-sm p-3">{s.error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={s.reset}><X className="size-4" /> Batal</Button>
            <Button type="button" variant="danger" onClick={() => s.setStep('confirm')}><Save className="size-4" /> Teruskan</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loss / theft form (hilang / dicuri) with multi-file upload ───────────────

export function LossForm({ itemId, quantity }: { itemId: number; quantity: number }) {
  const router    = useRouter();
  const s         = useDisposalState('loss', quantity);
  const remaining = quantity - Number(s.quantityDisposed || 0);

  async function submit() {
    s.setError(null);
    s.setBusy(true);
    // Police report files are already saved to R2 + DB by MultiFileUpload (mode=immediate).
    // The disposal API only needs the reference number and form fields.
    const res  = await fetch(`/api/items/${itemId}/disposal`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disposalDate:          s.disposalDate,
        reason:                s.reason,
        quantityDisposed:      s.quantityDisposed,
        policeReportReference: s.policeReportReference,
        notes:                 s.notes,
      }),
    });
    const json = await res.json();
    s.setBusy(false);
    if (!res.ok) { s.setStep('form'); s.setError(json?.error?.message ?? 'Gagal merekod kehilangan'); return; }
    s.reset();
    router.refresh();
  }

  if (!s.open) {
    return (
      <button type="button" onClick={() => s.setOpen(true)}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-sm font-medium">
        <AlertTriangle className="size-4" /> Rekod kehilangan
      </button>
    );
  }

  return (
    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-4">
      <p className="font-medium text-amber-800 flex items-center gap-2"><AlertTriangle className="size-4" /> Rekod kehilangan / kecurian</p>

      {s.step === 'confirm' ? (
        <ConfirmStep state={s} quantity={quantity} onBack={() => s.setStep('form')} onConfirm={submit} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="loss-date" label="Tarikh" required>
              <TextInput id="loss-date" type="date" value={s.disposalDate} onChange={s.setDisposalDate} required />
            </Field>
            <Field id="loss-reason" label="Jenis" required>
              <Select id="loss-reason" value={s.reason} onChange={s.setReason} required>
                {Object.entries(LOSS_REASONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field id="loss-qty" label="Kuantiti" required
              hint={remaining > 0 ? `${remaining} unit akan tinggal` : 'Semua unit akan ditanda hilang'}>
              <NumberInput id="loss-qty" value={s.quantityDisposed} onChange={s.setQuantityDisposed} min={1} max={quantity} required />
            </Field>
            <Field id="loss-police" label="No. laporan polis" required>
              <TextInput id="loss-police" value={s.policeReportReference} onChange={s.setPoliceReportReference} required placeholder="cth: IPD/2026/0001" />
            </Field>
          </div>

          {/* Multi-file upload — files saved immediately to R2 + DB */}
          <Field id="loss-files" label="Dokumen sokongan" hint="Laporan polis, foto kejadian, atau dokumen berkaitan">
            <MultiFileUpload
              itemId={itemId}
              kind="police_report"
              accept="application/pdf,image/jpeg,image/png"
              acceptLabel="PDF, JPG, atau PNG"
              maxFiles={5}
              maxBytesPerFile={10 * 1024 * 1024}
              mode="immediate"
              saveEndpoint={`/api/items/${itemId}/police-reports`}
            />
          </Field>

          <Field id="loss-notes" label="Catatan">
            <Textarea id="loss-notes" value={s.notes} onChange={s.setNotes} placeholder="Keadaan semasa kehilangan, lokasi terakhir..." />
          </Field>
          {s.error && <div className="rounded-lg bg-white border border-amber-300 text-amber-700 text-sm p-3">{s.error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={s.reset}><X className="size-4" /> Batal</Button>
            <Button type="button" onClick={() => s.setStep('confirm')} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Save className="size-4" /> Teruskan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
