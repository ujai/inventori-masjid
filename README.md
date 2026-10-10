# Inventori Masjid

Open-source inventory management for mosques, built for non-technical committee members (AJK).
Sistem pengurusan inventori sumber terbuka untuk masjid, direka untuk AJK yang bukan orang teknikal.

[English](#english) · [Bahasa Melayu](#bahasa-melayu)

---

## English

### Features

- Two tracking modes: individual **assets** (with asset codes) and **quantity** items (consumables)
- Status tracking: Aktif, Rosak, Dalam Servis, Dipinjam, Hilang, Dilupuskan
- Borrow/return log with return condition, maintenance log, disposal and police-report records
- Health score, service-due and low-stock indicators
- Reports by category, location, service due, on loan, disposals, losses, plus a committee handover report (print/PDF)
- Printable QR labels for each item
- Photo uploads (Cloudflare R2, presigned URLs)
- Daily digest by email (Resend) and Telegram
- Activity log, two roles (Admin and AJK), Google sign-in, invite-only accounts
- Step-by-step user guide in Malay: [`docs/panduan/`](./docs/panduan/README.md)

The UI is in Bahasa Melayu.

### Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Neon PostgreSQL · Drizzle ORM · Better Auth (Google OAuth) · Cloudflare R2 · Resend · Playwright · Bun

### Requirements

- [Bun](https://bun.sh)
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- Google OAuth credentials (the only sign-in method)
- Optional: Cloudflare R2 (photos), Resend (email), a Telegram bot (notifications)

[`docs/01-account-setup-guide.md`](./docs/01-account-setup-guide.md) walks through creating each account.

### Quick start

```bash
bun install
cp .env.example .env.local        # fill in values, including NEXT_PUBLIC_ORG_NAME
bun run db:migrate                # create tables
bun run db:seed                   # categories, units, locations
bun run db:create-admin you@gmail.com "Your Name"
bun run dev                       # http://localhost:3000
```

Optionally load demo data with `bun run db:seed:samples`.

No Neon account? Run `docker compose up -d`, set `DATABASE_URL="postgres://postgres:postgres@db.localtest.me:5432/main"`, and use `bun run db:migrate:local` instead of `db:migrate`. See [CONTRIBUTING.md](./CONTRIBUTING.md).

Sign in with the Google account you registered as admin, then invite other users from the **Pengguna** page.

### Customising for your mosque

- **Name:** set `NEXT_PUBLIC_ORG_NAME` (and optionally `NEXT_PUBLIC_APP_NAME`) in `.env.local`.
- **Logo:** replace `public/logo.png` (PNG, roughly 200×220). It is used in the header, sign-in page and PDF report.
- **Categories, units, locations:** edit `db/seed.ts` before seeding. Locations are read-only in the app and managed in the database.

### Deployment

The app is designed for Vercel. The daily notification cron is defined in `vercel.json`. See [`docs/03-deployment-guide.md`](./docs/03-deployment-guide.md).

### Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Dev server (Turbopack) |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript check |
| `bun run db:generate` | Generate migrations after editing `db/schema.ts` |
| `bun run db:migrate` | Apply migrations |
| `bun run db:migrate:local` | Apply migrations to the local Docker database |
| `bun run db:seed` | Seed lookup tables |
| `bun run db:seed:samples` | Seed demo data |
| `bun run db:create-admin` | Create or promote an admin user |
| `bun run test:security` | Static security checks |
| `bun run test:auth:local` | Demo admin/AJK sessions for a local database (no Google) |
| `bun run test:uat` | Playwright UAT suite (see [`tests/README.md`](./tests/README.md)) |
| `bun run screenshot:guides` | Regenerate user-guide screenshots |

UAT tests run against `UAT_BASE_URL` (default `http://localhost:3000`) and create and delete real data. Point them at a test database, never at production.

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). To report a security issue, see [SECURITY.md](./SECURITY.md).

### License

[MIT](./LICENSE)

---

## Bahasa Melayu

### Ciri utama

- Dua mod: **aset** individu (dengan kod aset) dan barang **kuantiti** (barang guna habis)
- Status: Aktif, Rosak, Dalam Servis, Dipinjam, Hilang, Dilupuskan
- Log pinjam/pulang (dengan keadaan semasa pulang), log servis, pelupusan dan laporan polis
- Skor kesihatan barang, petunjuk perlu servis dan stok rendah
- Laporan ikut kategori, lokasi, perlu servis, dipinjam, pelupusan, kehilangan, serta Laporan Serah Terima AJK (cetak/PDF)
- Label kod QR untuk setiap barang
- Muat naik foto (Cloudflare R2)
- Peringatan harian melalui emel dan Telegram
- Log aktiviti, dua peranan (Admin dan AJK), log masuk Google, akaun melalui jemputan sahaja
- Panduan pengguna langkah demi langkah: [`docs/panduan/`](./docs/panduan/README.md)

### Keperluan

- [Bun](https://bun.sh)
- Pangkalan data [Neon](https://neon.tech) PostgreSQL (pelan percuma memadai)
- Kelayakan Google OAuth
- Pilihan: Cloudflare R2 (foto), Resend (emel), bot Telegram (notifikasi)

Ikut [`docs/01-account-setup-guide.md`](./docs/01-account-setup-guide.md) untuk buka setiap akaun.

### Mula pantas

```bash
bun install
cp .env.example .env.local        # isi nilai, termasuk NEXT_PUBLIC_ORG_NAME
bun run db:migrate                # cipta jadual
bun run db:seed                   # kategori, unit, lokasi
bun run db:create-admin anda@gmail.com "Nama Anda"
bun run dev                       # http://localhost:3000
```

Data contoh boleh dimasukkan dengan `bun run db:seed:samples`.

Log masuk dengan akaun Google yang didaftarkan sebagai admin, kemudian jemput pengguna lain melalui halaman **Pengguna**.

### Sesuaikan untuk masjid anda

- **Nama:** tetapkan `NEXT_PUBLIC_ORG_NAME` (dan `NEXT_PUBLIC_APP_NAME` jika perlu) dalam `.env.local`.
- **Logo:** ganti `public/logo.png` (PNG, lebih kurang 200×220).
- **Kategori, unit, lokasi:** ubah `db/seed.ts` sebelum seed. Lokasi tidak boleh diubah dalam aplikasi; uruskan terus dalam pangkalan data.

### Penggunaan (deploy)

Direka untuk Vercel. Lihat [`docs/03-deployment-guide.md`](./docs/03-deployment-guide.md).

### Sumbangan dan lesen

Lihat [CONTRIBUTING.md](./CONTRIBUTING.md) dan [SECURITY.md](./SECURITY.md). Lesen [MIT](./LICENSE).
