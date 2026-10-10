import type { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api/guards';
import { ApiError, handleError } from '@/lib/api/responses';
import { formatDateMY } from '@/lib/format';
import {
  buildCsv,
  getReportByCategory,
  getReportByLocation,
  getReportDipinjam,
  getReportDueService,
  getReportExpiringSoon,
  getReportKehilangan,
  getReportPelupusan,
  REASON_LABELS,
} from '@/lib/reports';

type RouteContext = { params: Promise<{ slug: string }> };

function csvResponse(slug: string, csv: string) {
  const filename = `laporan-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(
    // BOM so Excel opens UTF-8 correctly
    '\uFEFF' + csv,
    {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    },
  );
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    await requireSession();
    const { slug } = await ctx.params;

    switch (slug) {
      case 'ikut-kategori': {
        const rows = await getReportByCategory();
        const csv  = buildCsv(
          ['Kategori', 'Prefix', 'Jumlah', 'Aktif', 'Rosak', 'Dalam Servis', 'Dipinjam'],
          rows.map((r) => [r.categoryName, r.prefix, r.total, r.aktif, r.rosak, r.dalamServis, r.dipinjam]),
        );
        return csvResponse(slug, csv);
      }

      case 'ikut-lokasi': {
        const rows = await getReportByLocation();
        const csv  = buildCsv(
          ['Lokasi', 'Jumlah', 'Aktif', 'Rosak', 'Dalam Servis', 'Dipinjam'],
          rows.map((r) => [r.locationName, r.total, r.aktif, r.rosak, r.dalamServis, r.dipinjam]),
        );
        return csvResponse(slug, csv);
      }

      case 'perlu-servis': {
        const rows = await getReportDueService();
        const csv  = buildCsv(
          ['Nama Barang', 'Kod Aset', 'Kategori', 'Lokasi', 'Tarikh Servis Seterusnya', 'Tarikh Servis Lepas', 'Status'],
          rows.map((r) => [r.name, r.assetCode, r.categoryName, r.locationName, r.nextServiceDate, r.lastServiceDate, r.status]),
        );
        return csvResponse(slug, csv);
      }

      case 'dipinjam': {
        const rows = await getReportDipinjam();
        const csv  = buildCsv(
          ['Nama Barang', 'Kod Aset', 'Peminjam', 'Jangka Pulang', 'Tarikh Pinjam', 'Lokasi', 'Dikendalikan Oleh'],
          rows.map((r) => [
            r.itemName, r.assetCode, r.borrowerName, r.expectedReturnDate,
            formatDateMY(r.movedAt), r.locationName, r.handlerName,
          ]),
        );
        return csvResponse(slug, csv);
      }

      case 'hampir-luput': {
        const rows = await getReportExpiringSoon();
        const csv  = buildCsv(
          ['Nama Barang', 'Kod Aset', 'Kategori', 'Lokasi', 'Tarikh Luput', 'Status'],
          rows.map((r) => [r.name, r.assetCode, r.categoryName, r.locationName, r.expiryDate, r.status]),
        );
        return csvResponse(slug, csv);
      }

      case 'pelupusan': {
        const rows = await getReportPelupusan();
        const csv  = buildCsv(
          ['Nama Barang', 'Kod Aset', 'Tarikh', 'Sebab', 'Kuantiti', 'Jumlah Jualan (RM)', 'Pembeli', 'Nota', 'Direkod Oleh'],
          rows.map((r) => [
            r.itemName, r.assetCode, r.disposalDate,
            REASON_LABELS[r.reason] ?? r.reason,
            r.quantityDisposed,
            r.saleAmount ? Number(r.saleAmount).toFixed(2) : '',
            r.buyer, r.notes, r.recorderName,
          ]),
        );
        return csvResponse(slug, csv);
      }

      case 'kehilangan-kecurian': {
        const rows = await getReportKehilangan();
        const csv  = buildCsv(
          ['Nama Barang', 'Kod Aset', 'Tarikh', 'Jenis', 'Kuantiti', 'No. Laporan Polis', 'Nota', 'Direkod Oleh'],
          rows.map((r) => [
            r.itemName, r.assetCode, r.disposalDate,
            REASON_LABELS[r.reason] ?? r.reason,
            r.quantityDisposed, r.policeReportReference, r.notes, r.recorderName,
          ]),
        );
        return csvResponse(slug, csv);
      }

      default:
        throw new ApiError(404, 'NOT_FOUND', 'Laporan tidak dijumpai');
    }
  } catch (err) {
    return handleError(err);
  }
}
