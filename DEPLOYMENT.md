# SPARTA — Production Deployment (HTTPS)

This guide covers deploying SPARTA with Docker Compose. **nginx and certbot run
as compose services** — HTTPS is terminated by nginx and certificates are
issued/renewed automatically by Let's Encrypt. Everything comes up with
`docker compose up -d`; there is nothing to install on the host except Docker.

```
Internet (HTTPS)  →  nginx (TLS, :443)  →  ┌ /      → frontend (Next.js :3000)
                     ▲                     └ /api/  → backend  (Hono.js :3001)
                     │                                  backend → PostgreSQL :5432
             certbot (Let's Encrypt,
             shared cert volume, auto-renew)
```

- **Domain is dynamic.** Set `DOMAIN` (and `CERTBOT_EMAIL`) in `.env`; it drives
  the nginx `server_name`, the TLS certificate, the CORS allowlist, and the
  frontend API base URL. No domain is hardcoded anywhere.
- TLS is handled **only** at the nginx layer. The Next.js and Hono apps speak
  plain HTTP internally — there is no SSL code inside the application.
- Only ports **80** and **443** are published to the host; the frontend,
  backend and database are reachable only inside the compose network (the DB is
  additionally bound to `127.0.0.1` for host-side tooling).
- Fronting with Cloudflare is optional. If you use it, set SSL/TLS mode to
  **Full (strict)** (see §5) and grey-cloud the record during first issuance so
  the HTTP-01 challenge reaches the origin.

---

## 1. Environment variables

Create a root `.env` (from `.env.example`) used by `docker compose`:

| Variable | Where | Example | Notes |
|---|---|---|---|
| `DOMAIN` | nginx / certbot / build | `sparta.example.com` | **required** — server_name, TLS cert, and the default for CORS + API base URL |
| `CERTBOT_EMAIL` | certbot | `admin@example.com` | **required** — Let's Encrypt expiry/security notices |
| `CERTBOT_STAGING` | certbot | `0` | `1` uses the Let's Encrypt staging CA (untrusted certs, no rate limits) while testing |
| `POSTGRES_USER` | db | `sparta` | |
| `POSTGRES_PASSWORD` | db | *(strong secret)* | change in production |
| `POSTGRES_DB` | db | `sparta` | |
| `JWT_SECRET` | backend | *(long random secret)* | **must** be strong/secret |
| `DATABASE_URL` | backend (local tooling) | `postgres://sparta:…@localhost:5432/sparta` | inside compose the backend derives its own URL with host `database` |
| `CORS_ORIGINS` | backend (optional) | `https://sparta.example.com,http://localhost:3000` | compose defaults it to `https://${DOMAIN}` when unset |
| `SMTP_HOST` | backend (optional) | `smtp.example.com` | **email disabled when unset** — sends are skipped/logged, submission never breaks |
| `SMTP_PORT` | backend | `587` | `465` enables implicit TLS |
| `SMTP_USER` / `SMTP_PASSWORD` | backend | *(provider credentials)* | omit for unauthenticated relays |
| `SMTP_FROM` | backend | `no-reply@sparta.example.com` | From address for result emails |
| `OPENAI_API_KEY` | backend (optional) | `sk-…` | **AI disabled when unset** — AI endpoints return a clear error; premium unlock falls back to a placeholder. Backend-only, never sent to the browser |
| `OPENAI_MODEL` | backend | `gpt-5-mini` | no hardcoded model — set per deployment |
| `OPENAI_BASE_URL` | backend (optional) | `https://api.openai.com/v1` | override for Azure / OpenAI-compatible proxies |
| `NEXT_PUBLIC_API_URL` | frontend (optional) | `https://sparta.example.com` | **build-time** — compose defaults it to `https://${DOMAIN}`; override only for non-standard setups (see note) |

Generate strong secrets, e.g.:

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 24   # POSTGRES_PASSWORD
```

### ⚠️ `NEXT_PUBLIC_API_URL` is inlined at BUILD time

Next.js bakes `NEXT_PUBLIC_*` variables into the client bundle when
`npm run build` runs — **not** at container start. This is now handled for you:
the frontend service passes it as a **Docker build arg** (`frontend/Dockerfile`
declares `ARG NEXT_PUBLIC_API_URL`), defaulting to `https://${DOMAIN}` so the
browser calls the API through the **same origin** via nginx. You normally set
only `DOMAIN` and never touch `NEXT_PUBLIC_API_URL`.

If you do change it, rebuild the frontend image (`docker compose build frontend`
or `docker compose up -d --build`) — a restart alone will not pick it up.

> The application code contains **no hardcoded domain, localhost or IP** for the
> API. The base URL comes solely from `NEXT_PUBLIC_API_URL`; when unset it falls
> back to a **relative** base (same-origin), so nothing localhost-specific is
> shipped. For local (non-Docker) dev, set `NEXT_PUBLIC_API_URL=http://localhost:3001`
> (already in `frontend/.env.example`).

---

## 2. Build, start & get HTTPS (Docker Compose)

The stack is split across two compose files:

- [`docker-compose.yml`](docker-compose.yml) — base services (database, backend,
  frontend), also used as-is for local development.
- [`docker-compose.prod.yml`](docker-compose.prod.yml) — production overlay that
  adds **nginx** + **certbot**, closes the app ports, and binds the DB to
  localhost.

Production applies **both**. The easiest way is to uncomment this line in `.env`
so every `docker compose ...` command picks up the overlay automatically:

```
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
```

(Otherwise pass `-f docker-compose.yml -f docker-compose.prod.yml` on each
command.) First deploy:

```bash
# 0. clone + configure
git clone <repo> sparta && cd sparta
cp .env.example .env            # set DOMAIN, CERTBOT_EMAIL, secrets;
                                # uncomment COMPOSE_FILE for production

# 1. point DNS: an A/AAAA record for $DOMAIN -> this host's public IP
#    (must resolve before the next step so the ACME challenge can succeed)

# 2. bootstrap TLS + bring everything up (run ONCE)
./scripts/init-letsencrypt.sh

# 3. database schema (first deploy + after migrations)
docker compose exec backend npm run db:migrate

# 4. (optional) demo content
docker compose exec backend npm run db:seed
```

`init-letsencrypt.sh` always applies both compose files itself, so it works even
before you set `COMPOSE_FILE`. It reads `DOMAIN`/`CERTBOT_EMAIL` from `.env`,
installs a temporary self-signed cert so nginx can boot, runs
`docker compose up -d --build`, then replaces it with a real Let's Encrypt
certificate via the HTTP-01 webroot challenge and reloads nginx. After that,
day-to-day you just use plain `docker compose` commands (with `COMPOSE_FILE` set):

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx certbot   # TLS issuance / renewal logs
docker compose up -d --build           # rebuild + restart after code changes
docker compose down                    # stop (certs persist in the volume)
```

> **Testing tip:** set `CERTBOT_STAGING=1` in `.env` for your first run to avoid
> Let's Encrypt's rate limits. The cert will be untrusted (browser warning);
> once the flow works, set it back to `0`, delete the `letsencrypt` volume
> (`docker compose down && docker volume rm sparta_letsencrypt`), and re-run the
> bootstrap script for a trusted cert.

Services and how they're exposed:

| Service | Exposure | Purpose |
|---|---|---|
| nginx | host `80` + `443` | TLS termination + reverse proxy (the only public entrypoint) |
| certbot | internal | issues + auto-renews the Let's Encrypt cert |
| frontend | internal only | Next.js (proxied by nginx at `/`) |
| backend | internal only | Hono API (proxied by nginx at `/api/`) |
| database | `127.0.0.1:5433` | PostgreSQL — localhost-only, for host-side drizzle tooling |

---

## 3. nginx reverse proxy (containerized)

nginx runs as the `nginx` compose service from the official `nginx:alpine`
image. Its config is a **template**,
[`nginx/default.conf.template`](nginx/default.conf.template): on startup the
image runs `envsubst` and substitutes `${DOMAIN}` (from the service's `DOMAIN`
env var) into `server_name` and the `ssl_certificate*` paths. It routes
`/api/*` → `backend:3001` and everything else → `frontend:3000`, redirects all
plain HTTP to HTTPS (except the ACME challenge path), and adds gzip, forwarded
headers, and security headers including HSTS.

Certificates live in the shared `letsencrypt` volume (`/etc/letsencrypt`) and
the ACME challenge webroot in `certbot_www` (`/var/www/certbot`), both shared
with the certbot service. The nginx service reloads itself every 6h so renewed
certs are picked up without a restart.

To change routing/headers, edit the template and re-render:

```bash
docker compose up -d --force-recreate nginx   # re-runs envsubst
# or, without recreating:
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
```

> A standalone [`nginx/default.conf`](nginx/default.conf) (HTTP-only, with a
> commented TLS block) is kept for reference if you ever run nginx directly on
> the host instead of in Compose. The compose stack uses the `.template` file.

---

## 4. HTTPS with Let's Encrypt (certbot, containerized)

The `certbot` service (official `certbot/certbot` image) owns issuance and
renewal — no certbot install on the host.

- **First issuance** is done by `./scripts/init-letsencrypt.sh` (step 2 above),
  using the HTTP-01 **webroot** challenge served by nginx from `/var/www/certbot`.
- **Renewal** is automatic: the certbot service runs `certbot renew` every 12h
  (a no-op until a cert is within 30 days of expiry) and nginx reloads every 6h.

Verify / operate:

```bash
docker compose exec certbot certbot certificates          # show cert + expiry
docker compose exec certbot certbot renew --dry-run       # test renewal
docker compose logs certbot                               # issuance/renewal log
```

> **DNS prerequisite:** `$DOMAIN` must resolve to this host's public IP for the
> HTTP-01 challenge. If Cloudflare proxying (orange cloud) is on, either
> temporarily grey-cloud the record during issuance, or switch to the DNS-01
> challenge (`certbot --dns-cloudflare`) and adjust the script accordingly.

### Firewall / security group
Open inbound **80** (ACME + HTTP→HTTPS redirect) and **443** (HTTPS). Everything
else is closed: the frontend/backend are not published to the host at all, and
Postgres is bound to `127.0.0.1` only.

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
- Proxy (orange cloud): On for `$DOMAIN` (grey-cloud during first cert issuance)

---

## 6. Authentication / cookie note

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

## 7. Production security checklist

- [ ] `DOMAIN` and `CERTBOT_EMAIL` set in `.env`; `DOMAIN` resolves to this host's public IP.
- [ ] `JWT_SECRET` is a long random secret (not the example value).
- [ ] `POSTGRES_PASSWORD` is strong; DB is bound to `127.0.0.1` (not publicly reachable).
- [ ] `NEXT_PUBLIC_API_URL` defaults to `https://${DOMAIN}` at **build time**; no localhost/IP baked into the bundle.
- [ ] `CORS_ORIGINS` matches the live domain(s); no wildcard origin in production.
- [ ] nginx terminates TLS; only ports **80** and **443** are open publicly (frontend/backend not published).
- [ ] HTTP → HTTPS redirect active; HSTS header enabled (in the nginx template).
- [ ] Cloudflare SSL mode = **Full (strict)**; Always Use HTTPS on (if using Cloudflare).
- [ ] Let's Encrypt auto-renewal verified (`docker compose exec certbot certbot renew --dry-run`).
- [ ] `docker compose exec backend npm run db:migrate` run after each deploy with schema changes.
- [ ] First admin promoted (`UPDATE users SET role='ADMIN' WHERE email='…';`) or demo seed run.
- [ ] SMTP_* configured if result emails are wanted (otherwise email is cleanly skipped — submission still works).
- [ ] Backups configured for the `postgres_data` volume.
- [ ] Container logs monitored (`docker compose logs`); restart policy is `unless-stopped`.
