# Production Tasks — Ankush

The application code is complete and running locally. These are the infra, hosting, and hardening tasks needed to make it production-ready. Work through them in order — each section depends on the previous one.

---

## 1. Database — cloud PostgreSQL

**Goal:** replace the local Postgres instance with a managed cloud DB.

**Recommended options (pick one):**

| Option | Free tier | Notes |
|---|---|---|
| **Supabase** | 500MB, 1 project | Built-in auth, realtime, storage. Free projects pause after 7 days of inactivity — set up a keep-alive cron (see section 6). |
| **Neon** | 0.5GB, scales to zero | Serverless Postgres, more generous on compute, good for variable load. |
| **Railway** | $5/mo hobby | Simplest setup, no pausing. |
| **AWS RDS (PostgreSQL)** | 12 months free tier (db.t3.micro) | Best long-term option if already on AWS. |

**Tasks:**
- [ ] Provision a managed PostgreSQL instance on your chosen provider
- [ ] Create a database user with a strong password (not `postgres`/`postgres`)
- [ ] Whitelist only the backend server's IP (not `0.0.0.0/0`)
- [ ] Copy the connection string into the production `.env` as `DATABASE_URL`
- [ ] Run `alembic upgrade head` against the new DB to apply all 11 migrations
- [ ] Verify tables exist: `psql $DATABASE_URL -c "\dt"` — should show 19 tables
- [ ] Enable automated daily backups (all managed providers offer this, usually under Settings → Backups)

---

## 2. Backend hosting

**Goal:** deploy the FastAPI app so the frontend and external clients can reach it.

**Recommended options:**

| Option | Free tier | Notes |
|---|---|---|
| **Railway** | $5/mo hobby | Easiest: connect GitHub repo, set env vars, deploy. |
| **Render** | 750hrs/mo free | Free tier spins down after 15min idle — fine for dev, not for prod POS (use paid tier). |
| **Fly.io** | 3 shared VMs free | More control, Dockerfile-based. |
| **AWS EC2 / DigitalOcean Droplet** | ~$5–12/mo | Full control, needs you to manage nginx + systemd/gunicorn. |

**Tasks:**
- [ ] Write a `Dockerfile` for the backend (see template below)
- [ ] Add a `Procfile` or `railway.toml` / `render.yaml` depending on chosen platform
- [ ] Set all production env vars on the platform (never commit `.env` to git):
  - `DATABASE_URL` (cloud DB connection string)
  - `SECRET_KEY` (generate fresh: `python3 -c "import secrets; print(secrets.token_hex(32))"`)
  - `ENVIRONMENT=production`
  - `CORS_ORIGINS` (your actual frontend domain(s) — see section 4)
  - `ACCESS_TOKEN_EXPIRE_MINUTES=15`
  - `REFRESH_TOKEN_EXPIRE_DAYS=7`
- [ ] Confirm `uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2` starts cleanly
- [ ] Hit `https://your-backend-url/health` and `https://your-backend-url/health/db` — both should return `{"status": "ok"}`

**Dockerfile template:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
```

---

## 3. Frontend hosting

**Goal:** deploy the Next.js app and wire up subdomains.

**Recommended: Vercel** (built for Next.js, free hobby tier, easiest subdomain setup)

**Tasks:**
- [ ] Connect the GitHub repo to Vercel (vercel.com → Import Project → select this repo, set root to `frontend/`)
- [ ] Set `NEXT_PUBLIC_API_URL` to your production backend URL (from section 2) in Vercel environment variables
- [ ] Add a custom domain on Vercel (e.g. `yourdomain.com`)
- [ ] Add three subdomain CNAME records in your DNS:

  | Subdomain | CNAME target |
  |---|---|
  | `stock.yourdomain.com` | `cname.vercel-dns.com` |
  | `sales.yourdomain.com` | `cname.vercel-dns.com` |
  | `admin.yourdomain.com` | `cname.vercel-dns.com` |

- [ ] In Vercel project settings → Domains, add all three subdomains
- [ ] Verify middleware subdomain routing works: visit `https://stock.yourdomain.com` → should land on the inventory login, not a 404

**Note:** the frontend `middleware.ts` already handles subdomain → route group routing. No code changes needed — just the DNS + Vercel domain config.

---

## 4. CORS and auth hardening

**Goal:** lock down who can call the API.

- [ ] Set `CORS_ORIGINS` on the backend to only your actual frontend domains:
  ```
  CORS_ORIGINS=https://stock.yourdomain.com,https://sales.yourdomain.com,https://admin.yourdomain.com
  ```
- [ ] Confirm the backend is behind HTTPS (managed hosting provides this automatically; on a raw VPS use nginx + certbot)
- [ ] Set token expiry to a sensible shift length for branch terminals — 15 min is too short for a retail counter:
  ```
  ACCESS_TOKEN_EXPIRE_MINUTES=480
  ```
- [ ] The refresh token cookie already sets `secure=True` when `ENVIRONMENT=production`. Confirm this env var is set on the hosting platform.
- [ ] Rotate the `SECRET_KEY` for production — generate a fresh one:
  ```bash
  python3 -c "import secrets; print(secrets.token_hex(32))"
  ```
  Set it in the platform env vars. Dev sessions will be invalidated once (users re-login).
- [ ] Share branch credentials securely — the admin panel shows the branch password once on creation. Use Signal or another encrypted channel, not plain email.

---

## 5. First admin user

The system has no seed admin user. After running migrations on the new DB:

- [ ] Call `POST /auth/register` with role `admin` to create the owner account:
  ```bash
  curl -X POST https://your-backend-url/auth/register \
    -H "Content-Type: application/json" \
    -d '{"full_name":"Owner Name","email":"owner@yourdomain.com","password":"YourStr0ng!Pass","role":"admin"}'
  ```
- [ ] Log in via `POST /auth/login` to confirm it works
- [ ] From the admin UI (`admin.yourdomain.com`), create the first branch — this auto-generates branch credentials
- [ ] Hand branch code + password to branch staff securely (the UI shows it once)

---

## 6. Keep-alive cron (Supabase only)

If you chose Supabase, free projects pause after 7 days of no API activity. Set up a GitHub Actions cron to prevent this:

- [ ] Create `.github/workflows/keepalive.yml`:
  ```yaml
  name: Keep Supabase alive
  on:
    schedule:
      - cron: '0 8 * * *'   # daily at 8am UTC
  jobs:
    ping:
      runs-on: ubuntu-latest
      steps:
        - run: curl -sf https://your-backend-url/health
  ```
- [ ] This pings the backend daily which keeps the Supabase connection alive

**Note:** If you upgrade to Supabase Pro (~$25/mo) or use Neon/Railway, this is not needed.

---

## 7. Monitoring and logging

- [ ] Set up basic uptime monitoring — **UptimeRobot** (free, checks every 5min, emails on downtime) pointed at `https://your-backend-url/health`
- [ ] On the backend platform, enable log streaming or export so you can see errors in production without SSH access
- [ ] Consider **Sentry** (free tier) for exception tracking — add `sentry-sdk[fastapi]` to `requirements.txt` and initialize with your DSN in `main.py`

---

## 8. Domain and SSL

- [ ] Purchase a domain if not already done (Namecheap/Cloudflare Registrar are affordable)
- [ ] Point the domain's nameservers to Cloudflare (free CDN, DDoS protection, SSL)
- [ ] Cloudflare automatically provides SSL for all subdomains
- [ ] Add the three subdomain CNAME records in Cloudflare pointing at Vercel (section 3)

---

## Summary checklist

```
[ ] Cloud DB provisioned and migrations run (alembic upgrade head)
[ ] Backend deployed and /health + /health/db returning OK
[ ] Frontend deployed on Vercel with custom domain
[ ] DNS: 3 subdomain CNAMEs pointing at Vercel
[ ] CORS_ORIGINS set to production domains only
[ ] HTTPS enforced on backend
[ ] ACCESS_TOKEN_EXPIRE_MINUTES=480 (one shift)
[ ] ENVIRONMENT=production (enables secure cookies)
[ ] SECRET_KEY rotated from dev value
[ ] Admin user created, first branch provisioned
[ ] Branch credentials shared securely (not plain email)
[ ] Keep-alive cron if on Supabase free tier
[ ] UptimeRobot monitoring on /health
[ ] DB backups enabled
```

> All Python and Node dependency versions are pinned in `requirements.txt` at the project root.

Once all of these are ticked, the system is production-ready.

---

*Assigned to: Ankush | Context: see README.md and tasksdone.md for full system overview*
