# LATO — Architecture

This document explains how LATO is built and the reasoning behind the key
technical decisions. It complements the root [`README.md`](../README.md) (product
view), [`DATABASE_SCHEMA.md`](../DATABASE_SCHEMA.md) (data model), and
[`DEPLOYMENT.md`](../DEPLOYMENT.md) (operations).

---

## System Overview

LATO is a three-tier web application with an AI integration:

```
            Browser
               │
          Cloudflare        (DNS + CDN + SSL)
               │
         nginx (HTTPS)      (TLS termination, reverse proxy)
            │       │
            │       └────────────┐
   Next.js Frontend          Hono API  ───────────►  OpenAI API
       (:3000)                (:3001)                (AI, server-side only)
                                  │
                              PostgreSQL
                                (:5432)
```

- **Frontend** — Next.js (App Router) + React + TypeScript + Tailwind. Renders
  the UI and talks to the API through a single typed API client. Pages never
  call `fetch` directly; they go through `services/*.api.ts`.
- **Backend** — Hono.js + TypeScript, organized as **routes → services → db**.
  Routes handle HTTP and validation only; services hold business logic; the db
  layer (Drizzle ORM) owns the schema and queries.
- **Database** — PostgreSQL accessed via Drizzle ORM with SQL migrations.
- **AI** — OpenAI REST API, called exclusively from the backend.

### Request Flow

```
Frontend (page → services/*.api.ts)
        ↓  HTTPS, JSON, Bearer token
API route (HTTP + validation)
        ↓
Service layer (business logic)
        ↓
Database (Drizzle / PostgreSQL)
```

Every endpoint returns a consistent envelope:

```jsonc
{ "success": true,  "data": <T> }      // success
{ "success": false, "message": "..." } // error
```

This keeps the frontend client simple: one place unwraps `data` or throws on
`message`.

---

## Authentication & Authorization

- **JWT (Bearer).** On login the backend issues a signed JWT (HS256). The
  frontend stores it in `localStorage` and sends it as
  `Authorization: Bearer <token>`. Passwords are hashed with bcrypt.
- **RBAC.** Three roles gate access via middleware:

  | Role | Capabilities |
  |---|---|
  | `ADMIN` | User management, token grants, platform analytics, moderation |
  | `MENTOR` | Own assessments, AI tools, results, revenue & analytics |
  | `USER` | Take assessments, view reports, manage token wallet |

  `authMiddleware` verifies the token and loads the user; `requireRole(...)`
  enforces the allowed roles per route. New registrations default to `USER`;
  elevated roles are granted by an admin.

- **Public endpoints.** Taking an assessment requires no account — submissions
  record either `attempts.user_id` (logged in) or `attempts.guest_email`
  (guest). A guest can later **claim** their attempt after signing in to view
  the report.

> **Future hardening (documented, not implemented):** moving the JWT to an
> `httpOnly`, `Secure`, `SameSite` cookie plus CSRF mitigation. See
> [`DEPLOYMENT.md`](../DEPLOYMENT.md) §6.

---

## AI Architecture

### Why direct OpenAI REST (no framework)

The backend calls the OpenAI REST API directly with `fetch` rather than using an
agent framework or orchestration library. For this MVP that is deliberate:

- **Simplicity.** Two well-scoped calls (question generation, report
  generation). A framework would add dependencies and indirection without
  buying anything.
- **Production control.** Direct calls make the timeout, retries, prompts, and
  response parsing explicit and easy to reason about and log.
- **No unnecessary abstraction.** Less surface area to break or audit; the AI
  code stays small and readable in one service.

### Reliability

All AI work is isolated in a single service with three safeguards:

- **Timeout.** Requests use an `AbortController` with a fixed timeout so a slow
  or hung OpenAI call can never block a request indefinitely.
- **Validation.** Responses are parsed and validated (expected JSON shape /
  required sections) before use; malformed output is rejected.
- **Fallback handling.** AI is opt-in per assessment and only used when an API
  key is configured. If generation fails, premium unlock falls back to a
  placeholder report so **token accounting and the user flow always complete**.
  When no key is set, AI endpoints return a clear, explicit error and the rest
  of the app is unaffected.

The OpenAI key is **backend-only** and never sent to the browser. Model and base
URL are configurable (`OPENAI_MODEL`, `OPENAI_BASE_URL`) for OpenAI-compatible
proxies.

---

## Database Design

PostgreSQL with Drizzle ORM. Major tables:

| Table | Role | Notable fields |
|---|---|---|
| `users` | Accounts | `role`, `token_balance`, hashed password |
| `assessments` | Mentor-owned tests | thresholds, `price`, `premium_token_cost`, `base_knowledge`, `ai_enabled`, `image_url` |
| `questions` / `choices` | Test content | choice `score` (never exposed publicly) |
| `attempts` | A submission | `user_id` **or** `guest_email`, `total_score` |
| `reports` | Result per attempt | `report_type` = `FREE` \| `PREMIUM`, `content` |
| `transactions` | Token ledger | `type` = `TOKEN_TOPUP` \| `PREMIUM_UNLOCK` \| `ADMIN_GRANT`, `mentor_id` for revenue |

Design notes:

- **Per-assessment scoring.** Thresholds live on `assessments` so each test
  scores independently (different question counts → different ranges).
- **Choice scores stay private.** Public assessment endpoints never return
  `choices.score`.
- **Cascade deletes.** Deleting an assessment removes its questions → choices and
  attempts → reports.
- **Revenue from the ledger.** Mentor revenue is derived from `PREMIUM_UNLOCK`
  transactions crediting that mentor — no separate balance to keep in sync.
- **Additive migrations only.** Schema changes ship as new numbered migrations;
  existing migrations are never edited.

---

## Deployment

- **Docker Compose** runs three services: `frontend`, `backend`, and
  `database` (PostgreSQL with a named volume for persistence).
- **nginx reverse proxy** routes `/api/*` → backend and everything else →
  frontend, and **terminates HTTPS** (Let's Encrypt certificates). Applications
  speak plain HTTP internally; there is no TLS code in the app.
- **HTTPS termination & CDN.** Cloudflare fronts the origin in **Full (strict)**
  mode; nginx holds the real Let's Encrypt certificate. Only ports **80** and
  **443** are public; app ports (3000/3001) and Postgres (5433) stay closed.
- **Build-time config.** `NEXT_PUBLIC_API_URL` is inlined into the frontend
  bundle at build time, so it is passed as a Docker build arg — runtime env is
  too late for the browser.

Full step-by-step: [`DEPLOYMENT.md`](../DEPLOYMENT.md).

---

## Future Improvements

- **Real payment integration** — replace the demo top-up with Stripe (or
  similar) to buy tokens; the ledger and revenue accounting are already in
  place.
- **File uploads** — first-class image/asset uploads (e.g. S3) instead of
  URL-only cover images.
- **Async workers** — move AI generation to a background job queue so unlocks
  return instantly and long generations don't tie up requests.
- **Email queues** — durable, retryable delivery of result emails via a queue
  instead of best-effort fire-and-forget.
- **Advanced analytics** — cohort retention, funnel breakdowns, and per-mentor
  benchmarking beyond the current dashboards.
