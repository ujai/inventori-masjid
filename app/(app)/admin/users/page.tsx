import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UserList } from './UserList';
import { InviteForm } from './InviteForm';

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null; // layout handles redirect
  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-700">Urus Pengguna</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tambah AJK baru atau urus pengguna sedia ada.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Jemput pengguna baru</h2>
        <InviteForm />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="text-base font-semibold text-slate-800 px-6 pt-6 pb-3">Senarai pengguna</h2>
        <UserList currentUserId={session.user.id} />
      </div>
    </div>
  );
}
