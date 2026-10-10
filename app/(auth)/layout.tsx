import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // If user is already signed in, redirect to home
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/');

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {children}
    </div>
  );
}
