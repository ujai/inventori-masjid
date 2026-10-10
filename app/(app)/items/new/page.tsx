import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { ItemForm, emptyValues } from '../ItemForm';

export default async function NewItemPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (session.user.role !== 'admin') redirect('/items');

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <Link href="/items" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ChevronLeft className="size-4" /> Kembali ke senarai
      </Link>
      <h1 className="text-2xl font-bold text-primary-700">Tambah Barang Baru</h1>
      <ItemForm initial={emptyValues} mode="create" />
    </div>
  );
}
