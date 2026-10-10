import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { Header } from '@/components/Header';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
