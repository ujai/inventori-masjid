import { headers } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { and, eq, sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';

import { db } from '@/db/client';
import { attachments, institutionalRoles, itemRoles, items } from '@/db/schema';
import { auth } from '@/lib/auth';
import { presignGet } from '@/lib/r2';
import { ItemForm, type ItemFormValues, type ExistingPhoto } from '../../ItemForm';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  if (session.user.role !== 'admin') redirect('/items');

  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const [item, existingRoleRows] = await Promise.all([
    db.query.items.findFirst({ where: eq(items.id, id) }),
    db.select({ roleId: itemRoles.roleId }).from(itemRoles).where(eq(itemRoles.itemId, id)),
  ]);
  if (!item) notFound();

  // Fetch existing photos and generate presigned GET URLs (1h expiry)
  const photoRows = await db
    .select({ id: attachments.id, r2Key: attachments.r2Key, fileName: attachments.fileName })
    .from(attachments)
    .where(and(eq(attachments.itemId, id), sql`${attachments.kind} = 'photo'`))
    .orderBy(attachments.createdAt);

  const existingPhotos: ExistingPhoto[] = await Promise.all(
    photoRows.map(async (p) => ({
      id:       p.id,
      url:      await presignGet(p.r2Key),
      fileName: p.fileName,
      mimeType: 'image/jpeg', // exact mime not needed for display; we know it's a photo
    })),
  );

  const initial: ItemFormValues = {
    name:              item.name,
    categoryId:        String(item.categoryId),
    unitId:            String(item.unitId),
    quantity:          item.quantity,
    currentLocationId: String(item.currentLocationId),
    status:            item.status,
    notes:             item.notes ?? '',
    trackingMode:      item.trackingMode,
    assetCode:         item.assetCode ?? '',
    acquiredDate:      item.acquiredDate ?? '',
    price:             item.price ?? '',
    acquisitionMethod: item.acquisitionMethod ?? '',
    supplier:          item.supplier ?? '',
    receiptReference:  item.receiptReference ?? '',
    expiryDate:        item.expiryDate ?? '',
    condition:         item.condition ?? '',
    maintenanceNotes:  item.maintenanceNotes ?? '',
    warrantyExpiry:          item.warrantyExpiry ?? '',
    expectedLifespanYears:   item.expectedLifespanYears ?? '',
    maintenanceIntervalDays: item.maintenanceIntervalDays ?? '',
    minimumQuantity:         item.minimumQuantity ?? '',
    roleIds:                 existingRoleRows.map((r) => r.roleId),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <Link href={`/items/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ChevronLeft className="size-4" /> Kembali ke detail
      </Link>
      <h1 className="text-2xl font-bold text-primary-700">Edit Barang</h1>
      <ItemForm
        initial={initial}
        mode="edit"
        itemId={id}
        existingPhotos={existingPhotos}
        canDelete={session.user.role === 'admin'}
      />
    </div>
  );
}
