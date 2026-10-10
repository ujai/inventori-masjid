# UAT Test Suite — <APP_NAME>

Automated Playwright tests covering all 10 sections of `docs/04-uat-checklist.md`.

---

## Quick Start

### 1. One-time setup — save login sessions (2 minutes)

Google OAuth cannot be automated (Google blocks headless bots), so you log in
manually once. The session is saved and reused for all future test runs
(valid for 7 days).

**Step 1 — Save admin session**
```bash
bun run test:uat:setup:admin
```
A headed Chrome window opens. Log in with the **admin** Gmail account.
The script saves the session automatically when the dashboard loads.

**Step 2 — Save AJK session**
```bash
bun run test:uat:setup:ajk
```
Same process with the **AJK** Gmail account.

Sessions are stored in `playwright/.auth/` (gitignored).

---

### 2. Set up environment variables

```bash
cp .env.test.example .env.test
# Edit .env.test and add your RESEND_API_KEY
```

---

### 3. Run the tests

```bash
# Full UAT run (admin + no-auth + mobile projects)
bun run test:uat

# Run a specific section
npx playwright test tests/uat/02-dashboard.spec.ts

# View HTML report after a run
bun run test:uat:report
```

---

## What Is Automated

| Section | Coverage | Notes |
|---|---|---|
| §1 Auth & Users | ✅ 1.1, 1.3, 1.4 | 1.2 (Google OAuth) is manual — use setup scripts above |
| §2 Dashboard | ✅ Full | Stats cards, activity feed, alert banners |
| §3 Inventory | ✅ Full | Search, filter, add (quantity + asset), edit, detail |
| §4 Operations | ✅ Full | Service logs, borrow, return, move, photos |
| §5 Admin Ops | ✅ Full | Disposal, loss, recovery |
| §6 Master Data | ✅ Full | Categories, units CRUD |
| §7 Reports | ✅ Full | All 7 reports, CSV download, UTF-8 BOM check |
| §8 Notifications | ✅ 8.1–8.4 | Email verified via Resend API; §8.5 Telegram = 30s manual check |
| §9 Mobile UX | ✅ Full | Pixel 7 viewport simulation |
| §10 Security | ✅ Full | 401, 403, redirect checks |

### §8.5 — Telegram (manual, 30 seconds)
After running `§8.3` (automated), open Telegram and verify you received:
- Title: *Ujian Pemberitahuan — <APP_NAME>*
- Clickable item links (FSI-0001, Periuk Besar)

---

## Test Data Strategy

- Mutating tests (add/borrow/dispose/lose items) create items with a `[UAT]` prefix
- `afterAll` in each spec calls `cleanupUatItems()` which deletes all `[UAT]` items via the API
- Read-only tests use seed data items (Periuk Besar, Sejadah, Penghawa Dingin, etc.)
- Running the suite multiple times is safe — cleanup runs after each file

---

## Session Expiry

Sessions expire after 7 days (better-auth default). When tests start failing
with redirect-to-sign-in errors, re-run the setup scripts:

```bash
bun run test:uat:setup:admin
bun run test:uat:setup:ajk
```

---

## Project Structure

```
tests/
  auth.setup.ts            ← One-time manual login → saves storageState
  fixtures.ts              ← adminPage, ajkPage, anonPage fixtures
  helpers/
    resend.ts              ← Resend API email assertion helpers
    db-reset.ts            ← [UAT] item cleanup utilities
  uat/
    01-auth-security.spec.ts   §1, §10
    02-dashboard.spec.ts       §2
    03-inventory.spec.ts       §3
    04-operations.spec.ts      §4
    05-admin-ops.spec.ts       §5
    06-master-data.spec.ts     §6
    07-reports.spec.ts         §7
    08-notifications.spec.ts   §8
    09-mobile.spec.ts          §9
playwright.config.ts       ← Multi-role Playwright config
playwright/.auth/          ← Saved sessions (gitignored)
```

---

## CI / Vercel Integration

To run on every Vercel deployment, add this GitHub Actions workflow:

```yaml
# .github/workflows/uat.yml
on:
  deployment_status:
jobs:
  uat:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v6
        with: { node-version: lts/* }
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npx playwright test --project=admin --project=no-auth
        env:
          UAT_BASE_URL: ${{ github.event.deployment_status.target_url }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          # Sessions must be stored as CI secrets (base64 encoded JSON):
          # ADMIN_AUTH_STATE, AJK_AUTH_STATE
```

For CI auth, encode your session files:
```bash
base64 playwright/.auth/admin.json | pbcopy   # copy to ADMIN_AUTH_STATE secret
base64 playwright/.auth/ajk.json  | pbcopy   # copy to AJK_AUTH_STATE secret
```
