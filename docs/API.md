# LATO — API Overview

A high-level map of the REST API. For request/response field details see
[`API_SPEC.md`](../API_SPEC.md); this page is a quick reference to the main
routes and who can call them.

## Conventions

- **Base path:** all routes are under `/api`. In production the frontend calls
  them same-origin through nginx (`/api/...`).
- **Auth:** protected routes require `Authorization: Bearer <JWT>`. Obtain a
  token from `POST /api/auth/login`.
- **Roles:** `Public` (no auth), `User` (any authenticated user), `Mentor`,
  `Admin`.
- **Response envelope:**
  ```jsonc
  { "success": true,  "data": <T> }      // success
  { "success": false, "message": "..." } // error
  ```

---

## Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create an account (defaults to `USER`) |
| POST | `/api/auth/login` | Public | Authenticate, returns a JWT + user |
| GET | `/api/auth/me` | User | Current user profile |

## Assessments

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/assessments` | Public | List published assessments |
| GET | `/api/assessments/:id` | Public | Published assessment detail (no choice scores) |
| POST | `/api/assessments` | Mentor | Create an assessment (starts as `DRAFT`) |
| PATCH | `/api/assessments/:id` | Mentor | Update an owned assessment |
| DELETE | `/api/assessments/:id` | Mentor | Delete an owned assessment |
| PATCH | `/api/assessments/:id/status` | Mentor | Publish / unpublish |
| POST | `/api/assessments/:id/submit` | Public | Submit answers (user or guest) → attempt |

### Questions (mentor authoring)

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/assessments/:id/questions` | Mentor | Add a question + choices |
| PATCH | `/api/questions/:id` | Mentor | Update a question |
| DELETE | `/api/questions/:id` | Mentor | Delete a question |
| GET | `/api/mentor/assessments/:id` | Mentor | Full editing view (questions + scores) |

## Mentor

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/mentor/assessments` | Mentor | Own assessments + attempt counts |
| GET | `/api/mentor/assessments/:id/results` | Mentor | Attempt results for an owned assessment |
| GET | `/api/mentor/stats` | Mentor | Overview stats |
| GET | `/api/mentor/revenue` | Mentor | Token revenue + unlock transactions |
| GET | `/api/mentor/analytics` | Mentor | Chart data (performance, revenue, distribution, funnel) |

## AI

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/mentor/assessments/:id/ai/questions` | Mentor | Generate question **preview** from pasted text (not saved) |

> Premium **report** generation is not a standalone endpoint — it runs
> server-side during a premium unlock (see Reports). AI is server-side only;
> the OpenAI key is never exposed to the client.

## Reports & Attempts

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/attempts/me` | User | The current user's attempts + reports |
| GET | `/api/attempts/:id/report` | User | Free report + premium status for an attempt |
| POST | `/api/attempts/:id/claim` | User | Claim a guest attempt after signing in |
| POST | `/api/reports/:id/unlock` | User | Unlock the premium report (spends tokens, generates AI report) |

## Tokens

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/tokens/me` | User | Current token balance |
| POST | `/api/tokens/topup-demo` | User | Demo top-up (no real payment) |

## Analytics

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/mentor/analytics` | Mentor | Mentor dashboard charts |
| GET | `/api/admin/analytics` | Admin | Platform growth, revenue, activity over time |
| GET | `/api/admin/stats` | Admin | Platform totals |

## Admin

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | List users |
| PATCH | `/api/admin/users/:id/role` | Admin | Change a user's role |
| PATCH | `/api/admin/users/:id/tokens` | Admin | Grant tokens to a user |
| GET | `/api/admin/assessments` | Admin | List all assessments (moderation) |
| PATCH | `/api/admin/assessments/:id` | Admin | Update status / price |
| DELETE | `/api/admin/assessments/:id` | Admin | Delete any assessment |
| GET | `/api/admin/contacts` | Admin | Contact-message inbox |
| PATCH | `/api/admin/contacts/:id/status` | Admin | Update a contact's status |

## Content (Blogs & Contact)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/blogs` | Public | List published blog posts |
| GET | `/api/blogs/:slug` | Public | Blog post by slug |
| POST | `/api/blogs` | Mentor / Admin | Create a blog post |
| PATCH | `/api/blogs/:id` | Mentor / Admin | Update a blog post |
| DELETE | `/api/blogs/:id` | Mentor / Admin | Delete a blog post |
| POST | `/api/contact` | Public | Submit a contact message |

## Health

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness check |
