# Contributing

Thanks for helping improve Inventori Masjid. Issues and pull requests are welcome in English or Bahasa Melayu.

## Development setup

Follow the Quick start in the [README](./README.md). Never point a development setup at a production database.

The easiest option is the local Docker database (no Neon account needed):

```bash
docker compose up -d
# in .env.local:
# DATABASE_URL="postgres://postgres:postgres@db.localtest.me:5432/main"
bun run db:migrate:local
bun run db:seed && bun run db:seed:samples
bun run test:auth:local   # demo admin/AJK sessions in playwright/.auth/ (no Google needed)
```

`test:auth:local` refuses to run unless `DATABASE_URL` points at a local database.

## Before opening a pull request

```bash
bun run typecheck
bun run test:security
bun run build
```

## Screenshots

If you changed UI covered by the user guide (`docs/panduan/`), regenerate its screenshots from the local Docker database with sample data:

```bash
bun run build && bunx next start -p 3100   # production build hides the dev overlay
UAT_BASE_URL=http://localhost:3100 bun run screenshot:guides
```

Set `BETTER_AUTH_URL` and `UAT_BASE_URL` in `.env.local` to `http://localhost:3100` before running `test:auth:local`, and check every image for real names or data before committing.

## Conventions

- **Schema changes:** edit `db/schema.ts`, then run `bun run db:generate` and commit the generated migration in `drizzle/`. Never hand-write migration SQL. Keep new columns nullable unless there is a clear default.
- **Enums use Malay values** (e.g. `aktif`, `rosak`, `dipinjam`). UI text is in Bahasa Melayu.
- **Every API route needs an auth guard** (`requireSession` or `requireAdmin` from `lib/api/guards.ts`).
- **Validate input with Zod** schemas in `lib/validators/`.
- **Locations are read-only via the API.** They are managed in the database.
- **No organisation-specific values in code.** Use environment variables (see `lib/site.ts` and `.env.example`).
- Use `bun` / `bunx`, not npm/npx.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`, `test:`.
