# SPARTA — Self Assessment Platform (MVP)

A platform where mentors create self-assessment tests, users (or guests) take
them, and a score-based report is generated.

This repository currently contains the **Step 1 foundation** only. Feature
work (authentication, assessments, submission, reports, dashboards) is added in
later steps per `DEVELOPMENT_RULES.md`.

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Hono.js + TypeScript (routes → services → db)
- **Database:** PostgreSQL + Drizzle ORM
- **Deployment:** Docker Compose

## Project Structure

```
.
├── docker-compose.yml      # frontend + backend + postgres
├── .env.example            # root env (used by docker-compose)
├── backend/
│   ├── src/
│   │   ├── index.ts        # Hono entrypoint (mounts routes)
│   │   ├── routes/         # HTTP layer (added in later steps)
│   │   ├── services/       # business logic (added in later steps)
│   │   ├── middleware/     # auth/role middleware (added in later steps)
│   │   ├── db/
│   │   │   ├── schema.ts    # Drizzle schema (all tables)
│   │   │   └── client.ts    # DB connection
│   │   └── utils/
│   │       └── response.ts  # { success, data } / { success, message }
│   └── drizzle.config.ts
└── frontend/
    └── src/
        ├── app/            # pages & routing
        ├── components/     # reusable UI
        ├── services/       # API client (api.ts)
        └── lib/            # utils (cn helper)
```

## Running with Docker

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:3001/api/health
- PostgreSQL: localhost:5432

## Database migrations (Drizzle)

Run from `backend/` against a running database:

```bash
cp .env.example .env        # ensure DATABASE_URL is set for local use
npm install
npm run db:generate         # generate SQL migrations from schema.ts
npm run db:migrate          # apply migrations
# or, for quick local iteration:
npm run db:push
```

## Local development (without Docker)

```bash
# backend
cd backend && npm install && npm run dev      # http://localhost:3001

# frontend
cd frontend && npm install && npm run dev     # http://localhost:3000
```

## MVP Design Decisions

- **Response envelope:** every endpoint returns `{ success: true, data }` or
  `{ success: false, message }`.
- **Report thresholds** live on `assessments`
  (`free_report_text`, `low_score_threshold`, `high_score_threshold`) so each
  assessment scores independently. Logic:
  `score < low → low`, `low ≤ score < high → medium`, `score ≥ high → high`.
- **Reports:** `report_type` enum keeps `FREE`/`PREMIUM` for future
  compatibility, but the MVP only generates `FREE` reports (no payment flow).
- **Submission is public:** logged-in users record `attempts.user_id`; guests
  record `attempts.guest_email`.
- **Cascade deletes:** deleting an assessment removes its questions → choices
  and its attempts → reports.
- **Attempt owner display:** show `users.email` when logged in, otherwise
  `guest_email`.

## Documentation

- `PROJECT_REQUIREMENT.md` — product scope & roles
- `ARCHITECTURE.md` — system architecture
- `DATABASE_SCHEMA.md` — data model
- `API_SPEC.md` — REST API contract
- `DEVELOPMENT_RULES.md` — engineering rules & build order
