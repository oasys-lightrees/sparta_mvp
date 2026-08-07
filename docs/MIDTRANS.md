# Midtrans Setup (Token Payments)

This is the hands-on guide for wiring up **Midtrans Snap** so users can buy
tokens with real money. Tokens are the platform's single currency — users top up
their wallet, then spend tokens on paid assessments and voucher packages.

Midtrans is configured **entirely through environment variables** — there is no
code change to make. If you just want the reference table of variables, see
[`DEPLOYMENT.md` §6 Payments](../DEPLOYMENT.md#6-payments-midtrans).

---

## How it works (30-second version)

1. User clicks **Top Up** → backend creates a `PENDING` order and a Midtrans Snap
   transaction, and hands the browser to Midtrans' hosted checkout.
2. User pays on Midtrans.
3. Midtrans calls your **Payment Notification URL** (server-to-server webhook).
   The backend verifies the SHA‑512 signature and credits the wallet **exactly
   once**, on the first `PAID` transition.
4. The user is redirected back; the dashboard confirms the balance.

Because the **webhook** does the crediting, tokens land even if the user closes
the tab before the redirect. This also means: **if the webhook can't reach your
server, balances never update** — that is the #1 setup mistake.

When `MIDTRANS_SERVER_KEY` is empty, the app falls back to an **instant demo
credit** (free tokens) so it still works without a gateway — and that fallback is
**disabled in production** (`MIDTRANS_IS_PRODUCTION=true`) so a live site can
never mint free tokens.

---

## Environment variables

Set these in the root `.env` (docker-compose passes them to the backend):

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `MIDTRANS_SERVER_KEY` | yes (for real payments) | `SB-Mid-server-…` | Backend-only secret. **Empty ⇒ demo credit, no real payments.** Signs/verifies the webhook. Never sent to the browser. |
| `MIDTRANS_CLIENT_KEY` | yes | `SB-Mid-client-…` | Public client key for the Snap checkout. |
| `MIDTRANS_IS_PRODUCTION` | yes | `false` | `true` ⇒ **live** endpoints (`app.midtrans.com`) + disables the demo credit. Anything else ⇒ **sandbox** (`app.sandbox.midtrans.com`). |
| `TOKEN_PRICE_IDR` | no | `1000` | Price of one token in IDR (whole rupiah). Default `1000`. |

Sandbox and production have **separate key pairs** — don't mix a sandbox key with
`MIDTRANS_IS_PRODUCTION=true`, or the signature check will reject every webhook.

---

## A. Sandbox setup (do this first)

1. **Create/login** at <https://dashboard.sandbox.midtrans.com>.
2. **Copy keys**: Settings → **Access Keys** → copy the Server Key (`SB-Mid-server-…`)
   and Client Key (`SB-Mid-client-…`).
3. **Edit `.env`** on the server:
   ```bash
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxx
   MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxx
   MIDTRANS_IS_PRODUCTION=false
   TOKEN_PRICE_IDR=1000
   ```
4. **Set the Payment Notification URL**: Settings → **Configuration** →
   *Payment Notification URL*:
   ```
   https://<your-domain>/api/tokens/midtrans/notification
   ```
   (nginx already routes `/api/*` to the backend — no extra config. Leave this
   endpoint unauthenticated; it's guarded by Midtrans' signature.)
5. **Restart the backend** so it reads the new env:
   ```bash
   docker compose up -d backend      # or: docker compose up -d
   ```
6. **Verify it's live** (below), then run a test payment (below).

### Local development (no public domain)

Midtrans can't call `localhost`, so expose the backend with a tunnel and use that
URL as the Notification URL:

```bash
ngrok http 3001            # or: cloudflared tunnel --url http://localhost:3001
# Notification URL: https://<random>.ngrok.io/api/tokens/midtrans/notification
```

---

## B. Verify the gateway is detected

- **In the UI:** open the wallet **Top Up** dialog. With Midtrans configured it
  shows a **price in IDR**; without it, it shows *"Instant demo credit"*.
- **Via API:**
  ```bash
  curl -s https://<your-domain>/api/tokens/pricing \
    -H "Authorization: Bearer <a-user-token>"
  # => { "token_price_idr": 1000, "currency": "IDR", "payment_configured": true }
  ```
  `payment_configured: true` means the server key is set.

---

## C. Test a payment (sandbox)

1. **Dashboard → Top Up →** pick an amount → **Pay** → you're redirected to Midtrans.
2. Pay with a **sandbox test card**:
   - Card: `4811 1111 1111 1114`
   - Expiry: any future date (e.g. `12/30`) · CVV: `123`
   - 3‑D Secure / OTP: `112233`
3. You're redirected back to the dashboard. The balance updates **once the
   webhook lands** (usually a few seconds — refresh if needed).
4. Cross-check in the Midtrans dashboard → **Transactions**: the order should be
   *settlement*/*capture*, and your app's `GET /api/tokens/orders/:orderId` should
   report `PAID`.

Other test methods (GoPay, bank transfer, etc.) and their simulators are in the
Midtrans docs; the card above is the quickest smoke test.

---

## D. Going to production

1. Complete Midtrans merchant activation and get **live** keys from
   <https://dashboard.midtrans.com> → Settings → Access Keys.
2. In `.env`:
   ```bash
   MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxxxxxxxxxx
   MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxxxxxxxxxx
   MIDTRANS_IS_PRODUCTION=true
   ```
3. Set the **production** dashboard's Payment Notification URL to the same
   `https://<your-domain>/api/tokens/midtrans/notification` (production and
   sandbox dashboards are configured separately).
4. `docker compose up -d backend` to reload.
5. Run one small real transaction end-to-end before announcing it.

> With `MIDTRANS_IS_PRODUCTION=true`, the no-gateway demo credit **and** demo
> voucher-batch minting are disabled — real money is the only way to get tokens.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Top Up still says "Instant demo credit" | `MIDTRANS_SERVER_KEY` empty or backend not restarted. Check `GET /api/tokens/pricing`. |
| Redirect to Midtrans works, but balance never updates | Webhook not reaching you. Re-check the **Payment Notification URL**, that it's public (not localhost), and backend logs for the incoming POST. |
| Backend logs "Invalid signature" (401) on the webhook | Key/mode mismatch — e.g. sandbox key with `MIDTRANS_IS_PRODUCTION=true`, or the wrong dashboard's Notification URL. |
| "Payment gateway error" on Top Up | Bad/blocked server key, or `MIDTRANS_IS_PRODUCTION` doesn't match the key pair (sandbox key hitting live endpoint or vice-versa). |
| Payment succeeds in Midtrans but order shows `FAILED`/`EXPIRED` in-app | A late/duplicate notification after settlement is ignored by design; the first `PAID` wins and credits once. Confirm the order via `GET /api/tokens/orders/:orderId`. |

## Reference (code)

- Integration: `backend/src/services/payment.service.ts` (Snap create, signature
  verify, idempotent credit).
- Routes: `backend/src/routes/token.routes.ts` — `POST /api/tokens/purchase`,
  `POST /api/tokens/midtrans/notification`, `GET /api/tokens/orders/:orderId`,
  `GET /api/tokens/pricing`.
- Env plumbing: `docker-compose.yml` / `docker-compose.prod.yml` (backend service)
  and `.env.example`.
