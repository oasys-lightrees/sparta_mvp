# LATO — App Overview (context brief for brainstorming)

> This document is a self-contained briefing. It is written so that an AI (or a
> person) with **no access to the codebase** can understand what LATO is, how
> it works, what is actually built, and where the open questions are — enough to
> brainstorm product and technical ideas. Where something is a demo/stub vs.
> fully built, that is called out explicitly.

---

## 1. One-paragraph summary

**LATO is an AI-powered assessment *monetization* platform.** Mentors,
educators, and coaches create online assessments (quizzes / diagnostics),
optionally using AI to generate the questions. People take those assessments for
free and get an instant results report. They can then spend **tokens** to unlock
a deeper, **AI-personalized premium report** (and a mentor-provided study video).
Each premium unlock earns revenue for the mentor who created the assessment. The
product's branding is a "Assessment Academy" / self-improvement theme ("Know
yourself. Train your potential. Become stronger.").

The core idea: **turn subject-matter expertise into a productized, AI-assisted
assessment with built-in monetization.**

---

## 2. Who it's for (the three roles)

The system has three user roles. Every account defaults to **USER**; MENTOR and
ADMIN are granted by an admin.

| Role | What they do |
|---|---|
| **USER** (taker / "student") | Takes published assessments (no signup required to take one). Gets a free report. Buys tokens and spends them to unlock premium reports + study videos. Has a token wallet and a personal dashboard of their attempts. |
| **MENTOR** (creator) | Builds and publishes assessments, optionally generating questions with AI. Sets pricing (token cost of the premium report). Attaches "base knowledge" that grounds the AI, and a study-video URL. Earns token revenue on every premium unlock. Has a dashboard with revenue + analytics charts. |
| **ADMIN** (platform operator) | Manages users and roles, grants tokens, moderates assessments, reads the contact-form inbox, and sees platform-wide analytics. |

---

## 3. The core user journey

```
MENTOR                          USER (taker)                    MENTOR
──────                          ────────────                    ──────
Create assessment          →    Take assessment (free)     →    Earns token revenue
  (optionally AI-generate        Get instant FREE report          on every premium
   the questions)                     ↓                           unlock
Set premium token price         Spend tokens to UNLOCK
Attach study video URL          the PREMIUM AI report
Publish → shareable link             ↓
                                Watch the study video
                                (revealed after unlock)
```

Key nuances:
- **Taking an assessment requires no account.** A guest provides an email; the
  attempt can later be "claimed" by a logged-in user.
- The **free report** is generated instantly and deterministically (no AI needed).
- The **premium report** is AI-generated per attempt, grounded in the taker's
  actual answers and the mentor's knowledge base.
- The **study video** (a mentor-provided YouTube/Vimeo/direct URL) is only
  revealed *after* the premium report is unlocked — it never leaks to
  non-purchasers.

---

## 4. Two kinds of assessment (two scoring engines)

This is central to the product. An assessment is one of two modes, decided by
its configuration:

### A. Skill / exam mode (score-based)
- Each answer choice carries a hidden **score**. The taker's total is the sum.
- Thresholds (`low`, `high`) band the score into **Beginner / Intermediate /
  Advanced**.
- Used for "how good are you at X" tests.

### B. Personality / diagnostic mode (category-based)
- Instead of a right/wrong score, each choice maps to a **result category**
  (e.g. a personality type, a working style).
- The taker's **dominant category** (the one their answers point to most) is the
  result. The AI report describes their *type* and never uses correct/wrong
  language.
- Two sub-variants exist:
  - **Legacy position-counting:** counts how often each answer position (A/B/C…)
    was chosen.
  - **Psychometric answer-key (preferred):** each choice explicitly maps to one
    or more category codes; the winning category has the highest total.

The mentor picks the mode when building the assessment. The engine choice is
data-driven (presence of "result categories" config switches to mode B).

---

## 5. AI features

AI runs **server-side only** (the API key never reaches the browser), via direct
REST calls to the **OpenAI API** (default model `gpt-5-mini`; no SDK/framework).
Both features **degrade gracefully** — if no API key is configured, the app still
runs and returns a clear message / placeholder.

1. **Question generation.** A mentor pastes source material; the AI drafts
   structured multiple-choice questions (with scored/ mapped answer choices and
   explanations). The mentor reviews and explicitly saves — nothing is inserted
   automatically.
2. **Premium report generation.** On unlock, the AI writes a personalized
   markdown report. For skill assessments it grounds the analysis in
   per-question evidence (the taker's answer vs. the best answer). For
   personality assessments it describes the dominant type. Sections differ by
   mode (e.g. Overview / Strengths / Weaknesses / Recommendations / 30-Day
   Roadmap for skill; Personality Overview / Strengths / Blind Spots / Growth /
   Action Roadmap for diagnostic).

Reports are generated in the attempt's language (English or Indonesian).

---

## 6. Monetization & tokens

**Tokens** are the internal unit of account.

- A user's wallet has a token balance.
- Unlocking an assessment's premium report costs `premiumTokenCost` tokens.
- On unlock, the tokens are debited from the user and the transaction is recorded
  crediting the **mentor** who owns the assessment (this is how mentors "earn").
- A ledger records every movement: `TOKEN_TOPUP`, `PREMIUM_UNLOCK`,
  `ADMIN_GRANT`.

### How users get tokens
- **Real payment: Midtrans (Snap).** The backend creates an order, sends the
  browser to Midtrans' hosted checkout, and credits the wallet from a
  signature-verified server-to-server webhook (idempotent — credited exactly
  once). Configurable price per token in IDR.
- **Demo fallback.** If Midtrans keys are not configured, "buying" tokens
  instantly credits the wallet with no real payment. This keeps local dev and
  demos working. **Whether real payment is active depends on deployment config**
  (`MIDTRANS_SERVER_KEY` present or not).

> There is **no real-money checkout for the premium report itself** — the report
> is always paid for in tokens. Money only (optionally) enters when *buying
> tokens*. Mentor "revenue" is currently measured in tokens, not cash payout.

---

## 7. What's built vs. what's demo/stub (be precise)

**Fully implemented:**
- All three role dashboards (user / mentor / admin) and auth (JWT).
- Both scoring engines (skill + personality, incl. psychometric answer keys).
- Free + AI premium report generation, with per-question evidence grounding.
- Token wallet, premium unlock, mentor revenue accounting, full ledger.
- Real Midtrans payment integration (order → checkout → webhook → credit).
- Study-video-after-unlock.
- English / Bahasa Indonesia localization throughout (incl. AI prompts).
- Result emails via SMTP (best-effort, optional).
- Marketing landing page with a blog section and a contact form.
- Analytics charts (attempts, revenue over time, score distribution, conversion
  funnel).
- Containerized production deployment (Docker Compose + nginx + certbot/Let's
  Encrypt, optional Cloudflare).

**Demo / stub / not present:**
- **Payment is demo-mode unless Midtrans keys are configured** in the deployment.
- **No cash payout to mentors** — mentor earnings are token/analytics only; there
  is no real payment gateway that moves money *to* mentors.
- **No automated tests** (there is a TypeScript typecheck, but no unit/integration
  test suite).
- **No file uploads** — images and study videos are URL-based only.
- Token top-up price/packages are simple (a per-token IDR price), not a
  productized pricing/packaging system.

---

## 8. Data model (entities)

- **users** — account, role (USER/MENTOR/ADMIN), token balance.
- **assessments** — mentor-owned test config: title, description, cover image URL,
  status (DRAFT/PUBLISHED), score thresholds, report templates, base knowledge
  (grounds the AI), AI on/off, result-category config (for personality mode),
  premium token cost, and study-video URL.
- **questions** + **choices** — multiple-choice questions; each choice has a
  hidden score and/or category-code mapping.
- **attempts** — a submitted assessment (by a logged-in user or a guest email).
  Stores a **self-contained snapshot** of the answers + result, so reports stay
  historically accurate even if the mentor later edits/deletes questions.
- **reports** — the generated result for an attempt: `FREE` or `PREMIUM`.
- **transactions** — the token ledger (top-ups, admin grants, premium unlocks).
- **token_orders** — Midtrans payment orders (PENDING → PAID/FAILED/EXPIRED).
- **blogs** — marketing articles on the landing page.
- **contacts** — landing-page contact-form submissions (admin inbox).

---

## 9. Technical architecture (high level)

```
Browser
  │ (HTTPS)
Cloudflare (optional)  →  nginx (TLS termination, reverse proxy)
                              │  /        → Next.js frontend (:3000)
                              │  /api/*   → Hono.js backend  (:3001)
                                              │
                                              ├─ PostgreSQL (Drizzle ORM)
                                              ├─ OpenAI API  (AI, server-side only)
                                              └─ Midtrans    (payments, server-side)
```

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS,
  shadcn/ui components, Recharts for charts.
- **Backend:** Hono.js (TypeScript) with a clean layered structure —
  routes → services (business logic) → Drizzle ORM → PostgreSQL. JWT auth
  (bcrypt password hashing). Direct REST integrations to OpenAI and Midtrans (no
  SDKs). nodemailer for email.
- **Auth model:** backend issues a JWT (Bearer); the frontend stores it in
  `localStorage` and sends it in the `Authorization` header. No cookies.
- **Deployment:** Docker Compose. Production overlay adds containerized nginx +
  certbot; a single `DOMAIN` env var drives the TLS cert, nginx config, CORS
  allowlist, and the frontend's API base URL (nothing domain-specific is
  hardcoded). All external integrations (AI, email, payments) are optional and
  fail gracefully when unconfigured.

---

## 10. Guiding principles baked into the build

- **Simple, maintainable MVP** — avoid unnecessary complexity; consistent
  feature flow (frontend component → API service → route → business service →
  DB).
- **Graceful degradation** — the app runs even if AI, email, or payments are not
  configured.
- **Server-side secrets** — OpenAI and Midtrans keys never reach the browser.
- **Historical accuracy** — attempts snapshot their data so past reports don't
  change when mentors edit content.
- **Scores are private** — answer scores/keys are never exposed to takers.

---

## 11. Open questions & areas ripe for brainstorming

These are *not* decided — good territory for ideation:

- **Real mentor payouts.** Today mentors earn tokens/analytics only. How should
  cash actually reach mentors (payout rails, fees, thresholds, tax)?
- **Pricing & packaging.** Token bundles, subscriptions, per-assessment pricing,
  free-tier limits, promotions.
- **Growth loops.** The funnel is take-free → unlock-premium. What drives
  acquisition and virality (shareable results, referrals, embeddable widgets)?
- **Trust & quality.** How to ensure AI-generated questions/reports are accurate
  and safe; mentor verification; content moderation at scale.
- **Retention.** Repeat assessments, progress tracking over time, cohorts,
  reminders, learning paths beyond a single study video.
- **Analytics depth.** Page-view tracking (currently the funnel starts at
  submissions), richer mentor insight, A/B testing report formats.
- **Marketplace dynamics.** Discovery of assessments, categories, ratings,
  featured mentors.
- **Internationalization / market fit.** Currently EN + Bahasa Indonesia and
  Midtrans (Indonesia-focused). Expansion implies more languages and gateways.
- **Testing & reliability.** No automated tests yet; what's the right coverage
  strategy for the scoring engines, payment webhook, and AI fallbacks.
- **Data & privacy.** Guest emails, report retention, GDPR-style controls.

---

## 12. Glossary (quick reference)

- **Assessment** — a mentor-created test (skill or personality mode).
- **Attempt** — one submission of an assessment by a user/guest.
- **Free report** — instant, deterministic result (score + level, or dominant
  type).
- **Premium report** — AI-personalized deep-dive, unlocked with tokens.
- **Study video** — mentor-provided video revealed after premium unlock.
- **Token** — internal currency; buys premium unlocks; earned by mentors.
- **Category engine** — the personality/diagnostic scoring path.
- **Base knowledge** — mentor-authored context that grounds the AI.
- **Midtrans** — the (Indonesian) payment gateway for buying tokens.
