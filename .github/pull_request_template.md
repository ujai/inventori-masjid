## What and why

<!-- What does this change, and why is it needed? Link issues with "Closes #123". -->

## Checklist

- [ ] `bun run typecheck`, `bun run test:security` and `bun run build` pass
- [ ] Schema changes include a generated migration in `drizzle/` (`bun run db:generate`)
- [ ] New API routes have an auth guard (`requireSession` / `requireAdmin`)
- [ ] No real names, emails, URLs, or secrets from a deployment in code, docs or screenshots
- [ ] User guide (`docs/panduan/`) and screenshots updated if the UI changed
