# 03 — Deployment Guide

This covers deploying to Vercel and post-deploy configuration. For account creation see `01-account-setup-guide.md`.

---

## How deployment works

```
git push origin main
       ↓
Vercel detects new commit
       ↓
Build (Next.js 15 + Bun)
       ↓
Deploy to https://inventori.example.com
       ↓
Production live in ~90 seconds
```

Pull requests get **preview deployments** at unique URLs.

---

## Initial Vercel project setup

Done once during account setup (see `01-account-setup-guide.md` Section 7). Key configurations to verify:

| Setting | Required value |
|---|---|
| Framework preset | Next.js |
| Build command | (default) |
| Output directory | (default) |
| Install command | `bun install` |
| Root directory | `./` |
| Function region | **Singapore (sin1)** ⚠️ |
| Node.js version | 22.x |

---

## Environment variables on Vercel

Vercel has 3 scopes:

| Scope | When applied |
|---|---|
| Production | Deploys from `main` branch |
| Preview | Deploys from PRs |
| Development | (rarely used) |

For our project:

| Variable | Production | Preview | Notes |
|---|:-:|:-:|---|
| `DATABASE_URL` | ✅ | ✅ | Use the same Neon project for now; later split prod / preview |
| `BETTER_AUTH_SECRET` | ✅ | ✅ | Same value across; rotate later if needed |
| `BETTER_AUTH_URL` | ✅ | ✅ | Production URL; preview will be slightly off but works |
| `GOOGLE_CLIENT_ID` | ✅ | ✅ | |
| `GOOGLE_CLIENT_SECRET` | ✅ | ✅ | |
| `APP_URL` | ✅ | ✅ | e.g. `https://inventori.example.com` |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | same value as APP_URL |
| `R2_ACCOUNT_ID` | ✅ | ✅ | |
| `R2_ACCESS_KEY_ID` | ✅ | ✅ | |
| `R2_SECRET_ACCESS_KEY` | ✅ | ✅ | |
| `R2_BUCKET` | ✅ | ✅ | |
| `R2_ENDPOINT` | ✅ | ✅ | |
| `R2_PUBLIC_URL` | ✅ | ✅ | |
| `RESEND_API_KEY` | ✅ | ✅ | |
| `RESEND_FROM_EMAIL` | ✅ | ✅ | e.g. `noreply@example.com` |
| `TELEGRAM_BOT_TOKEN` | ✅ | ❌ | leave blank in preview to avoid double-bot |
| `TELEGRAM_BOT_USERNAME` | ✅ | ❌ | |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | ❌ | generate with: `openssl rand -hex 32` |
| `CRON_SECRET` | ✅ | ❌ | generate with: `openssl rand -hex 32` |

To set:
1. Vercel dashboard → project → **Settings → Environment Variables**
2. Add each row → choose scope → save
3. After adding, **redeploy** the latest commit so they take effect

---

## After first deploy

1. Production URL: `https://inventori.example.com`
2. Update **Google OAuth redirect URIs** to include this URL (`/api/auth/callback/google`)
3. Update `BETTER_AUTH_URL` env var on Vercel to match the production URL
4. Update R2 CORS policy to include the production URL (required for photo/document uploads)
5. Register Telegram webhook (see section below)
6. Trigger a redeploy

---

## Setting Telegram webhook

Register the webhook URL once after deploy. As admin, open this URL in your browser:

```
https://inventori.example.com/api/telegram/setup-webhook
```

Should return: `{"data":{"ok":true,"result":true}}`

Verify anytime:
```
https://inventori.example.com/api/telegram/webhook-info
```

---

## Custom domain (later)

When the masjid is ready for a custom domain (e.g. `inventori.example.org`):

1. Buy / use existing domain
2. Vercel → Settings → Domains → Add `inventori.example.org`
3. Vercel shows DNS records to add at your registrar
4. Wait ~30 minutes for DNS propagation
5. Vercel auto-provisions SSL
6. Update env vars `BETTER_AUTH_URL` and `APP_URL` to the new domain
7. Update Google OAuth redirect URIs
8. Update R2 CORS

---

## Database migrations on production

Migrations run via `bun db:migrate` from your **local machine** against the **production Neon URL**. Never auto-run migrations during Vercel build.

```bash
# Set local env to production URL temporarily
export DATABASE_URL="postgresql://...prod..."
bun db:migrate
unset DATABASE_URL
```

Or use a separate `.env.production.local`:

```bash
DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2-) bun db:migrate
```

> Always **back up before running migrations on production**:
> Neon Console → your project → **Backups → Create snapshot**.

---

## Rollback

If a deploy breaks production:

1. Vercel dashboard → Deployments
2. Find the last good deployment
3. Click **⋯ → Promote to Production**

Within 5 seconds, production routes back to the good build.

---

## Monitoring (basic)

Until we add a proper observability tool:

- **Vercel Logs** — Functions tab → live + 24h history
- **Neon Console → Monitoring** — query performance, storage usage
- **Cloudflare R2 → Metrics** — storage usage, request count
- **Resend Dashboard** — email delivery status

Set yourself a calendar reminder to check these monthly until automated.

---

## Production launch checklist

Before announcing the system to AJK:

- [ ] All env vars set on Vercel production
- [ ] Function region = Singapore
- [ ] `BETTER_AUTH_URL` matches production URL
- [ ] Google OAuth redirect URIs updated
- [ ] R2 CORS allows production URL
- [ ] Telegram webhook configured
- [ ] Resend domain verified (or test domain disclosed to user)
- [ ] First admin account created
- [ ] First AJK account invited and tested
- [ ] Database backup snapshot taken
- [ ] Lighthouse mobile score ≥ 85
- [ ] Help guide PDF delivered
- [ ] Account ownership transfer documented
