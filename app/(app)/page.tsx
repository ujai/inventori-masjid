import { headers } from 'next/headers';
import Link from 'next/link';
import { formatActivityTimeMY } from '@/lib/format';
import {
  AlertTriangle, Calendar, ClipboardList, Package,
  Plus, Settings, Users, Wrench,
} from 'lucide-react';

import { auth } from '@/lib/auth';
import { getDashboardStats, ACTION_LABELS } from '@/lib/reports';

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { name, role } = session.user;
  const isAdmin = role === 'admin';

  const stats = await getDashboardStats();

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-sm text-slate-500">Selamat datang,</p>
        <h1 className="text-2xl font-bold text-primary-700 mt-0.5">{name}</h1>
      </div>

      {/* Alerts */}
      {(stats.dueSoon > 0 || stats.expiringSoon > 0 || stats.dipinjam > 0) && (
        <div className="space-y-2">
          {stats.dueSoon > 0 && (
            <AlertBanner
              icon={<Wrench className="size-4" />}
              color="amber"
              href="/reports/perlu-servis"
              message={`${stats.dueSoon} barang perlu servis dalam 30 hari`}
            />
          )}
          {stats.expiringSoon > 0 && (
            <AlertBanner
              icon={<Calendar className="size-4" />}
              color="orange"
              href="/reports/hampir-luput"
              message={`${stats.expiringSoon} barang hampir luput dalam 60 hari`}
            />
          )}
          {stats.dipinjam > 0 && (
            <AlertBanner
              icon={<AlertTriangle className="size-4" />}
              color="blue"
              href="/reports/dipinjam"
              message={`${stats.dipinjam} barang sedang dipinjam`}
            />
          )}
        </div>
      )}

      {/* Dashboard Content */}
      <div className="space-y-6">
        
        {/* Top Section (Stats) */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Aktif"        value={stats.aktif}       color="green"  />
            <StatCard label="Rosak"        value={stats.rosak}       color="red"    />
            <StatCard label="Dalam Servis" value={stats.dalamServis} color="blue"   />
            <StatCard label="Tidak Cukup"  value={stats.tidakCukup}  color="amber"  />
            <StatCard label="Dipinjam"     value={stats.dipinjam}    color="violet" />
            <StatCard label="Hilang"       value={stats.hilang}      color="rose"   />
          </div>

          {/* Quick actions */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-500">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Tindakan Pantas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickLink href="/items"           icon={<Package className="size-5" />}       title="Lihat inventori"  sub="Cari, tapis, dan urus barang" />
              {isAdmin && (
                <QuickLink href="/items/new"     icon={<Plus className="size-5" />}           title="Tambah barang"    sub="Daftar barang inventori baru" />
              )}
              <QuickLink href="/reports"         icon={<ClipboardList className="size-5" />} title="Laporan"          sub="Laporan dan muat turun CSV" />
              <QuickLink href="/admin/master-data" icon={<Settings className="size-5" />}    title="Data induk"       sub="Urus kategori dan unit" />
              {isAdmin && (
                <QuickLink href="/admin/users"   icon={<Users className="size-5" />}         title="Urus pengguna"    sub="Tambah atau urus akaun AJK" />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section (Activity) */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/60 p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-500">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-600"></span>
            </span>
            Aktiviti Terkini
          </h2>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Tiada aktiviti lagi.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.recentActivity.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 text-sm group p-4 rounded-2xl border border-slate-100 bg-white/50 hover:bg-white hover:border-primary-200 hover:shadow-sm transition-all">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 group-hover:text-primary-700 transition-colors">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <div className="text-slate-500 mt-0.5 text-xs">
                      oleh {log.actorName ?? '—'}
                    </div>
                  </div>
                  <time className="text-xs text-slate-400 shrink-0 pt-0.5 group-hover:text-slate-500 transition-colors">
                    {formatActivityTimeMY(log.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
          <Link href="/reports" className="inline-block mt-6 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline transition-colors">
            Lihat semua laporan &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

type Color = 'green' | 'red' | 'blue' | 'amber' | 'violet' | 'rose';

const colorMap: Record<Color, { card: string; value: string }> = {
  green:  { card: 'bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-200/60 hover:shadow-green-500/10 hover:border-green-300',   value: 'text-green-700'  },
  red:    { card: 'bg-gradient-to-br from-red-50 to-rose-100/50 border-red-200/60 hover:shadow-red-500/10 hover:border-red-300',       value: 'text-red-700'    },
  blue:   { card: 'bg-gradient-to-br from-blue-50 to-indigo-100/50 border-blue-200/60 hover:shadow-blue-500/10 hover:border-blue-300',     value: 'text-blue-700'   },
  amber:  { card: 'bg-gradient-to-br from-amber-50 to-yellow-100/50 border-amber-200/60 hover:shadow-amber-500/10 hover:border-amber-300',   value: 'text-amber-700'  },
  violet: { card: 'bg-gradient-to-br from-violet-50 to-purple-100/50 border-violet-200/60 hover:shadow-violet-500/10 hover:border-violet-300', value: 'text-violet-700' },
  rose:   { card: 'bg-gradient-to-br from-rose-50 to-pink-100/50 border-rose-200/60 hover:shadow-rose-500/10 hover:border-rose-300',     value: 'text-rose-700'   },
};

function StatCard({ label, value, color }: { label: string; value: number; color: Color }) {
  const c = colorMap[color];
  return (
    <div className={`group rounded-3xl border p-5 md:p-6 ${c.card} hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
      <p className="text-sm font-medium text-slate-500/80 group-hover:text-slate-600 transition-colors">{label}</p>
      <p className={`text-4xl font-extrabold mt-3 ${c.value} drop-shadow-sm`}>{value}</p>
    </div>
  );
}

function AlertBanner({
  icon, color, href, message,
}: {
  icon: React.ReactNode;
  color: 'amber' | 'orange' | 'blue';
  href: string;
  message: string;
}) {
  const cls = {
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
  }[color];
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${cls} hover:opacity-80 transition`}
    >
      {icon}
      <span>{message}</span>
      <span className="ml-auto text-xs opacity-70">Lihat →</span>
    </Link>
  );
}

function QuickLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 px-5 py-4 rounded-2xl border border-slate-200/60 bg-white/50 hover:bg-white hover:border-primary-300 hover:shadow-xl hover:shadow-primary-500/5 hover:-translate-y-1 transition-all duration-300"
    >
      <span className="mt-0.5 p-2.5 rounded-xl bg-primary-50 text-primary-600 group-hover:scale-110 group-hover:bg-primary-100 group-hover:-rotate-3 transition-all duration-300">{icon}</span>
      <div>
        <div className="font-semibold text-slate-800 text-sm group-hover:text-primary-700 transition-colors">{title}</div>
        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{sub}</div>
      </div>
    </Link>
  );
}
