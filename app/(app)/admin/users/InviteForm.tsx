'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';

export function InviteForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'ajk'>('ajk');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        phone: phone.trim() || undefined,
      }),
    });
    setLoading(false);
    const json = await res.json();
    if (!res.ok) {
      setMessage({ kind: 'err', text: json?.error?.message ?? 'Gagal mencipta pengguna' });
      return;
    }
    setName('');
    setEmail('');
    setPhone('');
    setRole('ajk');
    setMessage({
      kind: 'ok',
      text: `Pengguna baru dicipta. Emel undangan telah dihantar — mereka boleh log masuk dengan Google menggunakan emel itu.`,
    });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label htmlFor="name">Nama penuh</Label>
        <Input id="name" value={name} onChange={setName} required placeholder="Contoh: Ahmad bin Ali" />
      </div>
      <div>
        <Label htmlFor="email">Emel</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          placeholder="contoh@gmail.com"
        />
      </div>
      <div>
        <Label htmlFor="phone">No. telefon (pilihan)</Label>
        <Input id="phone" value={phone} onChange={setPhone} placeholder="+60123456789" />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'ajk')}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white"
        >
          <option value="ajk">AJK — boleh urus inventori, tidak boleh padam atau urus pengguna</option>
          <option value="admin">Admin — akses penuh</option>
        </select>
      </div>

      {message && (
        <div
          className={`md:col-span-2 rounded-lg text-sm p-3 ${
            message.kind === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Hantar undangan
        </button>
      </div>
    </form>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
      {children}
    </label>
  );
}

function Input({
  id,
  type = 'text',
  value,
  onChange,
  required,
  placeholder,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
    />
  );
}
