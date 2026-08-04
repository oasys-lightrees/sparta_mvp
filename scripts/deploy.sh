#!/usr/bin/env bash
#
# LATO production deploy — runs ON the EC2 host, invoked over SSH by the
# GitHub Actions workflow (.github/workflows/deploy.yml). It pulls the prebuilt
# GHCR images for this commit, migrates the DB, brings the stack up with a
# health gate, verifies the live site, and cleans up. Any failure exits non-zero
# so the GitHub deployment is marked failed (never silently continues).
#
# Required env (exported by the workflow / caller):
#   IMAGE_TAG   commit SHA to deploy (image tag)
#   REGISTRY    e.g. ghcr.io/oasys-lightrees
#   GHCR_USER   GHCR username (github.actor)
#   GHCR_TOKEN  short-lived token for `docker login ghcr.io`
# Reads DOMAIN / POSTGRES_* from the repo .env (already on the host).
set -euo pipefail

START=$(date +%s)
log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${REGISTRY:?REGISTRY is required}"

# Load host .env for DOMAIN + POSTGRES_* (compose reads it too; we need the
# values for health-check URLs and pg_isready).
[ -f .env ] || die ".env not found in $(pwd) — run the initial setup first"
set -a; . ./.env; set +a
: "${DOMAIN:?DOMAIN missing from .env}"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.registry.yml"
export IMAGE_TAG REGISTRY

log "Deploying ${REGISTRY}/lato-*:${IMAGE_TAG}"
echo "commit:   $(git rev-parse --short HEAD)  ($(git log -1 --pretty=%s))"
echo "domain:   ${DOMAIN}"
echo "compose:  $(docker compose version --short 2>/dev/null || echo '?')"

# --- 1. Authenticate to GHCR and pull the app images -----------------------
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-x}" --password-stdin >/dev/null
  ok "Logged in to ghcr.io"
fi
log "Pulling images"
$COMPOSE pull backend frontend

# --- 2. Migrate the database with the NEW image before it serves traffic ----
# Running migrations against a healthy DB first means the new backend never
# starts against an un-migrated schema.
log "Running database migrations"
$COMPOSE up -d --wait database
$COMPOSE run --rm backend npm run db:migrate
ok "Migrations applied"

# --- 3. Roll the stack (recreates only changed containers) ------------------
log "Starting containers (waiting for healthy)"
$COMPOSE up -d --wait
ok "Containers up"

# --- 4. End-to-end health checks (fail hard) --------------------------------
check() {
  local name="$1" url="$2" i
  for i in 1 2 3 4 5 6; do
    if curl -fsS -m 10 "$url" >/dev/null 2>&1; then ok "health: ${name} (${url})"; return 0; fi
    sleep 5
  done
  die "health check FAILED: ${name} (${url})"
}
log "Health checks"
check "backend API"   "https://${DOMAIN}/api/health"
check "frontend"      "https://${DOMAIN}/"
$COMPOSE exec -T database pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null \
  && ok "health: database (pg_isready)" || die "health check FAILED: database"

# --- 5. Cleanup + status ----------------------------------------------------
log "Cleaning up dangling images"
docker image prune -f >/dev/null || true
docker logout ghcr.io >/dev/null 2>&1 || true

log "Container status"
$COMPOSE ps

# Record the successfully-deployed tag for rollback reference.
echo "${IMAGE_TAG}" > .last_deploy || true

ok "Deploy complete in $(( $(date +%s) - START ))s — commit ${IMAGE_TAG}"
