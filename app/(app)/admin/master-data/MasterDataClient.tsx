'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, X } from 'lucide-react';
import { Button, Field, TextInput } from '@/components/forms';

type Category = { id: number; code: string; nameMs: string; prefix: string; sortOrder: number };
type Unit = { id: number; code: string; nameMs: string; sortOrder: number };

export function MasterDataClient() {
  const [tab, setTab] = useState<'categories' | 'units'>('categories');

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-700">Data Induk</h1>
        <p className="text-sm text-slate-600 mt-1">Urus kategori dan unit. Lokasi dikunci pada setup awal.</p>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`h-9 px-4 rounded-md text-sm font-medium transition ${
            tab === 'categories' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kategori
        </button>
        <button
          type="button"
          onClick={() => setTab('units')}
          className={`h-9 px-4 rounded-md text-sm font-medium transition ${
            tab === 'units' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Unit
        </button>
      </div>

      {tab === 'categories' ? <CategoriesTab /> : <UnitsTab />}
    </div>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch('/api/categories').then((r) => r.json());
    setItems(res.data ?? []);
  }
  useEffect(() => { void load(); }, []);

  if (items === null) {
    return <div className="flex items-center gap-2 text-slate-500 py-10 justify-center"><Loader2 className="size-4 animate-spin" /> Memuat...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Kategori baru
        </Button>
      </div>

      {adding && (
        <CategoryForm
          onSave={async () => { setAdding(false); await load(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {items.map((c) => (
          <li key={c.id} className="p-4">
            {editingId === c.id ? (
              <CategoryForm
                initial={c}
                onSave={async () => { setEditingId(null); await load(); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-slate-900">{c.nameMs}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{c.prefix}</span> · {c.code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(c.id)}
                  className="h-9 px-3 rounded-md text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                >
                  Edit
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Category;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [nameMs, setNameMs] = useState(initial?.nameMs ?? '');
  const [prefix, setPrefix] = useState(initial?.prefix ?? '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 50));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const url = initial ? `/api/categories/${initial.id}` : '/api/categories';
    const method = initial ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, nameMs, prefix: prefix.toUpperCase(), sortOrder: Number(sortOrder) }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json?.error?.message ?? 'Gagal menyimpan');
      return;
    }
    void onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 -m-4 p-4 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="cat-name" label="Nama" required>
          <TextInput id="cat-name" value={nameMs} onChange={setNameMs} required />
        </Field>
        <Field id="cat-prefix" label="Prefix kod aset" required hint="2-5 huruf, cth: DPR">
          <TextInput id="cat-prefix" value={prefix} onChange={(v) => setPrefix(v.toUpperCase())} required />
        </Field>
        <Field id="cat-code" label="Kod (snake_case)" required hint="cth: dapur, dewan_solat">
          <TextInput id="cat-code" value={code} onChange={(v) => setCode(v.toLowerCase())} required />
        </Field>
        <Field id="cat-sort" label="Urutan paparan">
          <TextInput id="cat-sort" type="number" value={sortOrder} onChange={setSortOrder} />
        </Field>
      </div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-2.5">{error}</div>}
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}><X className="size-4" /> Batal</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
        </Button>
      </div>
    </form>
  );
}

function UnitsTab() {
  const [items, setItems] = useState<Unit[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    const res = await fetch('/api/units').then((r) => r.json());
    setItems(res.data ?? []);
  }
  useEffect(() => { void load(); }, []);

  if (items === null) return <div className="flex items-center gap-2 text-slate-500 py-10 justify-center"><Loader2 className="size-4 animate-spin" /> Memuat...</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Unit baru</Button>
      </div>

      {adding && (
        <UnitForm
          onSave={async () => { setAdding(false); await load(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {items.map((u) => (
          <li key={u.id} className="p-4">
            {editingId === u.id ? (
              <UnitForm
                initial={u}
                onSave={async () => { setEditingId(null); await load(); }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{u.nameMs}</div>
                  <div className="text-xs text-slate-500">{u.code}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(u.id)}
                  className="h-9 px-3 rounded-md text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                >
                  Edit
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnitForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Unit;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? '');
  const [nameMs, setNameMs] = useState(initial?.nameMs ?? '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 50));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const url = initial ? `/api/units/${initial.id}` : '/api/units';
    const method = initial ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, nameMs, sortOrder: Number(sortOrder) }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json?.error?.message ?? 'Gagal menyimpan');
      return;
    }
    void onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 -m-4 p-4 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field id="unit-name" label="Nama" required>
          <TextInput id="unit-name" value={nameMs} onChange={setNameMs} required placeholder="cth: Tin" />
        </Field>
        <Field id="unit-code" label="Kod" required>
          <TextInput id="unit-code" value={code} onChange={(v) => setCode(v.toLowerCase())} required placeholder="tin" />
        </Field>
        <Field id="unit-sort" label="Urutan">
          <TextInput id="unit-sort" type="number" value={sortOrder} onChange={setSortOrder} />
        </Field>
      </div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-2.5">{error}</div>}
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}><X className="size-4" /> Batal</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
        </Button>
      </div>
    </form>
  );
}
