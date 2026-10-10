# Contributing

Thanks for helping improve Inventori Masjid. Issues and pull requests are welcome in English or Bahasa Melayu.

## Development setup

Follow the Quick start in the [README](./README.md). Use your own Neon database (a Neon branch works well), never a production one.

## Before opening a pull request

```bash
bun run typecheck
bun run test:security
bun run build
```

If you changed UI covered by the user guide, run `bun run screenshot:guides` against a database seeded with `bun run db:seed:samples`.

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
