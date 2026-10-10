'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ChevronLeft, ChevronRight, Loader2, Trash2, X } from 'lucide-react';

const MAX_PHOTOS = 5;
const MAX_BYTES  = 2 * 1024 * 1024;
const ALLOWED    = ['image/jpeg', 'image/png'];

export type PhotoItem = {
  id:       number;
  url:      string;       // presigned GET URL (generated server-side)
  fileName: string | null;
};

export function PhotoGallery({
  itemId,
  photos,
  canUpload,
  canDelete,
}: {
  itemId:    number;
  photos:    PhotoItem[];
  canUpload: boolean;
  canDelete: boolean;
}) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox]   = useState<number | null>(null); // index
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const atLimit = photos.length >= MAX_PHOTOS;

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);

    if (!ALLOWED.includes(file.type)) {
      setError('Hanya JPG atau PNG dibenarkan.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Foto terlalu besar. Had maksimum 2MB (saiz semasa: ${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      return;
    }

    setUploading(true);
    try {
      // 1. Get presigned PUT URL
      const presignRes = await fetch('/api/upload/presign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, kind: 'photo', mimeType: file.type, sizeBytes: file.size, fileName: file.name }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignJson?.error?.message ?? 'Gagal dapatkan URL muat naik');
      const { key, presignUrl } = presignJson.data;

      // 2. PUT directly to R2
      const uploadRes = await fetch(presignUrl, {
        method:  'PUT',
        headers: { 'Content-Type': file.type },
        body:    file,
      });
      if (!uploadRes.ok) throw new Error('Gagal muat naik foto ke storan');

      // 3. Save attachment record in DB
      const saveRes = await fetch(`/api/items/${itemId}/photos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Key: key, fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson?.error?.message ?? 'Gagal menyimpan foto');

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal muat naik foto');
    } finally {
      setUploading(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(photoId: number) {
    setDeleting(photoId);
    try {
      const res = await fetch(`/api/attachments/${photoId}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        setError(j?.error?.message ?? 'Gagal padam foto');
        return;
      }
      if (lightbox !== null) {
        const next = photos.length - 1 === 0 ? null : Math.max(0, lightbox - 1);
        setLightbox(next);
      }
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  // ── Lightbox navigation ──────────────────────────────────────────────────────

  function prev() { setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)); }
  function next() { setLightbox((i) => (i === null ? null : (i + 1) % photos.length)); }

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(i)}
              className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-primary-300 hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.fileName ?? `Foto ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || atLimit}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {uploading
              ? <><Loader2 className="size-4 animate-spin" /> Memuat naik...</>
              : <><Camera className="size-4" /> Tambah foto</>
            }
          </button>
          <p className="text-xs text-slate-500 mt-1">
            {photos.length}/{MAX_PHOTOS} foto · JPG atau PNG · maks 2MB setiap foto
          </p>
          {atLimit && <p className="text-xs text-amber-600 mt-0.5">Had {MAX_PHOTOS} foto telah dicapai.</p>}
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      )}

      {photos.length === 0 && !canUpload && (
        <p className="text-sm text-slate-500 italic">Tiada foto.</p>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
            aria-label="Tutup"
          >
            <X className="size-7" />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-4 text-white/70 text-sm">
            {lightbox + 1} / {photos.length}
          </span>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 sm:left-6 text-white/80 hover:text-white p-2"
                aria-label="Sebelum"
              >
                <ChevronLeft className="size-8" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 sm:right-6 text-white/80 hover:text-white p-2"
                aria-label="Seterusnya"
              >
                <ChevronRight className="size-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightbox].url}
              alt={photos[lightbox].fileName ?? `Foto ${lightbox + 1}`}
              className="max-h-[75vh] w-auto rounded-lg object-contain"
            />
            <p className="text-white/60 text-xs">{photos[lightbox].fileName}</p>

            {canDelete && lightbox !== null && photos[lightbox] && (
              <button
                type="button"
                onClick={() => { if (lightbox !== null && photos[lightbox]) handleDelete(photos[lightbox].id); }}
                disabled={lightbox !== null && photos[lightbox] ? deleting === photos[lightbox].id : false}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {lightbox !== null && photos[lightbox] && deleting === photos[lightbox].id
                  ? <Loader2 className="size-4 animate-spin" />
                  : <Trash2 className="size-4" />
                }
                Padam foto ini
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
