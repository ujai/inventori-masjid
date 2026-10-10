'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, ShieldOff, ShieldCheck } from 'lucide-react';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'ajk';
  phone: string | null;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
};

export function UserList({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message ?? 'Gagal memuat senarai pengguna');
      return;
    }
    setUsers(json.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(u: UserRow) {
    if (u.id === currentUserId) return;
    setBusyId(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json();
      alert(json?.error?.message ?? 'Gagal mengemaskini pengguna');
      return;
    }
    await load();
    router.refresh();
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      </div>
    );
  }

  if (users === null) {
    return (
      <div className="p-6 flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="size-4 animate-spin" /> Memuat...
      </div>
    );
  }

  if (users.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Tiada pengguna lagi.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-y border-slate-200 bg-slate-50">
          <tr className="text-left">
            <Th>Nama</Th>
            <Th>Emel</Th>
            <Th>Role</Th>
            <Th>Telefon</Th>
            <Th>Status</Th>
            <Th className="w-32">Tindakan</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                <Td>
                  <div className="font-medium text-slate-800">{u.name}</div>
                  {isSelf && <div className="text-xs text-primary-700 mt-0.5">(anda)</div>}
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-primary-100 text-primary-800'
                    }`}
                  >
                    {u.role === 'admin' ? 'Admin' : 'AJK'}
                  </span>
                </Td>
                <Td className="text-slate-600">{u.phone ?? '—'}</Td>
                <Td>
                  {u.active ? (
                    <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                      <span className="size-1.5 rounded-full bg-green-500" /> Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
                      <span className="size-1.5 rounded-full bg-slate-400" /> Tidak aktif
                    </span>
                  )}
                </Td>
                <Td>
                  {!isSelf && (
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => toggleActive(u)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition ${
                        u.active
                          ? 'border-red-200 text-red-700 hover:bg-red-50'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {busyId === u.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : u.active ? (
                        <ShieldOff className="size-3.5" />
                      ) : (
                        <ShieldCheck className="size-3.5" />
                      )}
                      {u.active ? 'Nyahaktif' : 'Aktif'}
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        >
          <RefreshCw className="size-3.5" /> Muat semula
        </button>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 md:px-6 py-2.5 font-semibold text-slate-700 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 md:px-6 py-3 align-middle ${className}`}>{children}</td>;
}
