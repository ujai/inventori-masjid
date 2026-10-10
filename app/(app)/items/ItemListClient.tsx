'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Loader2, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Select, StatusBadge } from '@/components/forms';
import { parseDateLocal, computeHealthScore } from '@/lib/health';

type Item = {
  id: number;
  name: string;
  quantity: number;
  status: string;
  condition: string | null;
  trackingMode: 'quantity' | 'asset';
  assetCode: string | null;
  nextServiceDate: string | null;
  minimumQuantity: number | null;
  warrantyExpiry: string | null;
  expectedLifespanYears: number | null;
  acquiredDate: string | null;
  category: { id: number; nameMs: string; prefix: string };
  location: { id: number; nameMs: string };
  unit: { id: number; nameMs: string };
};

function getServiceHealth(nextServiceDate: string | null): 'overdue' | 'due_soon' | null {
  if (!nextServiceDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const svc = parseDateLocal(nextServiceDate);
  const diffDays = Math.ceil((svc.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'due_soon';
  return null;
}

function getWarrantyHealth(warrantyExpiry: string | null): 'expired' | 'expiring_soon' | null {
  if (!warrantyExpiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = parseDateLocal(warrantyExpiry);
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return null;
}

type Category = { id: number; nameMs: string };
type Location = { id: number; nameMs: string };

export function ItemListClient({ canCreate }: { canCreate: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<'status' | 'location'>('status');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    void loadMasterData();
  }, []);

  useEffect(() => {
    void loadItems();
  }, [debouncedQ, categoryId, locationId, status, condition, includeArchived]);

  async function loadMasterData() {
    const [c, l] = await Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/locations').then((r) => r.json()),
    ]);
    setCategories(c.data ?? []);
    setLocations(l.data ?? []);
  }

  async function loadItems() {
    setError(null);
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (categoryId) params.set('categoryId', categoryId);
    if (locationId) params.set('locationId', locationId);
    if (status) params.set('status', status);
    if (condition) params.set('condition', condition);
    if (includeArchived) params.set('includeArchived', 'true');
    const res = await fetch(`/api/items?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal memuat senarai');
      return;
    }
    setItems(json.data);
  }

  const activeFilters = useMemo(
    () => [categoryId, locationId, status, condition, includeArchived ? 'archived' : ''].filter(Boolean).length,
    [categoryId, locationId, status, condition, includeArchived],
  );

  function clearFilters() {
    setCategoryId('');
    setLocationId('');
    setStatus('');
    setCondition('');
    setIncludeArchived(false);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!items) return;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  function exitBulkMode() {
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkValue('');
    setBulkError(null);
  }

  async function applyBulk() {
    if (selectedIds.size === 0 || !bulkValue) return;
    setBulkError(null);
    setBulkBusy(true);
    const res = await fetch('/api/items/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedIds), action: bulkAction, value: bulkValue }),
    });
    const json = await res.json();
    setBulkBusy(false);
    if (!res.ok) {
      setBulkError(json?.error?.message ?? 'Gagal kemaskini');
      return;
    }
    exitBulkMode();
    void loadItems();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-700">Inventori</h1>
        {canCreate && (
          <Link
            href="/items/new"
            className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-base transition"
          >
            <Plus className="size-4" /> <span className="hidden sm:inline">Tambah Barang</span>
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari barang... (cth: periuk, AC-01)"
          className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-300 bg-white text-base focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
        />
      </div>

      {/* Filter toggle + Bulk toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 hover:shadow-sm text-sm font-medium text-slate-700 transition-all"
          >
            <SlidersHorizontal className="size-4 text-slate-500" />
            Tapis
            {activeFilters > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-md bg-primary-600 text-white text-xs font-bold">{activeFilters}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium transition-all ${bulkMode ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-300 hover:bg-slate-50 text-slate-700'}`}
          >
            <CheckSquare className="size-4" /> Pilih
          </button>
        </div>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <X className="size-3.5" /> Buang tapisan
          </button>
        )}
      </div>

      {/* Slide-out Overlay */}
      {showFilters && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* Slide-out Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:max-w-md bg-white/95 backdrop-blur-2xl shadow-2xl border-l border-slate-200 z-50 flex flex-col transition-transform duration-500 ease-in-out ${
          showFilters ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Tapis Inventori</h2>
          <button 
            type="button" 
            onClick={() => setShowFilters(false)}
            className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Kategori</label>
            <Select id="filter-category" value={categoryId} onChange={setCategoryId}>
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameMs}</option>
              ))}
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Lokasi</label>
            <Select id="filter-location" value={locationId} onChange={setLocationId}>
              <option value="">Semua lokasi</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.nameMs}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <Select id="filter-status" value={status} onChange={setStatus}>
              <option value="">Semua status</option>
              <option value="aktif">Aktif</option>
              <option value="tidak_cukup">Tidak Cukup</option>
              <option value="rosak">Rosak</option>
              <option value="dalam_servis">Dalam Servis</option>
              <option value="dipinjam">Dipinjam</option>
              {includeArchived && <option value="hilang">Hilang</option>}
              {includeArchived && <option value="dilupuskan">Dilupuskan</option>}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Keadaan fizikal</label>
            <Select id="filter-condition" value={condition} onChange={setCondition}>
              <option value="">Semua keadaan</option>
              <option value="baik">Baik</option>
              <option value="sederhana">Sederhana</option>
              <option value="rosak">Rosak</option>
            </Select>
          </div>

          <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer select-none mt-4">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-primary-700 focus:ring-primary-700"
            />
            <span className="text-sm font-medium text-slate-700">Tunjuk barang hilang &amp; dilupuskan</span>
          </label>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setShowFilters(false)}
            className="w-full h-12 bg-primary-700 hover:bg-primary-800 text-white rounded-xl font-semibold shadow-sm hover:shadow transition-all"
          >
            Lihat Keputusan
          </button>
        </div>
      </div>

      {/* Result */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">{error}</div>
      )}

      {items === null ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between bg-white rounded-2xl h-[104px] p-5 border border-slate-200">
              <div className="space-y-3 flex-1 pr-4">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              </div>
              <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-700 font-medium">Tiada barang dijumpai</p>
          <p className="text-sm text-slate-500 mt-1">Cuba ubah perkataan carian atau buang tapisan.</p>
          {canCreate && (
            <Link
              href="/items/new"
              className="inline-flex items-center gap-2 h-11 px-4 mt-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium transition"
            >
              <Plus className="size-4" /> Tambah barang baru
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{items.length} barang</p>
            {bulkMode && (
              <button type="button" onClick={toggleSelectAll} className="text-xs text-primary-600 hover:underline">
                {selectedIds.size === items.length ? 'Nyahpilih semua' : 'Pilih semua'}
              </button>
            )}
          </div>

          {/* Bulk action toolbar */}
          {bulkMode && selectedIds.size > 0 && (
            <div className="sticky top-20 z-40 bg-white border border-primary-200 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-800">{selectedIds.size} barang dipilih</span>
                <button type="button" onClick={exitBulkMode} className="text-xs text-slate-500 hover:text-slate-800">
                  <X className="size-4 inline" /> Batal
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select id="bulk-action" value={bulkAction} onChange={(v) => { setBulkAction(v as 'status' | 'location'); setBulkValue(''); }}>
                  <option value="status">Tukar status</option>
                  <option value="location">Pindah lokasi</option>
                </Select>
                {bulkAction === 'status' ? (
                  <Select id="bulk-value-status" value={bulkValue} onChange={setBulkValue}>
                    <option value="">Pilih status...</option>
                    <option value="aktif">Aktif</option>
                    <option value="tidak_cukup">Tidak Cukup</option>
                    <option value="rosak">Rosak</option>
                    <option value="dalam_servis">Dalam Servis</option>
                  </Select>
                ) : (
                  <Select id="bulk-value-location" value={bulkValue} onChange={setBulkValue}>
                    <option value="">Pilih lokasi...</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.nameMs}</option>)}
                  </Select>
                )}
                <button
                  type="button"
                  onClick={applyBulk}
                  disabled={bulkBusy || !bulkValue}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Guna
                </button>
              </div>
              {bulkError && <p className="text-xs text-red-600">{bulkError}</p>}
            </div>
          )}

          <ul className="space-y-2">
            {items.map((item) => {
              const checked = selectedIds.has(item.id);
              if (bulkMode) {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`w-full text-left group block bg-white border rounded-2xl p-5 transition-all duration-200 ${checked ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            readOnly
                            checked={checked}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-900 text-base truncate">{item.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {item.assetCode ? <span className="font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.assetCode}</span> : null}
                              {item.assetCode ? <span className="mx-1.5 text-slate-300">·</span> : ''}
                              {item.category.nameMs}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-sm text-slate-700 pl-7">
                        <span className="font-medium">{item.quantity} {item.unit.nameMs}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600">{item.location.nameMs}</span>
                      </div>
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <Link
                    href={`/items/${item.id}`}
                    className="group block bg-white border border-slate-200 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-1 rounded-2xl p-5 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 text-base truncate group-hover:text-primary-700 transition-colors">{item.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                          {item.assetCode ? <span className="font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.assetCode}</span> : null}
                          {item.assetCode ? <span className="text-slate-300">·</span> : ''}
                          {item.category.nameMs}
                          {(() => {
                            const h = getServiceHealth(item.nextServiceDate);
                            if (h === 'overdue') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Servis tertunggak</span>;
                            if (h === 'due_soon') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Servis 30 hari akan datang</span>;
                            return null;
                          })()}
                          {(() => {
                            const w = getWarrantyHealth(item.warrantyExpiry);
                            if (w === 'expired') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Waranti luput</span>;
                            if (w === 'expiring_soon') return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">Waranti hampir luput</span>;
                            return null;
                          })()}
                          {item.minimumQuantity != null && item.quantity <= item.minimumQuantity && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">Stok rendah</span>
                          )}
                          {(() => {
                            const health = computeHealthScore(item);
                            if (health.score >= 100) return null;
                            const cls = health.color === 'green' ? 'bg-green-100 text-green-700'
                              : health.color === 'amber' ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700';
                            return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${cls}`}>Kesihatan: {health.score}</span>;
                          })()}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
                      <span className="font-medium">{item.quantity} {item.unit.nameMs}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">{item.location.nameMs}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
