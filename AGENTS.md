# inventori-masjid-oss

Open-source inventory system for mosques. Public-facing fork (sister project to the closed-beta `Inventory-Masjid`). Bahasa Melayu UI, AJK-friendly flows.

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**.
- **Tailwind CSS v4** (via `@tailwindcss/postcss`).
- **Neon PostgreSQL** + **Drizzle ORM** (`drizzle-kit`).
- **Better Auth** (Google OAuth only).
- **Cloudflare R2** (photo uploads via presigned URLs).
- **Resend** (email digests) + **Telegram bot** (notifications).
- **Playwright** for UAT, **`bun test`** for static security checks.
- **Bun** runtime (uses `bun.lock`).

## Commands
```bash
bun install
bun run dev                       # next dev (--turbopack)
bun run build
bun run start
bun run lint                      # tsc --noEmit
bun run typecheck                 # tsc --noEmit
bun run test:security             # bun test tests/security
bun run test:uat                  # Playwright admin + no-auth + mobile
bun run test:uat:all              # all Playwright projects
bun run test:uat:admin            # Playwright admin profile
bun run test:uat:ajk              # Playwright AJK profile
bun run test:uat:mobile           # Playwright mobile profile
bun run test:auth:local           # demo admin/AJK sessions (local DB only, no Google)
bun run db:generate               # drizzle-kit generate
bun run db:migrate                # drizzle-kit migrate
bun run db:migrate:local          # migrations for the local Docker DB
bun run db:push                   # drizzle-kit push (NEVER in prod)
bun run db:studio                 # drizzle-kit studio
bun run db:seed                   # categories, units, locations
bun run db:seed:samples           # demo items
bun run db:create-admin           # <email> "<name>" — first admin
bun run screenshot:guides         # bun run tests/screenshots.ts
```

## Repo map
- `app/(app)/` — signed-in pages (dashboard, items, reports, activity, admin, me).
- `app/(auth)/` — sign-in page.
- `app/api/` — route handlers.
- `lib/` — auth, API guards, Zod validators, notifications, branding (`lib/site.ts`).
- `db/` — Drizzle schema, seed and admin scripts; migrations live in `drizzle/`.
- `docs/panduan/` — Bahasa Melayu user guide (kept with the public repo).
- `tests/` — UAT specs, security tests, screenshot generator.
- `playwright.config.ts` — projects: setup:admin / setup:ajk / admin / ajk / no-auth / mobile.
- `docker-compose.yml` — local Postgres + Neon HTTP proxy (no Neon account needed).

## Env (see `.env.example`)
Required:
- `DATABASE_URL` — Neon connection string, or the local Docker URL.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — session signing + auth base URL.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth (only sign-in method).
- `APP_URL`, `NEXT_PUBLIC_APP_URL` — public URL (links in emails/Telegram, QR labels).
- `NEXT_PUBLIC_ORG_NAME` — mosque name shown across the app.

Optional (features degrade gracefully when unset):
- `R2_*` — Cloudflare R2 keys + bucket (photo uploads).
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — email.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` — Telegram.

## Safety
- Two roles only: **Admin** and **AJK**. AJK is invite-only and limited to committee workflows. Every API route must call `requireSession()` or `requireAdmin()` (`lib/api/guards.ts`); admin-only actions use `requireAdmin()`.
- Schema changes: edit `db/schema.ts`, run `bun run db:generate`, commit the migration. Never hand-write migration SQL.
- Locations are read-only via the API; manage them in the database.
- No organisation-specific names, URLs, emails or secrets in code; use env vars.
- Photos go to R2 via presigned URLs — never proxy them through the app.
- No destructive DB commands without an explicit backup step. Use `bun run db:migrate`, **never** `db:push` in production.

## Verification
1. `bun run typecheck`
2. `bun run test:security`
3. `bun run build`
4. `bun run test:uat:admin` (smoke) then full `bun run test:uat`. UAT creates and deletes data at `UAT_BASE_URL`, so run it against a local or test database, never production.
