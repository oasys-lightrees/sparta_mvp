# CI/CD — Production Deploy (GitHub Actions → EC2)

Zero-manual-SSH deployment for LATO. On merge to `main`, GitHub Actions runs
quality gates, builds both images once, pushes them to **GHCR**, then SSHes to
the EC2 host and rolls the existing **Docker Compose** stack with a health gate.

> **No infrastructure redesign.** The runtime is still Docker Compose + nginx +
> certbot on EC2. The only addition is a container **registry (GHCR)** so the
> server *pulls* prebuilt images instead of building them — which is what makes
> "`docker compose pull` → `up -d`" and "avoid unnecessary rebuilds" possible.

---

## 1. Architecture

```mermaid
flowchart TD
  dev[Merge to main] --> gha[GitHub Actions]
  subgraph CI[GitHub-hosted runner]
    gha --> q[quality: lint · typecheck · test]
    q --> b[build: docker buildx]
    b --> push[(push images → GHCR\nghcr.io/OWNER/lato-frontend|backend\n:SHA + :latest)]
  end
  push --> ssh[deploy job: SSH to EC2]
  subgraph EC2[AWS EC2 · Ubuntu · Docker Compose]
    ssh --> sync[git reset --hard SHA]
    sync --> pull[docker compose pull]
    pull --> mig[db:migrate on new image]
    mig --> up[docker compose up -d --wait]
    up --> hc{health checks\nfrontend · /api/health · pg_isready}
    hc -- ok --> clean[prune old images] --> done[✅ deployment complete]
    hc -- fail --> fail[❌ job fails · previous strategy = redeploy prior SHA]
  end
  nginx[nginx :443] --- up
  certbot[certbot] --- up
  db[(postgres\n127.0.0.1 only)] --- up
```

Traffic path is unchanged: **Cloudflare/DNS → nginx (:443) → `/`=frontend:3000, `/api/`=backend:3001 → postgres** (bound to `127.0.0.1`).

---

## 2. Files added to the repo

| File | Purpose |
|---|---|
| `.github/workflows/deploy.yml` | The pipeline: quality → build/push → deploy. |
| `docker-compose.registry.yml` | Deploy overlay: run **prebuilt GHCR images** + container healthchecks. Layered after base + prod. |
| `scripts/deploy.sh` | Runs **on EC2**: pull → migrate → `up -d --wait` → health checks → cleanup, with logs. |
| `docs/CICD.md` | This document. |

Nothing else changes — the existing `docker-compose.yml`, `docker-compose.prod.yml`, `nginx/`, Dockerfiles, and `scripts/init-letsencrypt.sh` are reused as-is.

---

## 3. Required GitHub Secrets & Variables

**Repo → Settings → Secrets and variables → Actions.**

### Secrets (sensitive)
| Secret | Example | Used for |
|---|---|---|
| `EC2_HOST` | `16.78.101.89` | SSH target (EC2 public IP/DNS) |
| `EC2_USER` | `ubuntu` | SSH user (must be in the `docker` group) |
| `EC2_SSH_KEY` | *(PEM private key)* | SSH auth — the **private** half of a deploy keypair |
| `EC2_SSH_PORT` | `22` | Optional; defaults to 22 |

> `GITHUB_TOKEN` is provided automatically — used to **push** to GHCR (in `build`) and, passed over SSH, to **pull** on EC2 (in `deploy`). No personal token needed.

### Variables (non-sensitive)
| Variable | Example | Used for |
|---|---|---|
| `DOMAIN` | `lato.example.com` | Baked into the frontend image as `NEXT_PUBLIC_API_URL=https://$DOMAIN` |
| `EC2_APP_DIR` | `/home/ubuntu/lato` | Repo path on the server (defaults to `/home/ubuntu/lato`) |

### Application/runtime secrets live on the server, not in CI
`JWT_SECRET`, `POSTGRES_PASSWORD`, `OPENAI_API_KEY`, `MIDTRANS_SERVER_KEY`,
`MIDTRANS_CLIENT_KEY`, `SMTP_PASSWORD`, `CERTBOT_EMAIL`, `DATABASE_URL`, etc.
stay in the EC2 `~/lato/.env` (as they already do). This is the **recommended**
model — runtime secrets never leave the box, and the pipeline only needs SSH +
`DOMAIN`.

> **Optional alternative (CI-managed secrets).** If you prefer GitHub to own the
> runtime secrets, add each as a Secret and render `.env` on the server at the
> top of `scripts/deploy.sh` (e.g. `printf 'JWT_SECRET=%s\n' "$JWT_SECRET" >> .env`).
> Not enabled by default — it puts more secrets in CI for little gain here.

---

## 4. Required EC2 changes (one-time)

The host already runs the stack via `init-letsencrypt.sh`. To make it
CI-deployable:

1. **Clone location + git remote.** The app must live at `EC2_APP_DIR` with
   `origin` pointing at the GitHub repo:
   ```bash
   cd /home/ubuntu && git clone https://github.com/oasys-lightrees/sparta_mvp.git lato
   ```
   Keep the existing `.env` in `/home/ubuntu/lato/.env`.
2. **Docker permissions.** The SSH user runs docker without sudo:
   ```bash
   sudo usermod -aG docker "$USER"   # re-login after this
   docker compose version            # must be v2 with `--wait` (Compose ≥ 2.1)
   ```
3. **Deploy SSH key.** Generate a dedicated keypair and authorize it:
   ```bash
   ssh-keygen -t ed25519 -f lato_deploy -C "gha-deploy" -N ""
   cat lato_deploy.pub >> ~/.ssh/authorized_keys   # on EC2
   # put the PRIVATE key (lato_deploy) into the EC2_SSH_KEY secret
   ```
4. **First cert issuance** (only if not already done): `./scripts/init-letsencrypt.sh`.
5. **Security group:** inbound 80/443 open, 22 restricted to trusted IPs (or use
   SSM/a bastion). DB stays bound to `127.0.0.1`.

After that, every merge to `main` deploys automatically.

---

## 5. Deployment strategy (minimal downtime)

`scripts/deploy.sh` does, in order:

1. `docker login ghcr.io` (short-lived token) and **`docker compose pull`** the two app images.
2. **Migrate first:** bring up `database`, then run `db:migrate` using the *new*
   backend image — so the new backend never serves against an un-migrated schema.
3. **`docker compose up -d --wait`** — recreates only the changed containers and
   blocks until their healthchecks pass. Postgres and its volume are untouched;
   nginx keeps serving during the brief backend/frontend swap (seconds), and
   nginx retries upstreams, so effective downtime is near zero.
4. End-to-end **health checks** (below).
5. `docker image prune -f` and `docker logout`.

This matches the requested `pull → up -d → health check → cleanup` flow and
avoids server-side rebuilds entirely.

---

## 6. Health checks

Two layers, both fail the deploy loudly:

- **Container healthchecks** (`docker-compose.registry.yml`) make `up -d --wait`
  block until each app container is healthy:
  - backend: `wget http://localhost:3001/api/health`
  - frontend: `wget http://localhost:3000`
- **End-to-end checks** in `deploy.sh`, through the public edge (retried 6×):
  - `https://$DOMAIN/api/health` → backend via nginx
  - `https://$DOMAIN/` → frontend via nginx
  - `pg_isready` inside the `database` container → DB connectivity

Any failure → non-zero exit → the GitHub deploy job (and the Deployment) is
marked **failed**. Nothing continues silently.

---

## 7. Rollback strategy

**Recommended: redeploy the previous commit's image** — the best fit here
because every deploy produces an immutable `:$SHA` image in GHCR and the server
tracks code with git, so rollback is a fast, deterministic re-run of the same
path (no rebuild).

- **One click:** Actions → *CI/CD — Production Deploy* → **Run workflow** → set
  `image_tag` to the previous commit SHA. The deploy job pulls that image and
  `git reset --hard`s the server to it.
- **From the server:**
  ```bash
  cd /home/ubuntu/lato
  git reset --hard <previous-sha>
  IMAGE_TAG=<previous-sha> REGISTRY=ghcr.io/oasys-lightrees ./scripts/deploy.sh
  ```
  (`.last_deploy` records the last good SHA.)

**Caveat — database migrations are not auto-reversed.** Drizzle migrations are
forward-only; the schema stays migrated after a code rollback. Because the
project's migrations are additive, a code-only rollback is safe. If a release
includes a destructive migration, plan a paired down-migration or a DB snapshot
restore before rolling back. Take a `pg_dump`/EBS snapshot before risky releases.

Compose-level "roll back to the running container" isn't durable across a
recreate, which is exactly why the **image-tag** approach is preferred.

---

## 8. Security considerations

- **No secrets in the repo or images.** Runtime secrets live in the EC2 `.env`;
  CI holds only SSH creds + the non-secret `DOMAIN`. The AI/payment keys never
  reach the browser (backend-only) and never enter the frontend image.
- **Least-privilege token.** `GITHUB_TOKEN` is scoped per-job (`packages: write`
  to push, `packages: read` to pull) and is short-lived; the EC2 `docker login`
  is followed by `docker logout`.
- **Dedicated deploy key**, not a personal key; restrict SSH (source IPs / SSM).
- **DB never public** — bound to `127.0.0.1`; migrations run inside the network.
- **Immutable, traceable images** — every deploy is pinned to a commit SHA, so
  what's running is always identifiable and reproducible.
- **`concurrency`** prevents overlapping deploys from racing.
- Consider protecting the `production` environment (required reviewers) and
  enabling Dependabot/`npm audit` as a follow-up.

---

## 9. Step-by-step setup

1. **Merge this PR** so `.github/workflows/deploy.yml` and friends are on `main`.
2. **EC2 one-time prep** — do the four steps in §4 (clone to `EC2_APP_DIR`, add
   the user to `docker`, authorize the deploy key, ensure `.env` is present).
3. **Add GitHub Secrets/Variables** from §3 (`EC2_HOST`, `EC2_USER`,
   `EC2_SSH_KEY`, optional `EC2_SSH_PORT`; variables `DOMAIN`, `EC2_APP_DIR`).
4. **First run:** either merge a commit to `main`, or Actions → Run workflow.
   Watch the three jobs (quality → build → deploy). The deploy log prints the
   commit, container status, health results, and total duration.
5. **Verify:** `https://$DOMAIN/` loads and `https://$DOMAIN/api/health` returns
   `{"success":true,"data":{"status":"ok"}}`.
6. **Practice a rollback** once (Run workflow with a prior `image_tag`) so it's
   familiar before you need it.

> Migrations run automatically on every deploy (`npm run db:migrate` in the new
> backend image), so schema changes ship with the code — no manual step.
