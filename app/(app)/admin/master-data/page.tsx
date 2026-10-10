import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { MasterDataClient } from './MasterDataClient';

export default async function MasterDataPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Allow both admin & ajk per client decision (D3-D5 expansion)
  return <MasterDataClient />;
}
