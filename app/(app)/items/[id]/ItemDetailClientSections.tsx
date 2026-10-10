'use client';

import { useState } from 'react';
import { formatDateTimeMY } from '@/lib/format';
import { ReturnMovementButton } from './MovementForm';

const CONDITION_LABELS: Record<string, string> = {
  baik: 'Baik',
  sederhana: 'Sederhana',
  rosak: 'Rosak',
};

const PURPOSE_LABELS: Record<string, string> = {
  pinjam: 'Pinjam',
  pindah_lokasi: 'Pindah Lokasi',
  kenduri: 'Kenduri',
  kelas: 'Kelas',
  qurban: 'Qurban',
  lain: 'Lain-lain',
};

export type SerializedServiceLog = {
  id: number;
  serviceDate: string;
  nextServiceDate: string | null;
  conditionBefore: string | null;
  conditionAfter: string | null;
  cost: string | null;
  notes: string | null;
  performerName: string | null;
};

export type SerializedMovementLog = {
  id: number;
  quantityMoved: number;
  purpose: string;
  borrowerName: string | null;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  returnCondition: string | null;
  notes: string | null;
  createdAt: string;
  fromLocationName: string | null;
  toLocationName: string | null;
  handlerName: string | null;
};

export function ServiceLogList({ logs, limit = 3 }: { logs: SerializedServiceLog[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? logs : logs.slice(0, limit);

  return (
    <>
      <ul className="space-y-3">
        {visible.map((log) => (
          <li key={log.id} className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-medium text-slate-900">Servis pada {log.serviceDate}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Oleh {log.performerName ?? '—'}
                  {log.nextServiceDate ? ` · Servis seterusnya: ${log.nextServiceDate}` : ''}
                </div>
              </div>
              {log.cost ? <span className="text-sm font-medium text-slate-700">RM {Number(log.cost).toFixed(2)}</span> : null}
            </div>
            <div className="mt-2 text-sm text-slate-700 space-y-1">
              {(log.conditionBefore || log.conditionAfter) && (
                <p>
                  Keadaan: {log.conditionBefore ? CONDITION_LABELS[log.conditionBefore] : '—'} →{' '}
                  {log.conditionAfter ? CONDITION_LABELS[log.conditionAfter] : 'Tidak ubah'}
                </p>
              )}
              {log.notes && <p className="whitespace-pre-wrap">{log.notes}</p>}
            </div>
          </li>
        ))}
      </ul>
      {logs.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary-700 hover:text-primary-900 font-medium mt-1"
        >
          {expanded ? '↑ Sembunyikan' : `↓ Lihat semua (${logs.length} rekod)`}
        </button>
      )}
    </>
  );
}

export function MovementLogList({
  logs,
  itemId,
  unitNameMs,
  limit = 5,
}: {
  logs: SerializedMovementLog[];
  itemId: number;
  unitNameMs: string;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // Active borrows (unresolved pinjam) always shown regardless of position in list
  const activeBorrowIds = new Set(
    logs.filter((l) => l.purpose === 'pinjam' && !l.returnedDate).map((l) => l.id),
  );

  let visible: SerializedMovementLog[];
  if (expanded) {
    visible = logs;
  } else {
    const slots = Math.max(0, limit - activeBorrowIds.size);
    const guaranteed = logs.filter((l) => activeBorrowIds.has(l.id));
    const rest = logs.filter((l) => !activeBorrowIds.has(l.id)).slice(0, slots);
    const visibleIds = new Set([...guaranteed.map((l) => l.id), ...rest.map((l) => l.id)]);
    // Preserve original server order (date desc)
    visible = logs.filter((l) => visibleIds.has(l.id));
  }

  return (
    <>
      <ul className="space-y-3">
        {visible.map((log) => {
          const activeBorrow = log.purpose === 'pinjam' && !log.returnedDate;
          return (
            <li key={log.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-slate-900">{PURPOSE_LABELS[log.purpose] ?? log.purpose}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Oleh {log.handlerName ?? '—'} · {formatDateTimeMY(log.createdAt)}
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700">{log.quantityMoved} {unitNameMs}</span>
              </div>
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                {(log.fromLocationName || log.toLocationName) && (
                  <p>Lokasi: {log.fromLocationName ?? '—'} → {log.toLocationName ?? '—'}</p>
                )}
                {log.borrowerName && <p>Peminjam: {log.borrowerName}</p>}
                {log.expectedReturnDate && <p>Jangka pulang: {log.expectedReturnDate}</p>}
                {log.returnedDate && <p>Dipulangkan: {log.returnedDate}</p>}
                {log.returnCondition && <p>Keadaan pulang: {CONDITION_LABELS[log.returnCondition]}</p>}
                {log.notes && <p className="whitespace-pre-wrap">{log.notes}</p>}
              </div>
              {activeBorrow && <ReturnMovementButton itemId={itemId} movementId={log.id} />}
            </li>
          );
        })}
      </ul>
      {logs.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary-700 hover:text-primary-900 font-medium mt-1"
        >
          {expanded ? '↑ Sembunyikan' : `↓ Lihat semua (${logs.length} rekod)`}
        </button>
      )}
    </>
  );
}

export function CollapsibleMaklumatTambahan({
  children,
  fieldCount,
}: {
  children: React.ReactNode;
  fieldCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center justify-between w-full text-left gap-2"
      >
        <h2 className="text-base font-semibold text-slate-800">
          Maklumat tambahan
          {fieldCount > 0 && (
            <span className="ml-2 text-xs font-normal text-slate-500">({fieldCount} maklumat)</span>
          )}
        </h2>
        <span className="text-slate-400 text-sm flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm mt-3">
          {children}
        </dl>
      )}
    </div>
  );
}
