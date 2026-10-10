'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, Send, Unlink } from 'lucide-react';

export function TelegramSection({
  linked,
  username,
  telegramEnabled,
  emailEnabled,
}: {
  linked:          boolean;
  username:        string | null;
  telegramEnabled: boolean;
  emailEnabled:    boolean;
}) {
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [tgOn, setTgOn]           = useState(telegramEnabled);
  const [emailOn, setEmailOn]     = useState(emailEnabled);
  const [isLinked, setIsLinked]   = useState(linked);
  const [tgUser, setTgUser]       = useState(username);

  async function handleLink() {
    setError(null);
    setBusy(true);
    const res  = await fetch('/api/telegram/link', { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json?.error?.message ?? 'Gagal jana pautan'); return; }
    window.open(json.data.deepLink, '_blank', 'noopener,noreferrer');
  }

  async function handleUnlink() {
    setError(null);
    setBusy(true);
    const res = await fetch('/api/telegram/unlink', { method: 'POST' });
    setBusy(false);
    if (!res.ok) { setError('Gagal nyahsambung'); return; }
    setIsLinked(false);
    setTgUser(null);
    setTgOn(false);
  }

  async function patchPref(field: 'email' | 'telegram', value: boolean) {
    const res = await fetch('/api/me/preferences', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field === 'email' ? 'notificationEmailEnabled' : 'notificationTelegramEnabled']: value }),
    });
    if (!res.ok) setError('Gagal kemaskini pilihan');
  }

  return (
    <div className="space-y-4">
      {/* Email notifications */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">Peringatan emel</p>
          <p className="text-xs text-slate-500">Terima ringkasan harian melalui emel</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailOn}
          onClick={() => { setEmailOn((v) => { void patchPref('email', !v); return !v; }); }}
          className={`relative inline-flex h-6 w-11 rounded-full transition ${emailOn ? 'bg-primary-600' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition mt-0.5 ${emailOn ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Telegram */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Send className="size-4 text-blue-500" />
          <p className="text-sm font-medium text-slate-800">Telegram</p>
          {isLinked && (
            <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">Disambung</span>
          )}
        </div>

        {isLinked ? (
          <div className="space-y-3">
            {tgUser && <p className="text-sm text-slate-600">@{tgUser}</p>}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Peringatan Telegram</p>
                <p className="text-xs text-slate-500">Terima peringatan harian di Telegram</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={tgOn}
                onClick={() => { setTgOn((v) => { void patchPref('telegram', !v); return !v; }); }}
                className={`relative inline-flex h-6 w-11 rounded-full transition ${tgOn ? 'bg-primary-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition mt-0.5 ${tgOn ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleUnlink}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
              Nyahsambung Telegram
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Sambung Telegram untuk terima peringatan harian terus di Telegram anda.
            </p>
            <button
              type="button"
              onClick={handleLink}
              disabled={busy}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
              Sambung dengan Telegram
            </button>
            <p className="text-xs text-slate-500">Anda akan dibawa ke Telegram. Klik "Start" untuk selesaikan sambungan.</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
