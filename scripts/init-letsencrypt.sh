#!/bin/sh
# SPARTA — first-time Let's Encrypt certificate bootstrap.
#
# nginx will not start unless a certificate already exists at
# /etc/letsencrypt/live/<DOMAIN>/. This script solves the chicken-and-egg
# problem: it drops a temporary self-signed cert so nginx can boot, brings the
# stack up, then swaps in a real Let's Encrypt cert via the HTTP-01 challenge.
#
# Run it ONCE per host, from the repo root, after creating .env:
#
#     cp .env.example .env      # set DOMAIN, CERTBOT_EMAIL, secrets
#     ./scripts/init-letsencrypt.sh
#
# Afterwards just use `docker compose up -d`. Renewal is automatic (the certbot
# service renews; nginx reloads every 6h).
set -eu

cd "$(dirname "$0")/.."

# --- Load configuration from .env ---
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and set DOMAIN / CERTBOT_EMAIL first." >&2
  exit 1
fi
# shellcheck disable=SC1091
set -a; . ./.env; set +a

: "${DOMAIN:?Set DOMAIN in .env (e.g. sparta.example.com)}"
: "${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env (used for Let's Encrypt expiry notices)}"
STAGING="${CERTBOT_STAGING:-0}"
RSA_KEY_SIZE=4096
LIVE_PATH="/etc/letsencrypt/live/$DOMAIN"

# docker compose v2 (plugin) with a fallback to the legacy v1 binary, always
# applying the base file + production overlay (nginx + certbot).
COMPOSE_ARGS="-f docker-compose.yml -f docker-compose.prod.yml"
if docker compose version >/dev/null 2>&1; then
  DC="docker compose $COMPOSE_ARGS"
else
  DC="docker-compose $COMPOSE_ARGS"
fi

echo "### Issuing certificate for: $DOMAIN"
[ "$STAGING" != "0" ] && echo "### (staging mode — certificates will NOT be trusted by browsers)"

# --- 1. Temporary self-signed cert so nginx can start ---
echo "### Creating a temporary self-signed certificate ..."
$DC run --rm --entrypoint sh certbot -c "\
  mkdir -p '$LIVE_PATH' && \
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '$LIVE_PATH/privkey.pem' \
    -out '$LIVE_PATH/fullchain.pem' \
    -subj '/CN=$DOMAIN'"

# --- 2. Bring the stack up (nginx boots on the dummy cert) ---
echo "### Starting the stack ..."
$DC up -d --build

echo "### Waiting for nginx to come up ..."
sleep 5

# --- 3. Remove the dummy cert so certbot can write the real one ---
echo "### Removing the temporary certificate ..."
$DC run --rm --entrypoint sh certbot -c "\
  rm -rf '/etc/letsencrypt/live/$DOMAIN' \
         '/etc/letsencrypt/archive/$DOMAIN' \
         '/etc/letsencrypt/renewal/$DOMAIN.conf'"

# --- 4. Request the real certificate via the HTTP-01 webroot challenge ---
echo "### Requesting a Let's Encrypt certificate ..."
STAGING_ARG=""
[ "$STAGING" != "0" ] && STAGING_ARG="--staging"

# shellcheck disable=SC2086
$DC run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email "$CERTBOT_EMAIL" \
    -d "$DOMAIN" \
    --rsa-key-size "$RSA_KEY_SIZE" \
    --agree-tos --no-eff-email --force-renewal

# --- 5. Reload nginx with the real certificate ---
echo "### Reloading nginx ..."
$DC exec nginx nginx -s reload

echo
echo "### Done. https://$DOMAIN should now serve a trusted certificate."
echo "### Next: run migrations ->  $DC exec backend npm run db:migrate"
