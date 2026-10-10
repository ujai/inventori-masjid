import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { ItemListClient } from './ItemListClient';

export default async function ItemsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return <ItemListClient canCreate={session.user.role === 'admin'} />;
}
