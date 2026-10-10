import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Edit } from 'lucide-react';
import { aliasedTable, and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { attachments, disposalLogs, institutionalRoles, itemRoles, items, locations, maintenanceLogs, movementLogs, user } from '@/db/schema';
import { formatDateTimeMY } from '@/lib/format';
import { parseDateLocal, computeHealthScore } from '@/lib/health';
import { auth } from '@/lib/auth';
import { StatusBadge } from '@/components/forms';
import { DeleteItemButton } from './DeleteItemButton';
import { MaintenanceForm } from './MaintenanceForm';
import { MovementForm } from './MovementForm';
import { DisposalForm, LossForm } from './DisposalForm';
import { RecoveryButton } from './RecoveryButton';
import { PoliceReportLink } from './PoliceReportLink';
import { QrLabelButton } from './QrLabel';
import { CollapsibleMaklumatTambahan, MovementLogList, ServiceLogList } from './ItemDetailClientSections';
import type { SerializedMovementLog, SerializedServiceLog } from './ItemDetailClientSections';

const STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  tidak_cukup: 'Tidak Cukup',
  rosak: 'Rosak',
  dalam_servis: 'Dalam Servis',
  dilupuskan: 'Dilupuskan',
  dipinjam: 'Dipinjam',
  hilang: 'Hilang',
};
const CONDITION_LABELS: Record<string, string> = {
  baik: 'Baik',
  sederhana: 'Sederhana',
  rosak: 'Rosak',
};
const ACQ_LABELS: Record<string, string> = {
  beli: 'Beli',
  sewa: 'Sewa',
  sumbangan: 'Sumbangan',
};
const DISPOSAL_REASON_LABELS: Record<string, string> = {
  rosak_total:       'Rosak Teruk / Tidak Boleh Dibaiki',
  dijual_besi_buruk: 'Dijual (Besi Buruk)',
  dijual_terpakai:   'Dijual (Terpakai)',
  sumbangan_keluar:  'Sumbangan Keluar',
  hilang:            'Hilang',
  dicuri:            'Dicuri',
  lain_lain:         'Lain-lain',
};


const fromLocations = aliasedTable(locations, 'from_locations');
const toLocations = aliasedTable(locations, 'to_locations');

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const isAdmin = session.user.role === 'admin';

  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const item = await db.query.items.findFirst({
    where: eq(items.id, id),
    with: { category: true, location: true, unit: true, responsible: true, creator: true },
  });
  if (!item) notFound();

  const itemRoleRows = await db
    .select({ nameMs: institutionalRoles.nameMs, code: institutionalRoles.code })
    .from(itemRoles)
    .innerJoin(institutionalRoles, eq(institutionalRoles.id, itemRoles.roleId))
    .where(eq(itemRoles.itemId, item.id));

  const maintenanceHistory = await db
    .select({
      id: maintenanceLogs.id,
      serviceDate: maintenanceLogs.serviceDate,
      nextServiceDate: maintenanceLogs.nextServiceDate,
      conditionBefore: maintenanceLogs.conditionBefore,
      conditionAfter: maintenanceLogs.conditionAfter,
      cost: maintenanceLogs.cost,
      notes: maintenanceLogs.notes,
      createdAt: maintenanceLogs.createdAt,
      performerName: user.name,
    })
    .from(maintenanceLogs)
    .leftJoin(user, eq(user.id, maintenanceLogs.performedBy))
    .where(eq(maintenanceLogs.itemId, item.id))
    .orderBy(desc(maintenanceLogs.serviceDate), desc(maintenanceLogs.createdAt));

  const movementHistory = await db
    .select({
      id: movementLogs.id,
      quantityMoved: movementLogs.quantityMoved,
      purpose: movementLogs.purpose,
      borrowerName: movementLogs.borrowerName,
      expectedReturnDate: movementLogs.expectedReturnDate,
      returnedDate: movementLogs.returnedDate,
      returnCondition: movementLogs.returnCondition,
      notes: movementLogs.notes,
      createdAt: movementLogs.createdAt,
      fromLocationName: fromLocations.nameMs,
      toLocationName: toLocations.nameMs,
      handlerName: user.name,
    })
    .from(movementLogs)
    .leftJoin(fromLocations, eq(fromLocations.id, movementLogs.fromLocationId))
    .leftJoin(toLocations, eq(toLocations.id, movementLogs.toLocationId))
    .leftJoin(user, eq(user.id, movementLogs.handledBy))
    .where(eq(movementLogs.itemId, item.id))
    .orderBy(desc(movementLogs.createdAt));

  // Fetch photos and generate presigned GET URLs server-side (valid 1 hour)
  const photoAttachments = await db
    .select({ id: attachments.id, r2Key: attachments.r2Key, fileName: attachments.fileName })
    .from(attachments)
    .where(and(eq(attachments.itemId, item.id), sql`${attachments.kind} = 'photo'`))
    .orderBy(attachments.createdAt);

  const { presignGet } = await import('@/lib/r2');
  const photos = await Promise.all(
    photoAttachments.map(async (a) => ({
      id:       a.id,
      url:      await presignGet(a.r2Key),
      fileName: a.fileName,
    })),
  );

  // Police report attachments — queried by item, shown in disposal section
  const policeReportAttachments = await db
    .select({ id: attachments.id, fileName: attachments.fileName })
    .from(attachments)
    .where(and(eq(attachments.itemId, item.id), sql`${attachments.kind} = 'police_report'`))
    .orderBy(attachments.createdAt);

  const disposalHistory = await db
    .select({
      id: disposalLogs.id,
      disposalDate: disposalLogs.disposalDate,
      reason: disposalLogs.reason,
      quantityDisposed: disposalLogs.quantityDisposed,
      policeReportReference: disposalLogs.policeReportReference,
      saleAmount: disposalLogs.saleAmount,
      buyer: disposalLogs.buyer,
      notes: disposalLogs.notes,
      createdAt: disposalLogs.createdAt,
      recorderName: user.name,
    })
    .from(disposalLogs)
    .leftJoin(user, eq(user.id, disposalLogs.recordedBy))
    .where(eq(disposalLogs.itemId, item.id))
    .orderBy(desc(disposalLogs.createdAt));

  const health = computeHealthScore(item);
  // Serialize Date fields for RSC → client component boundary
  const serializedMaintenance: SerializedServiceLog[] = maintenanceHistory.map(({ createdAt: _c, ...rest }) => rest);
  const serializedMovement: SerializedMovementLog[] = movementHistory.map((log) => ({
    ...log,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt ?? ''),
  }));

  // "Servis terakhir" summary — computed from the most recent log
  const lastService = maintenanceHistory[0] ?? null;
  const lastServiceDaysAgo = (() => {
    if (!lastService) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - parseDateLocal(lastService.serviceDate).getTime()) / 86400000);
  })();

  // Count populated fields in Maklumat tambahan for the collapsible hint
  const maklumatTambahanFieldCount = [
    item.acquiredDate, item.price, item.acquisitionMethod, item.supplier,
    item.receiptReference, item.expiryDate, item.maintenanceNotes, item.warrantyExpiry,
    item.expectedLifespanYears != null ? 1 : null,
    item.maintenanceIntervalDays != null ? 1 : null,
    item.minimumQuantity != null ? 1 : null,
  ].filter(Boolean).length;

  const healthColorMap = {
    green: 'bg-green-100 text-green-800 border-green-200',
    amber: 'bg-amber-100 text-amber-800 border-amber-200',
    red:   'bg-red-100 text-red-800 border-red-200',
  };
  const serviceHealthToday = (() => {
    if (!item.nextServiceDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const svc = parseDateLocal(item.nextServiceDate);
    const diff = Math.ceil((svc.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return 'overdue';
    if (diff <= 30) return 'due_soon';
    return null;
  })();
  const lowStock = item.minimumQuantity != null && item.quantity <= item.minimumQuantity;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">
      <Link href="/items" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ChevronLeft className="size-4" /> Kembali ke senarai
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Primary photo — shown above title if available */}
        {photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0].url}
            alt={item.name}
            className="w-full max-h-56 object-cover"
          />
        )}
        <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{item.name}</h1>
            <div className="text-sm text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
              {item.assetCode && <span className="font-mono">{item.assetCode}</span>}
              {item.assetCode && <span className="text-slate-300">·</span>}
              <span>{item.category.nameMs}</span>
              <span className="text-slate-300">·</span>
              <span>{item.location.nameMs}</span>
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>

        {/* Health alerts */}
        {(serviceHealthToday || lowStock) && (
          <div className="mt-4 flex flex-col gap-2">
            {serviceHealthToday === 'overdue' && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2.5">
                ⚠️ Servis tertunggak — {item.nextServiceDate}. Sila jadualkan penyelenggaraan.
              </div>
            )}
            {serviceHealthToday === 'due_soon' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2.5">
                🔧 Perlu servis dalam 30 hari akan datang — {item.nextServiceDate}.
              </div>
            )}
            {lowStock && (
              <div className="rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm px-3 py-2.5">
                📦 Stok rendah — {item.quantity} unit (minimum: {item.minimumQuantity}).
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4 flex-wrap">
          {isAdmin && (
            <Link
              href={`/items/${item.id}/edit`}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              <Edit className="size-4" /> Edit
            </Link>
          )}
          <QrLabelButton itemId={item.id} itemName={item.name} assetCode={item.assetCode} />
          {isAdmin && item.status === 'hilang' && <RecoveryButton itemId={item.id} />}
          {isAdmin && item.status !== 'hilang' && <DeleteItemButton itemId={item.id} />}
        </div>
        </div>{/* end inner padding div */}
      </div>

      <Section title="Maklumat asas">
        <Row label="Kuantiti" value={`${item.quantity} ${item.unit.nameMs}`} />
        <Row label="Mod" value={item.trackingMode === 'asset' ? 'Aset Individu' : 'Kuantiti'} />
        {item.assetCode && <Row label="Kod aset" value={<span className="font-mono">{item.assetCode}</span>} />}
        <Row label="Status" value={STATUS_LABELS[item.status] ?? item.status} />
        {item.condition && <Row label="Keadaan" value={CONDITION_LABELS[item.condition] ?? item.condition} />}
        {health.score < 100 && <Row label="Skor kesihatan" value={
          <div className="flex items-center gap-2">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden" style={{ minWidth: 60, width: 80 }}>
              <div
                className={`h-2 rounded-full ${health.color === 'green' ? 'bg-green-500' : health.color === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(2, health.score)}%` }}
              />
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${healthColorMap[health.color]}`}>
              {health.score}/100 — {health.label}
            </span>
          </div>
        } />}
        {item.notes && <Row label="Nota" value={<span className="whitespace-pre-wrap">{item.notes}</span>} />}
        {itemRoleRows.length > 0 && (
          <Row label="Peranan" value={
            <div className="flex flex-wrap gap-1">
              {itemRoleRows.map((r) => (
                <span key={r.code} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                  {r.nameMs}
                </span>
              ))}
            </div>
          } />
        )}
      </Section>

      <CollapsibleMaklumatTambahan fieldCount={maklumatTambahanFieldCount}>
        {item.acquiredDate ? <Row label="Tarikh perolehan" value={item.acquiredDate} /> : null}
        {item.price ? <Row label="Harga" value={`RM ${Number(item.price).toFixed(2)}`} /> : null}
        {item.acquisitionMethod ? <Row label="Kaedah perolehan" value={ACQ_LABELS[item.acquisitionMethod] ?? item.acquisitionMethod} /> : null}
        {item.supplier ? <Row label="Pembekal" value={item.supplier} /> : null}
        {item.receiptReference ? <Row label="No. resit" value={item.receiptReference} /> : null}
        {item.expiryDate ? <Row label="Tarikh luput" value={item.expiryDate} /> : null}
        {item.maintenanceNotes ? <Row label="Nota penyelenggaraan" value={<span className="whitespace-pre-wrap">{item.maintenanceNotes}</span>} /> : null}
        {item.warrantyExpiry ? <Row label="Jaminan luput" value={(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const exp = parseDateLocal(item.warrantyExpiry);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
          const badge = diffDays < 0
            ? <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">Waranti luput</span>
            : diffDays <= 30
              ? <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">Waranti hampir luput</span>
              : null;
          return <span>{item.warrantyExpiry}{badge}</span>;
        })()} /> : null}
        {item.expectedLifespanYears ? <Row label="Jangkaan hayat" value={`${item.expectedLifespanYears} tahun`} /> : null}
        {item.maintenanceIntervalDays ? <Row label="Selang servis" value={`${item.maintenanceIntervalDays} hari`} /> : null}
        {item.minimumQuantity != null ? <Row label="Kuantiti minimum" value={String(item.minimumQuantity)} /> : null}
        {!item.acquiredDate && !item.price && !item.acquisitionMethod && !item.supplier && !item.receiptReference && !item.expiryDate && !item.maintenanceNotes && !item.warrantyExpiry && !item.expectedLifespanYears && !item.maintenanceIntervalDays && item.minimumQuantity == null && (
          <p className="text-sm text-slate-500 italic">Tiada maklumat tambahan.</p>
        )}
      </CollapsibleMaklumatTambahan>

      <Section title="Rekod">
        <Row label="Dicipta oleh" value={item.creator?.name ?? '—'} />
        <Row label="Pegawai bertanggungjawab" value={item.responsible?.name ?? '—'} />
        <Row label="Tarikh dicipta" value={formatDateTimeMY(item.createdAt)} />
        <Row label="Tarikh dikemaskini" value={formatDateTimeMY(item.updatedAt)} />
      </Section>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800">
            Log servis
            {maintenanceHistory.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">({maintenanceHistory.length} rekod)</span>
            )}
          </h2>
          {item.status !== 'dilupuskan' && item.status !== 'hilang' && (
            <MaintenanceForm itemId={item.id} currentCondition={item.condition} currentStatus={item.status} />
          )}
        </div>

        {lastService && lastServiceDaysAgo !== null && (
          <p className="text-xs text-slate-500">
            Servis terakhir:{' '}
            <span className="font-medium text-slate-700">
              {lastServiceDaysAgo === 0 ? 'hari ini' : `${lastServiceDaysAgo} hari lalu`}
            </span>
            {' · '}oleh {lastService.performerName ?? '—'} · {lastService.serviceDate}
          </p>
        )}

        {maintenanceHistory.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Belum ada log servis.</p>
        ) : (
          <ServiceLogList logs={serializedMaintenance} limit={3} />
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800">
            Log pergerakan
            {movementHistory.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">({movementHistory.length} rekod)</span>
            )}
          </h2>
          {item.status !== 'dilupuskan' && item.status !== 'hilang' && (
            <MovementForm
              itemId={item.id}
              currentLocationId={item.currentLocationId}
              quantity={item.quantity}
              disabled={item.status === 'dipinjam'}
            />
          )}
        </div>

        {item.status === 'dipinjam' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3">
            Barang ini sedang dipinjam. Rekod pulangan dahulu sebelum tambah pergerakan baru.
          </div>
        )}

        {movementHistory.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Belum ada log pergerakan.</p>
        ) : (
          <MovementLogList
            logs={serializedMovement}
            itemId={item.id}
            unitNameMs={item.unit.nameMs}
            limit={5}
          />
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-800">Log pelupusan &amp; kehilangan</h2>
          {isAdmin && item.status !== 'dilupuskan' && item.status !== 'hilang' && (
            <div className="flex gap-2 flex-wrap">
              <LossForm itemId={item.id} quantity={item.quantity} />
              <DisposalForm itemId={item.id} quantity={item.quantity} />
            </div>
          )}
        </div>

        {disposalHistory.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Tiada rekod pelupusan.</p>
        ) : (
          <ul className="space-y-3">
            {disposalHistory.map((log) => (
              <li key={log.id} className="border border-red-100 rounded-xl p-4 bg-red-50">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-red-800">{DISPOSAL_REASON_LABELS[log.reason] ?? log.reason}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {log.disposalDate} · Oleh {log.recorderName ?? '—'}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{log.quantityDisposed} unit</span>
                </div>
                <div className="mt-2 text-sm text-slate-700 space-y-1">
                  {log.policeReportReference && <p>No. laporan polis: {log.policeReportReference}</p>}
                  {policeReportAttachments.map((a) => (
                    <PoliceReportLink key={a.id} attachmentId={a.id} label={a.fileName ?? 'Laporan polis'} />
                  ))}
                  {log.saleAmount && <p>Jualan: RM {Number(log.saleAmount).toFixed(2)}{log.buyer ? ` kepada ${log.buyer}` : ''}</p>}
                  {log.notes && <p className="whitespace-pre-wrap">{log.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Client component to fetch and open presigned URL for a police report attachment
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-3">{title}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:contents">
      <dt className="text-slate-500 sm:font-normal">{label}</dt>
      <dd className="col-span-2 sm:col-auto text-slate-900">{value}</dd>
    </div>
  );
}
