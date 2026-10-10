'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME, ORG_NAME } from '@/lib/site';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, User as UserIcon, Users, Package, Database, ClipboardList, Activity } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export function Header({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === 'admin';

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/sign-in');
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-50 md:pt-4 md:px-4 pointer-events-none">
      <header className="pointer-events-auto bg-primary-800/90 backdrop-blur-xl text-white shadow-lg shadow-primary-900/5 md:rounded-2xl border-b md:border border-primary-700/50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={`Logo ${ORG_NAME}`}
            width={32}
            height={35}
            className="h-8 w-auto shrink-0"
            priority
          />
          <span className="font-semibold text-lg tracking-tight leading-tight">
            {APP_NAME}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link href="/items" className="hover:underline opacity-90 hover:opacity-100">
            Inventori
          </Link>
          <Link href="/reports" className="hover:underline opacity-90 hover:opacity-100">
            Laporan
          </Link>
          <Link href="/activity" className="hover:underline opacity-90 hover:opacity-100">
            Aktiviti
          </Link>
          <Link href="/admin/master-data" className="hover:underline opacity-90 hover:opacity-100">
            Data Induk
          </Link>
          {isAdmin && (
            <Link href="/admin/users" className="hover:underline opacity-90 hover:opacity-100">
              Pengguna
            </Link>
          )}
          <Link href="/me" className="hover:underline opacity-90 hover:opacity-100">
            {user.name}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-800 hover:bg-primary-900 transition"
          >
            <LogOut className="size-4" /> Log Keluar
          </button>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden p-2 -mr-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-primary-600 bg-primary-700">
          <div className="px-4 py-3 space-y-1">
            <div className="text-sm opacity-80 pb-2 border-b border-primary-600">{user.name}</div>
            <Link
              href="/items"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800"
            >
              <Package className="size-4" /> Inventori
            </Link>
            <Link
              href="/reports"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800"
            >
              <ClipboardList className="size-4" /> Laporan
            </Link>
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800"
            >
              <Activity className="size-4" /> Aktiviti
            </Link>
            <Link
              href="/admin/master-data"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800"
            >
              <Database className="size-4" /> Data Induk
            </Link>
            {isAdmin && (
              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800"
              >
                <Users className="size-4" /> Pengguna
              </Link>
            )}
            <Link
              href="/me"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800"
            >
              <UserIcon className="size-4" /> Profil
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-2 py-3 rounded hover:bg-primary-800 text-left"
            >
              <LogOut className="size-4" /> Log Keluar
            </button>
          </div>
        </div>
      )}
    </header>
    </div>
  );
}
