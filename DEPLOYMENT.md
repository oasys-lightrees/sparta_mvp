# SPARTA — Production Deployment (HTTPS)

This guide covers deploying SPARTA on an AWS EC2 host with Docker Compose
behind nginx, with HTTPS terminated by **nginx + Let's Encrypt** and fronted by
**Cloudflare**.

```
Cloudflare (HTTPS)  →  nginx (TLS, :443)  →  ┌ /      → frontend (Next.js :3000)
                                             └ /api/  → backend  (Hono.js :3001)
                                                          backend → PostgreSQL :5432
```

- Domain: **sparta.jearimjarden.com**
- TLS is handled **only** at the nginx layer. The Next.js and Hono apps speak
  plain HTTP internally — there is no SSL code inside the application.

---

## 1. Environment variables

Create a root `.env` (from `.env.example`) used by `docker compose`:

| Variable | Where | Example | Notes |
|---|---|---|---|
| `POSTGRES_USER` | db | `sparta` | |
| `POSTGRES_PASSWORD` | db | *(strong secret)* | change in production |
| `POSTGRES_DB` | db | `sparta` | |
| `JWT_SECRET` | backend | *(long random secret)* | **must** be strong/secret |
| `DATABASE_URL` | backend (local tooling) | `postgres://sparta:…@localhost:5432/sparta` | inside compose the backend derives its own URL with host `database` |
| `CORS_ORIGINS` | backend (optional) | `https://sparta.jearimjarden.com,http://localhost:3000` | defaults to the production domain + localhost when unset |
| `SMTP_HOST` | backend (optional) | `smtp.example.com` | **email disabled when unset** — sends are skipped/logged, submission never breaks |
| `SMTP_PORT` | backend | `587` | `465` enables implicit TLS |
| `SMTP_USER` / `SMTP_PASSWORD` | backend | *(provider credentials)* | omit for unauthenticated relays |
| `SMTP_FROM` | backend | `no-reply@sparta.jearimjarden.com` | From address for result emails |
| `OPENAI_API_KEY` | backend (optional) | `sk-…` | **AI disabled when unset** — AI endpoints return a clear error; premium unlock falls back to a placeholder. Backend-only, never sent to the browser |
| `OPENAI_MODEL` | backend | `gpt-5-mini` | no hardcoded model — set per deployment |
| `OPENAI_BASE_URL` | backend (optional) | `https://api.openai.com/v1` | override for Azure / OpenAI-compatible proxies |
| `MIDTRANS_SERVER_KEY` | backend (optional) | `Mid-server-…` | **real payments disabled when unset** — token purchase falls back to an instant demo credit. Backend-only, never sent to the browser. Signs/verifies the notification webhook |
| `MIDTRANS_CLIENT_KEY` | backend (optional) | `Mid-client-…` | returned to the browser for the Snap checkout |
| `MIDTRANS_IS_PRODUCTION` | backend | `false` | `true` uses live Midtrans endpoints; anything else (default) uses sandbox |
| `TOKEN_PRICE_IDR` | backend (optional) | `1000` | price of one token in IDR (Midtrans charges whole rupiah); default `1000` |
| `NEXT_PUBLIC_API_URL` | frontend | `https://sparta.jearimjarden.com` | **build-time** — see the note below |

Generate strong secrets, e.g.:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD
```

### ⚠️ `NEXT_PUBLIC_API_URL` is inlined at BUILD time

Next.js bakes `NEXT_PUBLIC_*` variables into the client bundle when
`npm run build` runs — **not** at container start. The value must therefore be
present during the frontend image build. Compose's `environment:` block applies
at runtime, which is too late for the browser bundle.

In production the frontend calls the API through the **same origin**
(`https://sparta.jearimjarden.com/api/...` via nginx), so set:

```
NEXT_PUBLIC_API_URL=https://sparta.jearimjarden.com
```

Make sure this is exported in the shell that runs the build, or wire it as a
Docker build arg, **before** building the frontend image. If you change it,
rebuild the frontend image (a restart alone will not pick it up).

> The application code contains **no hardcoded domain, localhost or IP** for the
> API. The base URL comes solely from `NEXT_PUBLIC_API_URL`; when unset it falls
> back to a **relative** base (same-origin), so nothing localhost-specific is
> shipped. For local dev, set `NEXT_PUBLIC_API_URL=http://localhost:3001`
> (already in `frontend/.env.example`).

---

## 2. Build & start (Docker Compose)

```bash
# 0. clone + configure
git clone <repo> sparta && cd sparta
cp .env.example .env            # then edit secrets + NEXT_PUBLIC_API_URL

# 1. build (ensure NEXT_PUBLIC_API_URL is set for the frontend build)
export NEXT_PUBLIC_API_URL=https://sparta.jearimjarden.com
docker compose build

# 2. start
docker compose up -d

# 3. database schema (first deploy + after migrations)
docker compose exec backend npm run db:migrate

# 4. (optional) demo content
docker compose exec backend npm run db:seed
```

Containers exposed on the host:

| Service | Host port | Purpose |
|---|---|---|
| frontend | `3000` | Next.js (proxied by nginx) |
| backend | `3001` | Hono API (proxied by nginx at `/api`) |
| database | `5433` | PostgreSQL (host port; container is `5432`) |

Useful operations:

```bash
docker compose ps
docker compose logs -f backend
docker compose down            # stop
docker compose up -d --build   # rebuild + restart
```

---

## 3. nginx reverse proxy

A ready config lives at [`nginx/default.conf`](nginx/default.conf). Mount it at
`/etc/nginx/conf.d/default.conf`. It routes `/api/*` → `backend:3001` and
everything else → `frontend:3000`, and includes gzip, forwarded headers and a
commented TLS server block.

Minimal HTTPS server block for `sparta.jearimjarden.com` (after certs exist):

```nginx
server {
    listen 80;
    server_name sparta.jearimjarden.com;
    # ACME challenge for certbot
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name sparta.jearimjarden.com;

    ssl_certificate     /etc/letsencrypt/live/sparta.jearimjarden.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sparta.jearimjarden.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    client_max_body_size 10m;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location /api/ { proxy_pass http://backend:3001; }
    location /     { proxy_pass http://frontend:3000; }
}
```

> If nginx runs on the host (not in Compose), replace `backend:3001` /
> `frontend:3000` with `127.0.0.1:3001` / `127.0.0.1:3000`.

Reload after changes: `sudo nginx -t && sudo systemctl reload nginx`.

---

## 4. HTTPS with Let's Encrypt (certbot)

On the EC2 host (host-installed nginx shown):

```bash
sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx

# Issue + auto-configure the cert for the domain
sudo certbot --nginx -d sparta.jearimjarden.com

# Verify automatic renewal (certs last 90 days)
sudo certbot renew --dry-run
```

Certbot installs the cert and wires the `ssl_certificate*` lines into the nginx
server block. Renewal is handled by the certbot systemd timer.

> **DNS prerequisite:** `sparta.jearimjarden.com` must resolve to the EC2
> public IP for the HTTP-01 challenge. If Cloudflare proxying (orange cloud) is
> on, either temporarily grey-cloud the record during issuance, or use the
> DNS-01 challenge (`certbot --dns-cloudflare`).

### EC2 security group
Open inbound **80** (ACME + redirect) and **443** (HTTPS). Keep the app ports
(3000/3001) and Postgres (5433) **closed** to the public — they are reached
only through nginx / locally.

---

## 5. Cloudflare SSL mode

Use **Full (strict)**:

- **Full (strict)** — Cloudflare ↔ origin is encrypted **and** the origin
  certificate is validated. This is the recommended mode because the origin has
  a real Let's Encrypt certificate. ✅
- *Full* (non-strict) — encrypted but does not validate the origin cert; weaker.
- *Flexible* — ❌ do **not** use: Cloudflare→origin is plain HTTP, which causes
  redirect loops and is insecure.

Recommended Cloudflare settings:
- SSL/TLS mode: **Full (strict)**
- **Always Use HTTPS**: On
- **Automatic HTTPS Rewrites**: On
- Min TLS version: **1.2**
- Proxy (orange cloud): On for `sparta.jearimjarden.com`

---

## 6. Payments (Midtrans)

Token purchases run through **Midtrans Snap**. The backend creates a `PENDING`
order, hands the browser to Midtrans' hosted checkout, and credits the wallet
from a **signed server-to-server notification (webhook)** — exactly once, on the
first `PAID` transition. When `MIDTRANS_SERVER_KEY` is unset the flow degrades
gracefully to an instant demo credit (same philosophy as the AI/email features),
so the site still works without a gateway configured.

### Keys
From the Midtrans Dashboard → **Settings → Access Keys**, copy the **Server Key**
and **Client Key** into the root `.env` (`MIDTRANS_SERVER_KEY`,
`MIDTRANS_CLIENT_KEY`). Sandbox and production have separate key pairs. Set
`MIDTRANS_IS_PRODUCTION=true` only when using live keys; leave it `false` (the
default) for the sandbox. `TOKEN_PRICE_IDR` sets how many rupiah one token costs
(default `1000`).

> Keys are backend-only. `MIDTRANS_SERVER_KEY` never reaches the browser; the
> client key is handed out only to initialize the Snap checkout.

### Webhook (required for tokens to be credited)
In the Midtrans Dashboard → **Settings → Configuration**, set the **Payment
Notification URL** to:

```
https://sparta.jearimjarden.com/api/tokens/midtrans/notification
```

- This endpoint **must be publicly reachable** — it is the only path that
  credits the wallet after a payment settles.
- It is intentionally unauthenticated (no Bearer header) and guarded by
  Midtrans' **SHA-512 signature** verification, so it works as-is behind
  nginx / Cloudflare with **no special rules** — do not add auth or IP rules
  that would block Midtrans' servers.
- nginx already routes `/api/*` → `backend:3001`, so no extra config is needed.

### Redirect back
After paying, Midtrans redirects the user to the app with `order_id` in the URL;
the dashboard polls `GET /api/tokens/orders/:orderId` to confirm and refresh the
balance. Because the webhook does the actual crediting, tokens still land even if
the user closes the tab before the redirect.

### Verify before going live
Configure the **sandbox** keys first, set `MIDTRANS_IS_PRODUCTION=false`, and run
a purchase end-to-end using the Midtrans **Simulator** / test payment methods.
Confirm the wallet balance increases and a `TOKEN_TOPUP` transaction is recorded,
then switch to live keys and `MIDTRANS_IS_PRODUCTION=true`.

> **Local dev caveat:** the webhook cannot reach `localhost`. To test the paid
> path off a server, expose the backend with a tunnel (e.g. ngrok) and point the
> notification URL at the tunnel; otherwise use the demo-credit fallback.

---

## 7. Authentication / cookie note

**Current behaviour (do not change for this release):** the backend issues a
JWT (Bearer) that the frontend stores in **`localStorage`** and sends via the
`Authorization` header. CORS is configured for Bearer auth (no cookies, no
credentials), so the API allowlist is origin-based only.

**Future hardening (documentation only — not implemented here):** migrating the
JWT to an **httpOnly, Secure, SameSite=Lax/Strict cookie** would protect the
token from XSS-based theft. That migration would require:
- backend: set/clear the cookie on login/logout, read it in `authMiddleware`,
  and enable `cors({ credentials: true })` with an explicit (non-`*`) origin;
- frontend: send requests with `credentials: 'include'` and stop reading the
  token from `localStorage`;
- a CSRF mitigation (e.g., SameSite + a CSRF token for state-changing requests).

This is intentionally deferred; no auth code is changed in this deployment prep.

---

## 8. Production security checklist

- [ ] `JWT_SECRET` is a long random secret (not the example value).
- [ ] `POSTGRES_PASSWORD` is strong; DB is **not** publicly reachable (5433 closed in the EC2 security group / firewall).
- [ ] `NEXT_PUBLIC_API_URL=https://sparta.jearimjarden.com` set **at build time**; no localhost/IP baked into the bundle.
- [ ] `CORS_ORIGINS` matches the live domain(s); no wildcard origin in production.
- [ ] nginx terminates TLS; only ports **80** and **443** are open publicly.
- [ ] HTTP → HTTPS redirect active; HSTS considered once HTTPS is stable.
- [ ] Cloudflare SSL mode = **Full (strict)**; Always Use HTTPS on.
- [ ] Let's Encrypt auto-renewal verified (`certbot renew --dry-run`).
- [ ] `docker compose exec backend npm run db:migrate` run after each deploy with schema changes.
- [ ] First admin promoted (`UPDATE users SET role='ADMIN' WHERE email='…';`) or demo seed run.
- [ ] SMTP_* configured if result emails are wanted (otherwise email is cleanly skipped — submission still works).
- [ ] `MIDTRANS_*` configured if real payments are wanted (otherwise purchase falls back to a demo credit); `MIDTRANS_IS_PRODUCTION=true` only with live keys.
- [ ] Midtrans **Payment Notification URL** set to `https://<domain>/api/tokens/midtrans/notification` and reachable; verified end-to-end in sandbox before going live.
- [ ] Backups configured for the `postgres_data` volume.
- [ ] Container logs monitored (`docker compose logs`); restart policy is `unless-stopped`.
