# LATO — 10-Minute Demo Script

A timed walkthrough for a live product demo. The goal: show the **full loop** —
a mentor creates an AI assessment, a user takes it and unlocks a premium AI
report, and the mentor sees revenue and analytics update.

### Before you start

- Run the demo seed so dashboards are populated:
  `docker compose exec backend npm run db:seed`
- Have three logins ready (password set by the seed — `password123`):
  - Admin — `admin@lato.demo`
  - Mentor — `mentor@lato.demo` (Sarah Chen — AI Career Coach)
  - User — `user@lato.demo`
- For a true end-to-end AI moment, set `OPENAI_API_KEY` on the backend. Without
  it, AI steps still demo gracefully (clear message / placeholder report) — call
  that out as intentional resilience.
- Open two browser profiles/windows: one for the mentor, one for the user.

---

## Minute 0–1 — The problem

**Talking points:**

- "Experts — coaches, educators, creators — have valuable knowledge but
  struggle to package and sell it."
- "Three pains: building assessments by hand is slow; personalized feedback
  doesn't scale; and there's no simple way to monetize knowledge digitally."
- "LATO solves all three with AI assessments and built-in, token-based
  monetization."

## Minute 1–2 — Landing page

**Show:** the public landing page.

**Talking points:**

- "This is the product. Notice the positioning: turn expertise into AI-powered
  assessments with personalized reports and revenue."
- Scroll through **Features**, **How it works**, and **Pricing** — "free to
  take, premium reports unlocked with tokens."
- Point at the **published assessments with cover images** — "these feel like a
  real marketplace; each one is built by a mentor."

## Minute 2–4 — Mentor creates an AI assessment

**Log in as the mentor** and go to the mentor dashboard.

**Show & talk:**

- "Here's the mentor's world — their assessments, revenue, and analytics."
- Click **Create assessment**. Fill in a title, description, and a **cover image
  URL** (show the live preview).
- Open an assessment and show **AI question generation**: paste some source
  material, generate, and review the structured questions, answers, and
  explanations — "the mentor stays in control; nothing is saved until they
  approve it."
- Show the **knowledge base** field — "this grounds the AI when it writes
  premium reports later."
- Hit **Share Assessment** → **Copy Link** — "publish and share anywhere; no
  sign-up needed to take it."

## Minute 4–6 — User takes the assessment

**Switch to the user window** and open the shared assessment link.

**Show & talk:**

- Answer the questions and submit — "no account required to take it; we capture
  the attempt and can claim it after sign-in."
- Show the **free report**: score card, **level badge**, and summary — "instant
  value, zero friction. This is the top of the funnel."

## Minute 6–8 — Premium AI report unlock

**Stay as the user.**

**Show & talk:**

- Point at the **locked premium section** — "the deep, personalized analysis is
  gated behind tokens."
- Show the **token wallet**, top up if needed (demo top-up), then click
  **Unlock Premium**.
- Reveal the **AI premium report** with its sections — **Overview, Strengths,
  Weaknesses, Recommendations, 30-day Roadmap** — "this is generated from the
  user's answers, their score, and the mentor's knowledge base."
- "That single unlock just generated revenue for the mentor."

## Minute 8–10 — Analytics & business model

**Switch back to the mentor**, then optionally the admin.

**Show & talk:**

- Mentor **Revenue** — "every premium unlock credits the mentor; here's the
  total and the transaction history, updated live."
- Mentor **Analytics** charts — attempts per assessment, revenue over time,
  score distribution, and the **submissions → unlocks conversion funnel**.
- (Optional) **Admin** — user management, token grants, and platform-wide
  growth/revenue analytics.

**Close with the business model:**

- "Free assessments drive acquisition. Premium reports capture value. Mentors
  earn on every unlock — and the token ledger is already built to drop in a real
  payment provider."
- "That's the full loop: create with AI, deliver personalized value, and
  monetize — in one platform."

---

### Backup / fallback tips

- **No AI key?** Frame the clear error / placeholder report as deliberate
  resilience: "AI is optional and fails safe — the product never breaks."
- **Short on time?** The seeded demo already contains assessments, attempts,
  premium unlocks, and revenue — you can skip creation (Minute 2–4) and demo
  from existing data.
