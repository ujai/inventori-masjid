# 02 — Local Development Setup

> Prerequisites: complete `01-account-setup-guide.md` first.

## Required tools on your machine

| Tool | Min version | Check command | Install |
|---|---|---|---|
| Bun | 1.3+ | `bun --version` | `curl -fsSL https://bun.sh/install \| bash` |
| Git | any recent | `git --version` | OS package manager |
| (Optional) Node.js | 22+ | `node --version` | only needed if you prefer npm/pnpm |

This project uses **Bun** by default for speed. If you prefer pnpm or npm, replace `bun` with your tool — all scripts also work with `npm run` or `pnpm`.

---

## First-time setup

```bash
# 1. Navigate to the project
cd inventori-masjid

# 2. Install dependencies
bun install

# 3. Copy env template and fill in values from password manager
cp .env.example .env.local
# Edit .env.local with real values

# 4. Generate first migration
bun db:generate

# 5. Apply migration to Neon
bun db:migrate

# 6. Seed lookup tables
bun db:seed

# 7. Start dev server
bun dev
```

Open **http://localhost:3000**.

---

## Daily workflow

```bash
git pull
bun install               # only if package.json changed
bun dev
```

When you change `db/schema.ts`:

```bash
bun db:generate           # creates a new migration file
bun db:migrate            # applies to Neon
git add db/ drizzle/
git commit -m "feat(db): describe the change"
```

When you want to inspect the database visually:

```bash
bun db:studio
```

Drizzle Studio opens at https://local.drizzle.studio.

---

## Branching strategy (suggested)

```
main           — production (auto-deploys to Vercel production)
└── feature/*  — branches per feature, opened as PR
```

Keep PRs small. Merge to `main` after demo approval.

---

## Common tasks

### Reset local + remote DB (DEV ONLY — destroys data)

```bash
# Drop all tables on Neon (use SQL editor):
# DROP SCHEMA public CASCADE; CREATE SCHEMA public;

# Then re-run:
bun db:migrate
bun db:seed
```

### Try a new schema change without committing yet

```bash
# Edit db/schema.ts
bun db:push    # applies schema directly without creating migration file
```

> Use `db:push` only in development. Use `db:generate + db:migrate` for anything you want to commit.

### Inspect a single Neon connection

```bash
bunx drizzle-kit introspect --dialect postgresql --url "$DATABASE_URL"
```

---

## Project conventions

- **TypeScript strict mode** — no `any`, no implicit nulls
- **Server actions / route handlers** validate input with **Zod**
- **Drizzle queries** preferred over raw SQL except for migrations
- **All UI labels in Bahasa Melayu**; internal code names in English
- **Activity log** every mutation (Phase 3 onward)

---

## VS Code recommended extensions

```
ms-azuretools.vscode-docker         (later, for local services)
bradlc.vscode-tailwindcss
esbenp.prettier-vscode
dbaeumer.vscode-eslint
mtxr.sqltools
mtxr.sqltools-driver-pg
```

---

## Editor-side env loading

Bun automatically loads `.env.local` for `bun run` scripts. For your editor terminal you may need to source explicitly:

```bash
export $(grep -v '^#' .env.local | xargs)
```

Or use `direnv` if you have it set up.
