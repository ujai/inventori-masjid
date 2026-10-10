'use client';

import QRCode from 'react-qr-code';
import { Printer } from 'lucide-react';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function QrLabelButton({
  itemId,
  itemName,
  assetCode,
}: {
  itemId: number;
  itemName: string;
  assetCode: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const itemUrl = `${appUrl}/items/${itemId}`;

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (!printWindow) return;

    const svgEl = document.getElementById(`qr-svg-${itemId}`);
    const svgHtml = svgEl?.outerHTML ?? '';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="ms">
<head>
  <meta charset="UTF-8" />
  <title>Label QR — ${escHtml(itemName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #fff; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .qr-wrap { border: 2px solid #000; padding: 12px; border-radius: 8px; }
    .item-name { font-size: 18px; font-weight: 700; text-align: center; max-width: 200px; word-break: break-word; }
    .asset-code { font-size: 13px; font-family: monospace; color: #555; text-align: center; }
    .url { font-size: 9px; color: #888; text-align: center; max-width: 200px; word-break: break-all; margin-top: 4px; }
    @media print { body { padding: 8px; } }
  </style>
</head>
<body>
  <div class="qr-wrap">${svgHtml}</div>
  <div class="item-name">${escHtml(itemName)}</div>
  ${assetCode ? `<div class="asset-code">${escHtml(assetCode)}</div>` : ''}
  <div class="url">${escHtml(itemUrl)}</div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <>
      {/* Hidden QR element used to extract SVG for print */}
      <div className="hidden" aria-hidden="true">
        <QRCode id={`qr-svg-${itemId}`} value={itemUrl} size={160} />
      </div>
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700"
      >
        <Printer className="size-4" /> Cetak Label QR
      </button>
    </>
  );
}
