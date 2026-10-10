'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Loader2, Save, X } from 'lucide-react';
import { Button, Field, NumberInput, Select, TextInput, Textarea } from '@/components/forms';
import { MultiFileUpload, type PendingFile, type SavedFile } from '@/components/MultiFileUpload';

type Category = { id: number; nameMs: string; prefix: string };
type Location = { id: number; nameMs: string };
type Unit     = { id: number; nameMs: string };
type InstitutionalRole = { id: number; code: string; nameMs: string };

export type ExistingPhoto = SavedFile; // re-export for edit page convenience

export type ItemFormValues = {
  name: string;
  categoryId: string;
  unitId: string;
  quantity: number | '';
  currentLocationId: string;
  status: string;
  notes: string;
  trackingMode: 'quantity' | 'asset';
  assetCode: string;
  acquiredDate: string;
  price: string;
  acquisitionMethod: string;
  supplier: string;
  receiptReference: string;
  expiryDate: string;
  condition: string;
  maintenanceNotes: string;
  warrantyExpiry: string;
  expectedLifespanYears: number | '';
  maintenanceIntervalDays: number | '';
  minimumQuantity: number | '';
  roleIds: number[];
};

export const emptyValues: ItemFormValues = {
  name: '', categoryId: '', unitId: '', quantity: 1, currentLocationId: '',
  status: 'aktif', notes: '',
  trackingMode: 'quantity', assetCode: '',
  acquiredDate: '', price: '', acquisitionMethod: '',
  supplier: '', receiptReference: '',
  expiryDate: '', condition: '', maintenanceNotes: '',
  warrantyExpiry: '', expectedLifespanYears: '', maintenanceIntervalDays: '', minimumQuantity: '',
  roleIds: [],
};

export function ItemForm({
  initial,
  itemId,
  mode,
  existingPhotos = [],
  canDelete = false,
}: {
  initial: ItemFormValues;
  itemId?: number;
  mode: 'create' | 'edit';
  existingPhotos?: ExistingPhoto[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [categories,          setCategories]          = useState<Category[]>([]);
  const [locations,           setLocations]           = useState<Location[]>([]);
  const [units,               setUnits]               = useState<Unit[]>([]);
  const [institutionalRoles,  setInstitutionalRoles]  = useState<InstitutionalRole[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Pending photos collected from MultiFileUpload in create mode
  const [pendingPhotos, setPendingPhotos] = useState<PendingFile[]>([]);

  const isAsset = values.trackingMode === 'asset';

  useEffect(() => {
    void (async () => {
      const [c, l, u, ir] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
        fetch('/api/units').then((r) => r.json()),
        fetch('/api/institutional-roles').then((r) => r.json()),
      ]);
      setCategories(c.data ?? []);
      setLocations(l.data ?? []);
      setUnits(u.data ?? []);
      setInstitutionalRoles(ir.data ?? []);
    })();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === values.categoryId),
    [categories, values.categoryId],
  );

  function update<K extends keyof ItemFormValues>(key: K, v: ItemFormValues[K]) {
    setValues((prev) => {
      const next = { ...prev, [key]: v };
      if (key === 'trackingMode' && v === 'asset') next.quantity = 1;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name:              values.name.trim(),
      categoryId:        Number(values.categoryId),
      unitId:            Number(values.unitId),
      quantity:          values.quantity === '' ? 1 : Number(values.quantity),
      currentLocationId: Number(values.currentLocationId),
      status:            values.status,
      notes:             values.notes.trim() || undefined,
      trackingMode:      values.trackingMode,
      assetCode:         values.assetCode.trim() || undefined,
      acquiredDate:      values.acquiredDate || undefined,
      price:             values.price.trim() || undefined,
      acquisitionMethod: values.acquisitionMethod || undefined,
      supplier:          values.supplier.trim() || undefined,
      receiptReference:  values.receiptReference.trim() || undefined,
      expiryDate:        values.expiryDate || undefined,
      condition:         values.condition || undefined,
      maintenanceNotes:  values.maintenanceNotes.trim() || undefined,
      warrantyExpiry:          values.warrantyExpiry || undefined,
      expectedLifespanYears:   values.expectedLifespanYears === '' ? undefined : values.expectedLifespanYears,
      maintenanceIntervalDays: values.maintenanceIntervalDays === '' ? undefined : values.maintenanceIntervalDays,
      minimumQuantity:         values.minimumQuantity === '' ? undefined : values.minimumQuantity,
    };

    // In create mode: pass pending photos so the API saves them with the item
    if (mode === 'create' && pendingPhotos.length > 0) {
      payload.pendingPhotos = pendingPhotos.map((p) => ({
        pendingPhotoKey:       p.key,
        pendingPhotoFileName:  p.fileName,
        pendingPhotoMimeType:  p.mimeType,
        pendingPhotoSizeBytes: p.sizeBytes,
      }));
    }

    const url    = mode === 'create' ? '/api/items' : `/api/items/${itemId}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json   = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal menyimpan barang');
      return;
    }
    const id = json.data?.id ?? itemId;

    // Save roles — surface failure but don't block navigation
    if (values.roleIds.length > 0 || mode === 'edit') {
      const rolesRes = await fetch(`/api/items/${id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: values.roleIds }),
      }).catch(() => null);
      if (!rolesRes?.ok) {
        setError('Barang disimpan, tetapi peranan gagal dikemaskini. Sila cuba semula.');
        setSubmitting(false);
        return;
      }
    }

    // router.push from next/navigation silently fails after chained awaits in some
    // Next.js App Router versions. window.location.replace navigates reliably and
    // drops the edit page from history so Back goes to the list, not back to edit.
    window.location.replace(`/items/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-24 md:pb-6">

      {/* ── Photo zone ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Foto barang</h2>
        <MultiFileUpload
          itemId={mode === 'edit' && itemId ? itemId : 0}
          kind="photo"
          accept="image/jpeg,image/png"
          acceptLabel="JPG atau PNG"
          maxFiles={5}
          maxBytesPerFile={2 * 1024 * 1024}
          existingFiles={existingPhotos}
          canDelete={canDelete}
          mode={mode === 'edit' ? 'immediate' : 'pending'}
          saveEndpoint={mode === 'edit' && itemId ? `/api/items/${itemId}/photos` : undefined}
          onPendingChange={setPendingPhotos}
        />
      </div>

      {/* ── Required fields ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Maklumat asas</h2>

        <Field id="name" label="Nama barang" required>
          <TextInput id="name" value={values.name} onChange={(v) => update('name', v)} required placeholder="cth: Periuk Besar, Mic Wireless" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="categoryId" label="Kategori" required>
            <Select id="categoryId" value={values.categoryId} onChange={(v) => update('categoryId', v)} required>
              <option value="">Pilih kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameMs}</option>)}
            </Select>
          </Field>
          <Field id="currentLocationId" label="Lokasi" required>
            <Select id="currentLocationId" value={values.currentLocationId} onChange={(v) => update('currentLocationId', v)} required>
              <option value="">Pilih lokasi</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.nameMs}</option>)}
            </Select>
          </Field>
        </div>

        <Field id="trackingMode" label="Mod" hint="'Aset Individu' untuk barang dengan kod (cth: AC-01). 'Kuantiti' untuk barang banyak (cth: 4 periuk).">
          <Select id="trackingMode" value={values.trackingMode} onChange={(v) => update('trackingMode', v as 'quantity' | 'asset')}>
            <option value="quantity">Kuantiti — banyak unit yang sama</option>
            <option value="asset">Aset Individu — satu unit dengan kod</option>
          </Select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="quantity" label="Kuantiti" required>
            <NumberInput id="quantity" value={values.quantity} onChange={(v) => update('quantity', v)} min={isAsset ? 1 : 0} max={isAsset ? 1 : undefined} required disabled={isAsset} />
          </Field>
          <Field id="unitId" label="Unit" required>
            <Select id="unitId" value={values.unitId} onChange={(v) => update('unitId', v)} required>
              <option value="">Pilih unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.nameMs}</option>)}
            </Select>
          </Field>
        </div>

        {isAsset && (
          <Field id="assetCode" label="Kod aset" hint={selectedCategory ? `Kosongkan untuk auto-jana (${selectedCategory.prefix}-XXXX).` : 'Kosongkan untuk auto-jana selepas pilih kategori.'}>
            <TextInput id="assetCode" value={values.assetCode} onChange={(v) => update('assetCode', v.toUpperCase())} placeholder={selectedCategory ? `${selectedCategory.prefix}-0001` : 'XXX-0001'} />
          </Field>
        )}

        <Field id="status" label="Status" required>
          <Select id="status" value={values.status} onChange={(v) => update('status', v)} required>
            <option value="aktif">Aktif</option>
            <option value="tidak_cukup">Tidak Cukup</option>
            <option value="rosak">Rosak</option>
            <option value="dalam_servis">Dalam Servis</option>
          </Select>
        </Field>

        <Field id="notes" label="Nota">
          <Textarea id="notes" value={values.notes} onChange={(v) => update('notes', v)} placeholder="Maklumat tambahan tentang barang ini..." />
        </Field>
      </div>

      {/* ── Advanced (collapsible) ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl">
        <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="w-full flex items-center justify-between p-5 md:p-6 text-base font-semibold text-slate-800" aria-expanded={showAdvanced}>
          <span>Maklumat tambahan (pilihan)</span>
          {showAdvanced ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>
        {showAdvanced && (
          <div className="px-5 md:px-6 pb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="acquiredDate" label="Tarikh perolehan"><TextInput id="acquiredDate" type="date" value={values.acquiredDate} onChange={(v) => update('acquiredDate', v)} /></Field>
              <Field id="price" label="Harga (RM)"><TextInput id="price" type="number" value={values.price} onChange={(v) => update('price', v)} placeholder="0.00" /></Field>
              <Field id="acquisitionMethod" label="Kaedah perolehan">
                <Select id="acquisitionMethod" value={values.acquisitionMethod} onChange={(v) => update('acquisitionMethod', v)}>
                  <option value="">—</option>
                  <option value="beli">Beli</option>
                  <option value="sewa">Sewa</option>
                  <option value="sumbangan">Sumbangan</option>
                </Select>
              </Field>
              <Field id="supplier" label="Pembekal / Penyumbang"><TextInput id="supplier" value={values.supplier} onChange={(v) => update('supplier', v)} /></Field>
              <Field id="receiptReference" label="No. Resit / Rujukan"><TextInput id="receiptReference" value={values.receiptReference} onChange={(v) => update('receiptReference', v)} /></Field>
              <Field id="expiryDate" label="Tarikh luput"><TextInput id="expiryDate" type="date" value={values.expiryDate} onChange={(v) => update('expiryDate', v)} /></Field>
              <Field id="condition" label="Keadaan fizikal">
                <Select id="condition" value={values.condition} onChange={(v) => update('condition', v)}>
                  <option value="">—</option>
                  <option value="baik">Baik</option>
                  <option value="sederhana">Sederhana</option>
                  <option value="rosak">Rosak</option>
                </Select>
              </Field>
            </div>
            <Field id="maintenanceNotes" label="Nota penyelenggaraan"><Textarea id="maintenanceNotes" value={values.maintenanceNotes} onChange={(v) => update('maintenanceNotes', v)} /></Field>

            {institutionalRoles.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Peranan Institusi</p>
                <p className="text-xs text-slate-500 mb-2">Tandakan peranan yang berkaitan dengan barang ini.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {institutionalRoles.map((role) => {
                    const checked = values.roleIds.includes(role.id);
                    return (
                      <label key={role.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer select-none transition-colors ${checked ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...values.roleIds, role.id]
                              : values.roleIds.filter((id) => id !== role.id);
                            update('roleIds', next);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600"
                        />
                        <span className="text-sm text-slate-800">{role.nameMs}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Hayat &amp; Jaminan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="warrantyExpiry" label="Jaminan luput"><TextInput id="warrantyExpiry" type="date" value={values.warrantyExpiry} onChange={(v) => update('warrantyExpiry', v)} /></Field>
                <Field id="expectedLifespanYears" label="Jangkaan hayat (tahun)" hint="Berapa tahun barang ini dijangka tahan.">
                  <NumberInput id="expectedLifespanYears" value={values.expectedLifespanYears} onChange={(v) => update('expectedLifespanYears', v)} min={1} />
                </Field>
                <Field id="maintenanceIntervalDays" label="Selang servis (hari)" hint="Peringatan servis setiap berapa hari.">
                  <NumberInput id="maintenanceIntervalDays" value={values.maintenanceIntervalDays} onChange={(v) => update('maintenanceIntervalDays', v)} min={1} />
                </Field>
                <Field id="minimumQuantity" label="Kuantiti minimum" hint="Amaran stok rendah apabila di bawah nilai ini.">
                  <NumberInput id="minimumQuantity" value={values.minimumQuantity} onChange={(v) => update('minimumQuantity', v)} min={0} />
                </Field>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3" role="alert">{error}</div>}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 md:static bg-white md:bg-transparent border-t md:border-0 border-slate-200 p-4 md:p-0 z-20 flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()} disabled={submitting}><X className="size-4" /> Batal</Button>
        <Button type="submit" variant="primary" disabled={submitting} className="flex-1 md:flex-none">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {mode === 'create' ? 'Simpan barang' : 'Kemaskini'}
        </Button>
      </div>
    </form>
  );
}
