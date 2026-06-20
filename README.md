# SPARTA — AI Assessment Monetization Platform

> **SPARTA helps mentors, educators, and creators turn their expertise into
> AI-powered assessments with personalized reports and token-based
> monetization.**

|  |  |
|---|---|
| **What** | An AI assessment **monetization platform** |
| **Who** | For **mentors, educators, and coaches** |
| **Why** | To **turn knowledge into scalable digital products** that earn revenue |

SPARTA is a full-stack AI SaaS MVP: a multi-role platform where mentors build
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

SPARTA turns expertise into a productized, AI-assisted assessment with built-in
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

Tokens are the unit of account. The MVP uses a **demo top-up** (no real payment
gateway); the token ledger and mentor revenue accounting are fully implemented
and ready for a real payment integration.

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
| **Assessments** | Mentor-owned tests: config, thresholds, pricing, knowledge base, cover image |
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
| Admin | `admin@sparta.demo` | Platform admin |
| Mentor | `mentor@sparta.demo` | **Sarah Chen — AI Career Coach** |
| User | `user@sparta.demo` | Assessment taker |

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
> skipped and submission is never affected.

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
