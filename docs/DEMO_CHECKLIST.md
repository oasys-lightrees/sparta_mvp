# LATO — Demo Checklist

A pre-flight and run-of-show checklist for the live MVP demo. Pair this with the
timed walkthrough in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

> **Prep:** run `npm run db:seed` so every dashboard is populated. Demo logins
> (password set by the seed — `password123`):
> Admin `admin@lato.demo` · Mentor `mentor@lato.demo` (Sarah Chen) ·
> User `user@lato.demo`.

---

## Before the presentation

**Environment**

- [ ] Website loads
- [ ] HTTPS working (padlock, no mixed-content warnings)
- [ ] Login works
- [ ] OpenAI key active (AI question generation + premium reports respond)

**Data & accounts**

- [ ] Demo seed has been run; mentor/admin dashboards show data (not empty)
- [ ] Admin, mentor, and user logins all succeed
- [ ] Two browser windows/profiles ready (one mentor, one user)

---

## Mentor demo

- [ ] Login mentor (`mentor@lato.demo`)
- [ ] View analytics dashboard (assessments, revenue, charts populated)
- [ ] Create assessment
- [ ] Add knowledge (base knowledge field)
- [ ] Generate AI questions (review the AI draft)
- [ ] Publish assessment (copy the share link)

## User demo

- [ ] Open assessment (via the shared public link)
- [ ] Submit answers
- [ ] Receive free report (score + level + summary)
- [ ] Unlock premium report (top up tokens if needed, then unlock)

## Admin demo

- [ ] View users
- [ ] Grant tokens to a user
- [ ] View analytics (platform growth, revenue, activity)

---

## Recovery plan

If something fails live, switch to a pre-captured asset and keep narrating.
Capture these screenshots in advance (see [`images/`](images/)).

| If this fails… | Do this instead |
|---|---|
| **OpenAI API fails / slow** | The app fails safe — AI endpoints show a clear message and premium unlock falls back to a placeholder report. Frame it as deliberate resilience ("AI is optional; the product never breaks"), then show `ai-generation.png` and the seeded premium report (which already has full Overview/Strengths/Weaknesses/Recommendations/Roadmap sections). |
| **Internet / website unreachable** | Run locally (`docker compose up`) as a fallback, or present from the screenshots: `landing.png`, `mentor-dashboard.png`, `assessment-builder.png`, `ai-generation.png`, `user-report.png`, `admin-dashboard.png`. |
| **Demo account / login issue** | Re-run `npm run db:seed` to reset the demo accounts and data, or use a second pre-prepared account. As a last resort, present the flow from the screenshots above. |
| **Premium unlock blocked (no tokens)** | Use the demo **Top Up** on the user wallet, or grant tokens from the admin dashboard, then unlock. |

**Golden rule:** keep talking through the story (create → take → unlock →
monetize). The narrative matters more than any single click.
