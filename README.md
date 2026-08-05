# LATO — AI Assessment Monetization Platform

> **LATO helps mentors, educators, and creators turn their expertise into
> AI-powered assessments with personalized reports and token-based
> monetization.**

|  |  |
|---|---|
| **What** | An AI assessment **monetization platform** |
| **Who** | For **mentors, educators, and coaches** |
| **Why** | To **turn knowledge into scalable digital products** that earn revenue |

LATO is a full-stack AI SaaS MVP: a multi-role platform where mentors build
assessments (optionally with AI-generated questions), users take them and
receive an instant free report, and a deeper **AI-personalized premium report**
can be unlocked with tokens — generating revenue for the mentor.

---

## Problem

Subject-matter experts — coaches, educators, and creators — struggle to package
and sell what they know:

- **Building assessments is manual and slow.** Writing good questions, scoring
  rules, and feedback by hand takes hours per assessment.
- **Personalized feedback doesn't scale.** Tailored, high-quality feedback for
  every respondent is exactly what people will pay for, yet it's the hardest
  thing to deliver at volume.
- **Monetizing knowledge digitally is hard.** Most experts have no simple way to
  turn an assessment into recurring, measurable income.

## Solution

LATO turns expertise into a productized, AI-assisted assessment with built-in
monetization:

```
MENTOR                         USER                          MENTOR
──────                         ────                          ──────
Create assessment              Take assessment               Earn token revenue
      ↓                              ↓                        from every premium
Generate questions with AI     Receive free report           unlock
      ↓                              ↓
Publish                        Unlock premium AI insights
```

- Mentors create an assessment, optionally **generate questions with AI** from
  their own knowledge, and publish a shareable link.
- Users take the assessment (no sign-up required to take it) and get an
  **instant free report** with a score and level.
- Users **unlock an AI-personalized premium report** with tokens.
- Mentors **earn token revenue** on every premium unlock and track it on a
  revenue + analytics dashboard.

---

## Features

### 🧑‍🏫 Mentor

- **Assessment management** — create, edit, publish/unpublish, and delete
  assessments, with a shareable public link and cover images.
- **AI question generation** — paste source material and let AI draft scored
  questions, answers, and explanations to review before saving.
- **Knowledge base input** — attach subject "base knowledge" that grounds the AI
  when generating premium reports.
- **AI premium report generation** — each unlock produces a tailored report from
  the user's answers, score, and the mentor's knowledge.
- **Learning resources** — curate a per-result library of study materials
  (video · PDF · article · file · link · course), each marked free or
  premium-gated and targeted at a specific result profile or shared across all
  results, from a dedicated editor in the assessment builder.
- **Revenue tracking** — total token revenue and a per-unlock transaction
  history.
- **Analytics dashboard** — attempts per assessment, revenue over time, score
  distribution, and a submissions → unlocks conversion funnel (charts).

### 🙋 User

- **Take assessments** — any published assessment, free, no account required to
  take it.
- **Free reports** — instant score, level badge (Beginner / Intermediate /
  Advanced), and summary.
- **Premium reports** — unlock an AI-personalized deep-dive
  (Overview / Strengths / Weaknesses / Recommendations / Roadmap).
- **Learning resources** — a dedicated section on the report showing study
  materials matched to the result you got; free resources appear immediately and
  premium ones are revealed once the report is unlocked.
- **Token wallet** — view balance, top up (demo), and spend tokens to unlock
  premium reports.

### 🛡️ Admin

- **User management** — list users and change roles (USER / MENTOR / ADMIN).
- **Token grants** — credit tokens to any user.
- **Platform analytics** — totals and growth, revenue overview, and activity
  over time, plus assessment moderation and a contact-message inbox.

---

## AI Features

AI runs **server-side only** via the OpenAI API. Both features degrade
gracefully when no API key is configured.

### Question Generation

| Input | Output |
|---|---|
| Mentor knowledge / pasted content | Structured questions, scored answer choices, and per-question explanations |

The mentor reviews the AI's draft and saves it explicitly — nothing is inserted
automatically.

### Report Generation

| Inputs | Output |
|---|---|
| User answers · score · assessment knowledge base · mentor context | A personalized AI report with Overview, Strengths, Weaknesses, Recommendations, and a 30-day roadmap |

---

## Monetization Model

| Layer | Purpose |
|---|---|
| **Free assessment** | Top of funnel — user acquisition, zero friction to take |
| **Premium report** | Value capture — unlocked with tokens |
| **Mentor revenue** | Each premium unlock credits the assessment's mentor, tracked on their dashboard |

Tokens are the unit of account. Token purchases go through **Midtrans** (Snap):
the backend creates an order, hands the browser off to Midtrans' hosted
checkout, and credits the wallet from a signed server-to-server notification
(webhook) exactly once. When `MIDTRANS_SERVER_KEY` is not configured the app
degrades gracefully to an instant **demo top-up**, so local dev and the MVP demo
keep working. The token ledger and mentor revenue accounting are fully
implemented.

### Access model (per assessment)

Each assessment declares how it gates **starting**, configured by the mentor and
enforced server-side (guests can't slip past it). The mode is driven by a single
policy table (`backend/src/config/access.ts`) — nothing branches on the mode
string directly:

| Mode | Start | Result |
|---|---|---|
| **FREE** | Anyone, immediately | Fully free |
| **FREEMIUM** | Anyone, immediately | Free report; premium unlockable with tokens |
| **PAID** | Purchase access first (tokens) | Full result included |
| **VOUCHER** | Redeem a valid voucher first | Full result included |

Backward compatible: assessments with no mode set behave as **FREEMIUM** — the
platform's original "take free, unlock premium" flow. PAID access is bought with
the existing token wallet (funded by Midtrans or the demo top-up), crediting the
mentor; VOUCHER access is granted by the existing voucher redemption. The
landing CTA and the start flow adapt to the mode, and the backend blocks
`submit` for anyone without a grant.

### Study video reward

Each assessment can carry a mentor-provided **study video URL** (YouTube, Vimeo,
or a direct link). After a taker unlocks the premium report, the video is
revealed alongside it as a training resource. The URL is only exposed once
premium is unlocked, so it never leaks to non-purchasers.

### Learning resources (per result profile)

Beyond the single study video, each assessment can carry a configuration-driven
**learning-resources library** attached to its result profiles. A resource is a
`{ type, title, url, description, access }` record where `type` is one of
`video · pdf · article · file · link · course` (extensible — new kinds are
additive) and `access` is `free` (shown on the result) or `premium` (unlocked
with the report). Resources are keyed per result **profile** — a personality
result-category code, or a skill level (`Beginner`/`Intermediate`/`Advanced`) —
plus a `shared` bucket shown for every result, so a taker sees materials matched
to the result they actually got. The document lives on the assessment
(`learning_resources` JSON) next to the other presentation config; mentors curate
it from a dedicated editor in the assessment form, and the report resolves the
visible set server-side (premium URLs are never sent while locked). Videos accept
external URLs (YouTube/Vimeo, embedded) or direct file URLs (uploaded/hosted,
played natively), with optional `provider`, `thumbnail` and `duration` metadata.

For **personality assessments** this becomes a personalized learning path: each
result profile (e.g. the DISC `D`/`I`/`S`/`C` styles) has its own independent
resource library, the mentor editor organizes resources per result, and the
taker sees a grouped path (Videos → Downloads → Articles → Courses → Links)
headed by their result. When a profile has no resources it falls back to the
shared set, so existing assessments keep working with no migration.

---

## Architecture

```
            Browser
               │
          Cloudflare        (DNS + CDN + SSL)
               │
         nginx (HTTPS)      (TLS termination, reverse proxy)
            │       │
            │       └────────────┐
   Next.js Frontend          Hono API  ───────────►  OpenAI API
       (:3000)                (:3001)                (AI features)
                                  │
                              PostgreSQL
                                (:5432)
```

- TLS is terminated **only** at nginx. The Next.js and Hono apps speak plain
  HTTP internally — no SSL code lives in the application.
- The frontend calls the API same-origin through nginx (`/api/*`).
- OpenAI is reached **only** from the backend; the key is never exposed to the
  browser.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full technical
breakdown.

---

## Tech Stack

**Frontend**
- Next.js (App Router) · React · TypeScript · Tailwind CSS · Recharts

**Backend**
- Hono.js · TypeScript · PostgreSQL · Drizzle ORM · JWT auth

**AI**
- OpenAI API (direct REST, server-side)

**Infrastructure**
- Docker Compose · AWS EC2 · nginx · Let's Encrypt · Cloudflare

---

## Database Overview

| Entity | Purpose |
|---|---|
| **Users** | Accounts with a role (USER / MENTOR / ADMIN) and a token balance |
| **Assessments** | Mentor-owned tests: config, thresholds, pricing, knowledge base, cover image, study video + learning resources |
| **Questions** | Multiple-choice questions belonging to an assessment (+ scored choices) |
| **Attempts** | A submitted assessment (logged-in user or guest) with a total score |
| **Reports** | Generated result for an attempt — `FREE` or `PREMIUM` |
| **Tokens** | Per-user wallet balance used to unlock premium reports |
| **Transactions** | Token ledger: top-ups, admin grants, and premium-unlock revenue |

Full schema and relationships: [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

---

## Screenshots

> Screenshots live in [`docs/images/`](docs/images/). Add `.png` files with the
> names below to populate this section.

| View | Image |
|---|---|
| Landing page | `![Landing Page](docs/images/landing.png)` |
| Mentor dashboard | `![Mentor Dashboard](docs/images/mentor-dashboard.png)` |
| Assessment builder | `![Assessment Builder](docs/images/assessment-builder.png)` |
| AI question generation | `![AI Generation](docs/images/ai-generation.png)` |
| User report | `![User Report](docs/images/user-report.png)` |
| Admin dashboard | `![Admin Dashboard](docs/images/admin-dashboard.png)` |

---

## Demo Accounts

The demo seed creates ready-to-use accounts. **Password for all demo accounts is
set by the seed script** (`password123` — demo only, not a production secret).

| Role | Email | Persona |
|---|---|---|
| Admin | `admin@lato.demo` | Platform admin |
| Mentor | `mentor@lato.demo` | **Sarah Chen — AI Career Coach** |
| User | `user@lato.demo` | Assessment taker |

> Sarah Chen owns all three demo assessments (AI Engineer Readiness, Leadership
> Potential, Sales Skill). The seed also adds several named users with
> assessment history, premium unlocks, token transactions, and revenue so the
> mentor and admin dashboards **never look empty**.

---

## Local Development

**Prerequisites:** Docker + Docker Compose (or Node 20 + a local PostgreSQL).

### With Docker Compose

```bash
# 1. configure environment
cp .env.example .env            # adjust secrets if you like

# 2. build + start (frontend, backend, postgres)
docker compose up --build -d

# 3. apply the database schema
docker compose exec backend npm run db:migrate

# 4. (optional) load demo content
docker compose exec backend npm run db:seed
```

- Frontend: <http://localhost:3000>
- Backend health: <http://localhost:3001/api/health>
- PostgreSQL: `localhost:5433` (container port `5432`)

### Without Docker

```bash
# backend
cd backend && npm install
cp .env.example .env             # ensure DATABASE_URL points at your Postgres
npm run db:migrate               # apply schema
npm run db:seed                  # optional demo data
npm run dev                      # http://localhost:3001

# frontend (separate terminal)
cd frontend && npm install
cp .env.example .env             # NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev                      # http://localhost:3000
```

> AI features need `OPENAI_API_KEY` set on the backend. Without it the app still
> runs — AI endpoints return a clear error and premium unlock falls back to a
> placeholder. Email needs `SMTP_HOST`; without it, result emails are cleanly
> skipped and submission is never affected. Real token payments need
> `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` (and the gateway's notification
> URL pointed at `POST /api/tokens/midtrans/notification`); without them, token
> purchase falls back to an instant demo credit.

---

## Production Deployment

Full production guide (AWS EC2 + Docker Compose + nginx + Let's Encrypt +
Cloudflare, with an HTTPS reverse proxy and a security checklist):

➡️ **[`DEPLOYMENT.md`](DEPLOYMENT.md)**

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design & technical decisions
- [`docs/API.md`](docs/API.md) — high-level REST API overview
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — 10-minute live demo walkthrough
- [`docs/DEMO_CHECKLIST.md`](docs/DEMO_CHECKLIST.md) — pre-flight demo checklist & recovery plan
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — production deployment guide
- [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — data model
- [`API_SPEC.md`](API_SPEC.md) — detailed endpoint contract
- [`PROJECT_REQUIREMENT.md`](PROJECT_REQUIREMENT.md) — product scope & roles
- [`DEVELOPMENT_RULES.md`](DEVELOPMENT_RULES.md) — engineering rules & build order
