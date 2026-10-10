'use client';

/**
 * Reusable multi-file upload component.
 *
 * Handles: multi-select, per-file validation, sequential presign+PUT to R2,
 * per-file status display, and deletion.
 *
 * Two modes:
 *  'immediate' — upload + save to DB as soon as file is selected.
 *               Used for photos on existing items (edit) and police reports.
 *  'pending'   — upload to R2 only; parent collects keys via onPendingChange
 *               for submitting with a create form.
 */

import { useRef, useState } from 'react';
import { CheckCircle, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';

export type SavedFile = {
  id: number;
  url: string;          // presigned GET URL or blob URL preview
  fileName: string | null;
  mimeType: string;
};

export type PendingFile = {
  key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string;
};

type QueueItem = {
  uid:      string;
  fileName: string;
  state:    'uploading' | 'done' | 'error';
  error?:   string;
  key?:     string;
  previewUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  savedId?: number;
};

type Props = {
  itemId: number;
  kind: 'photo' | 'police_report';
  accept: string;             // e.g. "image/jpeg,image/png"
  acceptLabel: string;        // e.g. "JPG atau PNG"
  maxFiles: number;
  maxBytesPerFile: number;
  existingFiles?: SavedFile[];
  canDelete?: boolean;
  mode: 'immediate' | 'pending';
  onPendingChange?: (files: PendingFile[]) => void;
  saveEndpoint?: string;      // required for immediate mode
};

function uid() {
  return Math.random().toString(36).slice(2);
}

export function MultiFileUpload({
  itemId,
  kind,
  accept,
  acceptLabel,
  maxFiles,
  maxBytesPerFile,
  existingFiles = [],
  canDelete = false,
  mode,
  onPendingChange,
  saveEndpoint,
}: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [saved,    setSaved]   = useState<SavedFile[]>(existingFiles);
  const [queue,    setQueue]   = useState<QueueItem[]>([]);
  const [pending,  setPending] = useState<PendingFile[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);

  const totalFiles = saved.length + queue.filter((q) => q.state !== 'error').length;
  const atLimit    = totalFiles >= maxFiles;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const allowedMimes = accept.split(',').map((s) => s.trim().toLowerCase());

  function isAllowed(file: File) {
    return allowedMimes.includes(file.type.toLowerCase());
  }

  function updateQueue(itemUid: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => q.uid === itemUid ? { ...q, ...patch } : q));
  }

  // ── File selection & upload ────────────────────────────────────────────────

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!selected.length) return;

    // Only take as many as fit within the limit
    const available = maxFiles - totalFiles;
    const files     = selected.slice(0, available);

    // Add all to queue immediately (optimistic UI)
    const newItems: QueueItem[] = files.map((f) => ({
      uid:      uid(),
      fileName: f.name,
      state:    'uploading' as const,
    }));
    setQueue((prev) => [...prev, ...newItems]);

    // Upload each sequentially
    files.forEach((file, i) => {
      const item = newItems[i]!;
      if (!isAllowed(file)) {
        updateQueue(item.uid, { state: 'error', error: `Jenis fail tidak dibenarkan: ${file.name}` });
        return;
      }
      if (file.size > maxBytesPerFile) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        updateQueue(item.uid, { state: 'error', error: `Fail terlalu besar (${mb}MB): ${file.name}` });
        return;
      }
      void uploadFile(file, item.uid);
    });
  }

  async function uploadFile(file: File, itemUid: string) {
    try {
      // 1. Get presigned PUT URL
      const presignRes  = await fetch('/api/upload/presign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, kind, mimeType: file.type, sizeBytes: file.size, fileName: file.name }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignJson?.error?.message ?? 'Gagal muat naik');
      const { key, presignUrl } = presignJson.data;

      // 2. PUT to R2
      const uploadRes = await fetch(presignUrl, {
        method:  'PUT',
        headers: { 'Content-Type': file.type },
        body:    file,
      });
      if (!uploadRes.ok) throw new Error('Gagal muat naik ke storan');

      const previewUrl = URL.createObjectURL(file);

      if (mode === 'immediate' && saveEndpoint) {
        // 3a. Save attachment to DB immediately
        const saveRes  = await fetch(saveEndpoint, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ r2Key: key, fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
        });
        const saveJson = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveJson?.error?.message ?? 'Gagal menyimpan');

        updateQueue(itemUid, { state: 'done', savedId: saveJson.data.id, key, previewUrl, mimeType: file.type });
        setSaved((prev) => [...prev, { id: saveJson.data.id, url: previewUrl, fileName: file.name, mimeType: file.type }]);
      } else {
        // 3b. Pending: let parent collect keys on form submit
        const p: PendingFile = { key, fileName: file.name, mimeType: file.type, sizeBytes: file.size, previewUrl };
        updateQueue(itemUid, { state: 'done', key, previewUrl, mimeType: file.type, sizeBytes: file.size });
        setPending((prev) => {
          const next = [...prev, p];
          onPendingChange?.(next);
          return next;
        });
      }
    } catch (err) {
      updateQueue(itemUid, { state: 'error', error: err instanceof Error ? err.message : 'Ralat tidak diketahui' });
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(fileId: number) {
    setDeleting(fileId);
    try {
      const res = await fetch(`/api/attachments/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setSaved((prev) => prev.filter((f) => f.id !== fileId));
        setQueue((prev) => prev.filter((q) => q.savedId !== fileId));
      }
    } finally {
      setDeleting(null);
    }
  }

  function removePending(key: string) {
    setQueue((prev) => prev.filter((q) => {
      if (q.key === key) {
        if (q.previewUrl) URL.revokeObjectURL(q.previewUrl);
        return false;
      }
      return true;
    }));
    setPending((prev) => {
      const next = prev.filter((p) => p.key !== key);
      onPendingChange?.(next);
      return next;
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isImage = (mime?: string | null) => !!mime && mime.startsWith('image/');

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        onChange={handleSelect}
      />

      {/* Thumbnails of saved files */}
      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((f) => (
            <div key={f.id} className="relative group h-20 w-20 shrink-0">
              {isImage(f.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.fileName ?? ''} className="h-full w-full rounded-xl object-cover border border-slate-200" />
              ) : (
                <div className="h-full w-full rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
                  <FileText className="size-6 text-slate-400" />
                  <span className="text-[10px] text-slate-500 uppercase">{f.fileName?.split('.').pop()}</span>
                </div>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  disabled={deleting === f.id}
                  className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  {deleting === f.id
                    ? <Loader2 className="size-5 text-white animate-spin" />
                    : <Trash2 className="size-5 text-white" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* In-progress / done / error queue */}
      {queue.filter((q) => q.state !== 'done' || !q.savedId).length > 0 && (
        <ul className="space-y-1.5">
          {queue.filter((q) => !(q.state === 'done' && q.savedId)).map((q) => (
            <li key={q.uid} className="flex items-center gap-2 text-sm py-0.5">
              {q.state === 'uploading' && <Loader2 className="size-4 text-primary-500 animate-spin shrink-0" />}
              {q.state === 'done'      && <CheckCircle className="size-4 text-green-600 shrink-0" />}
              {q.state === 'error'     && <X className="size-4 text-red-500 shrink-0" />}
              <span className={`truncate flex-1 ${q.state === 'error' ? 'text-red-600' : 'text-slate-700'}`}>
                {q.state === 'uploading' && `Memuat naik ${q.fileName}...`}
                {q.state === 'done'      && q.fileName}
                {q.state === 'error'     && (q.error ?? q.fileName)}
              </span>
              {q.state === 'done' && mode === 'pending' && q.key && (
                <button type="button" onClick={() => removePending(q.key!)} className="text-slate-400 hover:text-red-500 shrink-0">
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Upload trigger */}
      {!atLimit ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-dashed border-slate-300 hover:border-primary-400 hover:bg-primary-50/30 text-sm text-slate-600 transition"
        >
          <Upload className="size-4" />
          {totalFiles === 0
            ? `Pilih fail (maks ${maxFiles})`
            : `Tambah lagi (${totalFiles}/${maxFiles})`}
        </button>
      ) : (
        <p className="text-xs text-amber-600">Had {maxFiles} fail telah dicapai.</p>
      )}

      <p className="text-xs text-slate-400">{acceptLabel} · maks {maxBytesPerFile / 1024 / 1024}MB setiap fail</p>
    </div>
  );
}
