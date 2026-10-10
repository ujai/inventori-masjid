# 01 — Account & Service Setup Guide

> **Tip:** Create the hosting accounts under an email owned by the masjid (e.g. `inventori@your-masjid-domain`), not a personal one, so the masjid keeps control when committee members change. Add the developer as a collaborator.

**Total time:** ~60–90 minutes
**Cost:** RM 0 (all free tiers for MVP)

---

## Quick checklist

Tick each as you complete:

- [ ] **0.** Password manager ready (Bitwarden / 1Password / KeePass)
- [ ] **1.** GitHub repository
- [ ] **2.** Neon database
- [ ] **3.** Cloudflare R2 (file storage)
- [ ] **4.** Google OAuth credentials
- [ ] **5.** Resend (email)
- [ ] **6.** Telegram bot
- [ ] **7.** Vercel (hosting + deployment)
- [ ] **8.** All values copied to `.env.local`

---

## 0. Before you start — Password manager

Create a vault entry called **"Masjid Inventory"** and save every credential here as you go. Suggested fields:

```
GitHub username + token
Neon connection string
Cloudflare account ID + R2 access keys
Google client ID + secret
Resend API key
Telegram bot token + secret
Vercel project URL
```

---

## 1. GitHub repository

**Why:** Source code hosting + Vercel integration.

### Steps

1. Sign in to https://github.com (use the masjid email if possible)
2. **Fork** this repository, or create a new private repository and push a clone of it:

```bash
git clone https://github.com/ujai/inventori-masjid.git
cd inventori-masjid
git remote set-url origin https://github.com/YOUR_USERNAME/inventori-masjid.git
git push -u origin main
```

3. Optional: **Settings → Collaborators → Add people** to give other admins access.

✅ **Save in password manager:**
- Repo URL

---

## 2. Neon — PostgreSQL database

**Why:** Production database, free tier in Singapore region.

### Steps

1. Go to https://console.neon.tech
2. **Sign up** with the masjid email
3. After login, click **Create Project**
4. Fill in:
   - **Project name:** `inventory-masjid`
   - **Postgres version:** 17
   - **Region:** **`AWS Asia Pacific (Singapore) — aws-ap-southeast-1`** ⚠️ critical
   - **Database name:** `inventory_masjid`
5. Click **Create project**

### Get the connection string

1. From the dashboard click **Connect** (top of the page)
2. Choose **Connection string** → **Pooled connection**
3. Copy the value — looks like:
   ```
   postgresql://user:password@ep-xxx.aws-ap-southeast-1.aws.neon.tech/inventory_masjid?sslmode=require&channel_binding=require
   ```

### Enable pg_trgm extension (one-time)

Open **SQL Editor** in Neon console and run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

✅ **Save in password manager:**
- `DATABASE_URL` — the full connection string

✅ **Paste into `.env.local`:**
```
DATABASE_URL="paste-here"
```

---

## 3. Cloudflare R2 — File storage

**Why:** Photo / police report / document storage. Free 10 GB.

### Steps

1. Go to https://dash.cloudflare.com
2. **Sign up** with masjid email
3. After verification, in left sidebar click **R2 Object Storage**
4. **First time:** click **Subscribe to R2** (free tier — no credit card needed for first 10 GB but they may ask for one as a safety net; you will not be charged unless you exceed limits)
5. Click **Create bucket**
6. **Bucket name:** `inventory-masjid`
7. **Location:** **Asia-Pacific (APAC)** preferred
8. Click **Create bucket**

### Create API token

1. From R2 sidebar click **Manage R2 API Tokens** (top right)
2. Click **Create API token**
3. **Token name:** `inventory-masjid-app`
4. **Permissions:** **Object Read & Write**
5. **Specify bucket:** select `inventory-masjid`
6. **TTL:** Forever (you can rotate later)
7. Click **Create API Token**
8. Copy:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - **Use jurisdiction-specific endpoint for S3 clients** → `R2_ENDPOINT`

### Get account ID

- Top-right of Cloudflare dashboard → click your profile → **Account ID** is shown
- Save as `R2_ACCOUNT_ID`

### Enable public R2.dev URL (for serving photos)

1. Go to your bucket → **Settings** tab
2. Scroll to **Public access** → **Allow Access**
3. Copy the **Public R2.dev URL** (e.g. `https://pub-xxx.r2.dev`)

### Configure CORS (so the browser can upload directly)

In bucket → **Settings → CORS Policy** → paste:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://*.vercel.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

> When you have a custom domain later, add it to `AllowedOrigins`.

✅ **Paste into `.env.local`:**
```
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="inventory-masjid"
R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

---

## 4. Google OAuth — Sign in with Google

**Why:** Users can sign in with Google.

### Steps

1. Go to https://console.cloud.google.com
2. Sign in with masjid email
3. Top bar → **Select a project** → **New Project**
4. **Project name:** `Inventori Masjid Anda`
5. Click **Create**
6. Wait ~30 seconds for project creation, then select it

### Enable OAuth consent screen

1. Left sidebar → **APIs & Services** → **OAuth consent screen**
2. **User Type:** **External** → **Create**
3. Fill in:
   - **App name:** `Inventori Masjid Anda`
   - **User support email:** masjid email
   - **App logo:** (optional, can add later)
   - **Authorized domains:** **leave empty for now**. ⚠️ Do NOT add `vercel.app` — it's on Google's Public Suffix List and will be rejected with *"Invalid domain: must be a top private domain"*. You only need this field when (a) you have a real custom domain like `masjid-anda.my`, or (b) you submit for Google verification. The Vercel URL goes in the OAuth client's *Authorized JavaScript origins* (step further below), not here.
   - **Developer contact:** masjid email
4. Click **Save and Continue**
5. **Scopes:** click **Add or Remove Scopes** → tick `email`, `profile`, `openid` → **Update** → **Save and Continue**
6. **Test users:** add the admin's email + AJK 1's email + your email → **Save and Continue**
7. Back to dashboard

### Create OAuth client ID

1. Left sidebar → **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. **Application type:** **Web application**
4. **Name:** `inventori-masjid-web`
5. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `https://YOUR_VERCEL_URL.vercel.app` (add after Vercel setup)
6. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR_VERCEL_URL.vercel.app/api/auth/callback/google`
7. Click **Create**
8. Copy:
   - **Client ID** → `GOOGLE_CLIENT_ID`
   - **Client secret** → `GOOGLE_CLIENT_SECRET`

> **Note:** While in test mode, only listed test users can sign in. Submit for verification later when you go production.

✅ **Paste into `.env.local`:**
```
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

## 5. Resend — Email service

**Why:** Send invite emails, password reset, service reminders, expiry alerts. Free 3,000/month.

### Steps

1. Go to https://resend.com
2. **Sign up** with masjid email
3. Verify email
4. Dashboard → **Domains** → **Add Domain**

### Option A: Quick start — use Resend's test domain (good for dev only)

- You can send from `onboarding@resend.dev` immediately for testing
- Limit: only to your verified email
- Use this for local dev to avoid DNS hassle

### Option B: Use a real domain (do this before launch)

If masjid has any domain (even a free one):
1. Add the domain in Resend
2. Resend gives you DNS records (DKIM, SPF, MX optional)
3. Add these records at your domain registrar
4. Wait ~30 minutes, click **Verify**
5. Once verified, you can send from any address `@yourdomain.com`

### Create API key

1. Dashboard → **API Keys** → **Create API Key**
2. **Name:** `inventory-masjid-app`
3. **Permission:** **Sending access**
4. **Domain:** the verified domain (or default for now)
5. Click **Add**
6. Copy the key — **shown only once**

✅ **Paste into `.env.local`:**
```
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Inventori Masjid Anda <noreply@YOUR_DOMAIN>"
# For dev with no domain yet: use Resend's test sender
# RESEND_FROM_EMAIL="onboarding@resend.dev"
```

---

## 6. Telegram bot

**Why:** Per client expansion — notifications and monthly export delivery via Telegram.

### Steps

1. Open Telegram on your phone (or Telegram Web at https://web.telegram.org)
2. Search for **`@BotFather`** (official, has a blue check mark)
3. Send `/start`
4. Send `/newbot`
5. **Bot name** (display name): `Inventori Masjid Anda`
6. **Bot username** (must end with `bot`): `masjid_anda_inventori_bot` (or similar — must be unique)
7. BotFather replies with the **bot token** — looks like `7654321:ABCDEFghijklmnopqrstuvwxyz123456789`

### Configure bot

Send these to BotFather:

```
/setdescription
[then choose your bot]
Bot rasmi untuk Inventori Masjid Anda. Hantar peringatan servis dan eksport bulanan.

/setabouttext
[choose bot]
Inventori Masjid Anda — sistem pengurusan inventori.

/setcommands
[choose bot]
start - Mulakan dan pautkan akaun
help - Bantuan
```

### Generate webhook secret

In a terminal:
```bash
openssl rand -hex 32
```
Save the output — this is `TELEGRAM_WEBHOOK_SECRET`.

> The webhook URL will be set later when the app is deployed (Phase 6). For now, just save the secret.

✅ **Paste into `.env.local`:**
```
TELEGRAM_BOT_TOKEN="7654321:ABCDEFghijklmnopqrstuvwxyz..."
TELEGRAM_BOT_USERNAME="masjid_anda_inventori_bot"
TELEGRAM_WEBHOOK_SECRET="paste-openssl-output-here"
```

---

## 7. Vercel — Hosting

**Why:** Where the Next.js app runs.

### Steps

1. Go to https://vercel.com
2. **Sign up with GitHub** (using the masjid GitHub account)
3. Authorize Vercel to access your repos
4. Dashboard → **Add New → Project**
5. Find `inventori-masjid` → click **Import**
6. **Configure project:**
   - **Project name:** `inventori-masjid`
   - **Framework preset:** Next.js (auto-detected)
   - **Root directory:** `./`
7. **Environment variables** — paste all values from your `.env.local` here (production scope by default)
   - You can also do this later via **Settings → Environment Variables**
8. Click **Deploy**
9. Wait ~2 minutes for first deploy
10. Vercel gives you a URL: `https://inventori-masjid-xxx.vercel.app`

### Set the function region to Singapore (important for latency)

1. After deploy → **Settings → Functions**
2. Under **Function Regions** → select **Singapore (`sin1`)**
3. Save

### Update Better Auth URL

1. Once Vercel URL is known, edit env var:
   ```
   BETTER_AUTH_URL=https://inventori-masjid-xxx.vercel.app
   ```

### Update Google OAuth redirect URIs

Go back to **Section 4 step 6** and add the Vercel URL to:
- Authorized JavaScript origins
- Authorized redirect URIs

✅ **Save in password manager:**
- Vercel project URL
- Vercel team URL (if applicable)

---

## 8. Final check — all env vars filled?

Open `.env.local` and verify every variable has a real value (no `""` or placeholders):

```bash
cat .env.local
```

Quickly count:

```bash
grep -c '=""' .env.local
```

Should output `0`.

Also generate Better Auth secret if you haven't:
```bash
openssl rand -base64 32
```
Paste into `BETTER_AUTH_SECRET`.

---

## Verification

Run from project root:

```bash
bun install
bun db:generate
bun db:migrate
bun db:seed
bun dev
```

Open http://localhost:3000 — you should see the Phase 0 landing page.

Open https://console.neon.tech → SQL Editor → run:

```sql
SELECT count(*) FROM categories;  -- should return 8
SELECT count(*) FROM units;       -- should return 8
SELECT count(*) FROM locations;   -- should return 8
```

If all three return 8, **Phase 0 is done. ✅**

---

## Common issues

| Issue | Fix |
|---|---|
| "Connection refused" on Neon | check region, ensure `?sslmode=require` is in URL |
| `pg_trgm` not found | run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in Neon SQL Editor |
| Google sign-in shows "App not verified" | this is normal in test mode; click Advanced → Continue |
| R2 CORS error | re-check the JSON in §3; make sure your dev URL is in AllowedOrigins |
| Resend email not received | check spam folder; ensure FROM email matches verified domain |
| Telegram bot username taken | try variants — must be globally unique |

---

## What you have now

After completing this guide:

✅ A private GitHub repo with code
✅ A live Neon database in Singapore
✅ Cloudflare R2 bucket ready for photos
✅ Google OAuth client for "Sign in with Google"
✅ Resend account ready to send email
✅ Telegram bot waiting for webhook configuration
✅ Vercel deploying every push to `main`
✅ Local dev environment running

**Next:** Move to **Phase 1 — Auth + User Management**.

---

## Account ownership transfer (when handing over to masjid)

Before final launch, ensure all these are owned by the masjid:

- [ ] GitHub: masjid account is owner; you are collaborator
- [ ] Neon: masjid email is the owner; you are member
- [ ] Vercel: masjid is on the project; you are member
- [ ] Cloudflare: masjid email owns the account
- [ ] Google Cloud: project owner is masjid
- [ ] Resend: workspace owner is masjid
- [ ] Telegram bot: BotFather creator email is masjid
- [ ] All credentials shared via password manager with admin

This protects the masjid if the developer changes in the future.
