/**
 * Email service backed by Resend.
 *
 * MVP scope: send transactional emails (invite, reminders).
 * Phase 6 will add scheduled reminders.
 */

import { Resend } from 'resend';
import { APP_NAME } from '@/lib/site';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const appUrl = process.env.APP_URL || 'http://localhost:3000';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function sendEmail(input: EmailInput): Promise<void> {
  if (!resend) {
    console.log('📧 [Resend not configured] Would send:', input);
    return;
  }
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  if (error) {
    console.error('Email send failed', error);
    throw new Error(`Gagal hantar emel: ${error.message}`);
  }
}

export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  role: 'admin' | 'ajk';
}): Promise<void> {
  const roleLabel = opts.role === 'admin' ? 'Admin' : 'AJK';
  const subject = `Anda telah dijemput ke ${APP_NAME}`;
  const signInUrl = `${appUrl}/sign-in`;

  const text = `Salam ${opts.name},

Anda telah didaftarkan ke dalam sistem ${APP_NAME} sebagai ${roleLabel}.

Untuk log masuk:
1. Buka ${signInUrl}
2. Klik butang "Log Masuk dengan Google"
3. Pilih akaun Google: ${opts.to}

Sila gunakan akaun Google yang sama dengan emel di atas.

Jika anda menerima emel ini secara tidak sengaja, sila abaikan.

Terima kasih,
Sistem ${APP_NAME}
`;

  const html = `
<!DOCTYPE html>
<html lang="ms">
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 16px">
  <h1 style="color:#0f766e;font-size:22px;margin:0 0 16px">Selamat datang ke ${escapeHtml(APP_NAME)}</h1>
  <p>Salam <strong>${escapeHtml(opts.name)}</strong>,</p>
  <p>Anda telah didaftarkan ke dalam sistem sebagai <strong>${roleLabel}</strong>.</p>

  <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin:24px 0">
    <p style="margin:0 0 12px"><strong>Cara log masuk:</strong></p>
    <ol style="margin:0;padding-left:20px">
      <li style="margin:6px 0">Klik butang di bawah</li>
      <li style="margin:6px 0">Pilih butang <strong>"Log Masuk dengan Google"</strong></li>
      <li style="margin:6px 0">Sahkan dengan akaun Google: <code>${escapeHtml(opts.to)}</code></li>
    </ol>
  </div>

  <p style="text-align:center;margin:24px 0">
    <a href="${signInUrl}"
       style="display:inline-block;background:#0f766e;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
      Log Masuk Sekarang
    </a>
  </p>

  <p style="color:#64748b;font-size:14px;margin-top:24px">
    <strong>Penting:</strong> Akaun Google anda mesti menggunakan emel di atas.
    Jika emel anda berbeza, sila hubungi admin masjid.
  </p>
  <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px">
    Sistem ${escapeHtml(APP_NAME)}
  </p>
</body>
</html>`;

  await sendEmail({ to: opts.to, subject, text, html });
}

// ─── Daily digest ────────────────────────────────────────────────────────────

type ServiceItem = {
  id: number;
  name: string;
  assetCode: string | null;
  nextServiceDate: string | null;
  locationName: string;
};

type OverdueBorrow = {
  id: number;
  itemName: string;
  assetCode: string | null;
  borrowerName: string | null;
  expectedReturnDate: string | null;
};

type LowStockItem = {
  id: number;
  name: string;
  assetCode: string | null;
  quantity: number;
  minimumQuantity: number;
  locationName: string;
};

export async function sendDailyDigest(opts: {
  to: string;
  name: string;
  dueService: ServiceItem[];
  overdueBorrows: OverdueBorrow[];
  lowStock?: LowStockItem[];
}): Promise<void> {
  const lowStock = opts.lowStock ?? [];
  if (opts.dueService.length === 0 && opts.overdueBorrows.length === 0 && lowStock.length === 0) return;

  const today = new Date().toLocaleDateString('ms-MY', { dateStyle: 'long' });
  const subject = `Peringatan Inventori — ${today}`;

  const serviceRows = opts.dueService.map((i) =>
    `  • ${i.name}${i.assetCode ? ` (${i.assetCode})` : ''} — servis: ${i.nextServiceDate ?? '—'} [${i.locationName}]`,
  ).join('\n');

  const borrowRows = opts.overdueBorrows.map((b) =>
    `  • ${b.itemName}${b.assetCode ? ` (${b.assetCode})` : ''} — peminjam: ${b.borrowerName ?? '—'} (jangka: ${b.expectedReturnDate ?? '—'})`,
  ).join('\n');

  const stockRows = lowStock.map((i) =>
    `  • ${i.name}${i.assetCode ? ` (${i.assetCode})` : ''} — ${i.quantity} unit (min: ${i.minimumQuantity}) [${i.locationName}]`,
  ).join('\n');

  const text = [
    `Salam ${opts.name},`,
    '',
    ...(opts.dueService.length > 0 ? [
      `🔧 BARANG PERLU SERVIS (dalam 7 hari):`,
      serviceRows,
    ] : []),
    ...(opts.overdueBorrows.length > 0 ? [
      '',
      `📦 PINJAMAN TERTUNGGAK:`,
      borrowRows,
    ] : []),
    ...(lowStock.length > 0 ? [
      '',
      `⚠️ STOK RENDAH:`,
      stockRows,
    ] : []),
    '',
    `Sila layari ${appUrl} untuk tindakan lanjut.`,
    '',
    `Sistem ${APP_NAME}`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="ms">
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0f172a;max-width:600px;margin:0 auto;padding:24px 16px">
  <h2 style="color:#0f766e;margin:0 0 4px">Peringatan ${escapeHtml(APP_NAME)}</h2>
  <p style="color:#64748b;font-size:13px;margin:0 0 20px">${today}</p>
  <p>Salam <strong>${escapeHtml(opts.name)}</strong>,</p>
  ${opts.dueService.length > 0 ? `
  <h3 style="color:#b45309;font-size:15px">🔧 Barang Perlu Servis (dalam 7 hari)</h3>
  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">
    <thead><tr style="background:#fef3c7">
      <th align="left">Barang</th><th align="left">Tarikh Servis</th><th align="left">Lokasi</th>
    </tr></thead>
    <tbody>
      ${opts.dueService.map((i, idx) => {
        const itemLink = i.id ? `${appUrl}/items/${i.id}` : null;
        const nameHtml = itemLink
          ? `<a href="${itemLink}" style="color:#0f766e;text-decoration:none;font-weight:500">${escapeHtml(i.name)}</a>`
          : escapeHtml(i.name);
        return `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'};border-top:1px solid #e2e8f0">
        <td>${nameHtml}${i.assetCode ? ` <code style="color:#64748b">(${escapeHtml(i.assetCode)})</code>` : ''}</td>
        <td><strong>${escapeHtml(i.nextServiceDate ?? '—')}</strong></td>
        <td>${escapeHtml(i.locationName)}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}
  ${opts.overdueBorrows.length > 0 ? `
  <h3 style="color:#b91c1c;font-size:15px;margin-top:24px">📦 Pinjaman Tertunggak</h3>
  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">
    <thead><tr style="background:#fee2e2">
      <th align="left">Barang</th><th align="left">Peminjam</th><th align="left">Jangka Pulang</th>
    </tr></thead>
    <tbody>
      ${opts.overdueBorrows.map((b, idx) => {
        const itemLink = b.id ? `${appUrl}/items/${b.id}` : null;
        const nameHtml = itemLink
          ? `<a href="${itemLink}" style="color:#0f766e;text-decoration:none;font-weight:500">${escapeHtml(b.itemName)}</a>`
          : escapeHtml(b.itemName);
        return `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'};border-top:1px solid #e2e8f0">
        <td>${nameHtml}${b.assetCode ? ` <code style="color:#64748b">(${escapeHtml(b.assetCode)})</code>` : ''}</td>
        <td>${escapeHtml(b.borrowerName ?? '—')}</td>
        <td style="color:#b91c1c"><strong>${escapeHtml(b.expectedReturnDate ?? '—')}</strong></td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}
  ${lowStock.length > 0 ? `
  <h3 style="color:#c2410c;font-size:15px;margin-top:24px">⚠️ Stok Rendah</h3>
  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">
    <thead><tr style="background:#ffedd5">
      <th align="left">Barang</th><th align="left">Kuantiti</th><th align="left">Minimum</th><th align="left">Lokasi</th>
    </tr></thead>
    <tbody>
      ${lowStock.map((i, idx) => {
        const itemLink = `${appUrl}/items/${i.id}`;
        const nameHtml = `<a href="${itemLink}" style="color:#0f766e;text-decoration:none;font-weight:500">${escapeHtml(i.name)}</a>`;
        return `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'};border-top:1px solid #e2e8f0">
        <td>${nameHtml}${i.assetCode ? ` <code style="color:#64748b">(${escapeHtml(i.assetCode)})</code>` : ''}</td>
        <td style="color:#c2410c"><strong>${i.quantity}</strong></td>
        <td>${i.minimumQuantity}</td>
        <td>${escapeHtml(i.locationName)}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>` : ''}
  <p style="margin-top:24px">
    <a href="${appUrl}" style="background:#0f766e;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Buka Sistem Inventori</a>
  </p>
  <p style="color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px">Sistem ${escapeHtml(APP_NAME)}</p>
</body></html>`;

  await sendEmail({ to: opts.to, subject, text, html });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
