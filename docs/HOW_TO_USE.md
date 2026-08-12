# LATO — How to Use

A practical, task‑oriented guide to running LATO. This is **not** a deployment
guide — it assumes the platform is already running and reachable in a browser.

For a complete reference of every screen and setting, see the
[**User Manual**](./USER_MANUAL.md).

---

## 1. What LATO is

LATO turns a single assessment into its own **branded mini‑site**: a landing
page, a take‑the‑test flow, paid access, team vouchers, personalized result
reports, and a dashboard — all themed to the expert's brand.

There are four kinds of people who use it:

| Role | What they do |
|------|--------------|
| **Expert** | Builds and sells assessments, sees results, earns revenue. |
| **Taker** | Takes an assessment, gets a personalized report. |
| **Company / HR buyer** | Buys voucher codes in bulk, hands them out, sees the team's results. |
| **Admin** | Oversees the platform and sets platform fees. |

Money is a **wallet balance in Indonesian Rupiah (IDR)**. Users top up their
wallet (via Midtrans), and paid actions — buying assessment access or a voucher
package — spend from that balance. There are no "tokens."

---

## 2. Quick start for an Expert

> Goal: create an assessment, price it, publish it, and share the link.

1. **Sign in** and open the **Expert Dashboard** (`/mentor`). If you don't have
   an account yet, register first, then have an admin grant you the expert role.
2. Click **Create assessment**.
3. **Choose the type:**
   - **Skill Assessment** — scored (right/wrong answers, score thresholds).
   - **Personality Assessment** — categorized (each answer maps to a result
     type; there is no score).
4. Fill in the **title, description, cover photo**, and — for personality —
   define the **result categories** (a short code, a name, and the knowledge
   shown for that result). For skill, set the **low/high score thresholds**.
5. Save. You're taken to the **Manage** page, which has a left sidebar:
   **Details · Questions · Product & pricing · Landing page · Share · Results**.
6. **Questions:** add each question and its choices. For a personality
   assessment, map each choice to one or more result categories. For a skill
   assessment, give each choice a score.
7. **Product & pricing:** create pricing tiers (cards on the landing page).
   Each tier is **Free**, **Paid**, or **Voucher**:
   - A **Paid** tier is bought on its own at its own price and can carry its own
     **bonus content** (videos/text unlocked on the result page).
   - A **Voucher** tier lets a taker redeem a company code.
   - Optionally add **company voucher packages** (bulk seat packages) and an
     image for each.
8. **Landing page:** customize the brand (name, logo, colors), the hero, and
   optional **About**, **Benefits**, and **Contact (WhatsApp)** sections.
9. **Publish** (top‑right on the Manage page). This makes the branded landing
   page live.
10. **Share:** copy the public link from the **Share** tab and send it out.
11. Watch **Results**, **Analytics**, and **Revenue** fill in as people take it.

---

## 3. Quick start for a Taker

> Goal: take an assessment and get a report.

1. Open the expert's **share link** (the branded landing page).
2. Click the call‑to‑action to **start**.
3. If the assessment has an **opening video**, it plays on the intro screen —
   watch it first.
4. If the assessment is **paid**, you'll be asked to buy access from your wallet
   (top up first if needed). If it's **voucher‑gated**, redeem your code.
5. **Answer the questions** and submit.
6. **Create a free account / log in** to view and keep your report.
7. Your **report** shows your result (score or personality type), any learning
   resources, and any **bonus content** unlocked by the tier you bought.
8. Your **dashboard** (`/a/<id>/dashboard`) keeps your history, wallet balance,
   and top‑up.

### Topping up the wallet
- Open **Top up** on the dashboard, choose or type an amount (IDR), and pay.
- With the gateway configured, you're sent to **Midtrans** to pay; on return
  your balance updates. Without a gateway (demo mode) the balance is credited
  instantly.

---

## 4. Quick start for a Company / HR buyer

> Goal: buy voucher codes for a team and track their results.

1. Log in and open a branded **dashboard**; scroll to the **Team vouchers**
   section (this is the company portal).
2. Make sure your **wallet balance** covers the package (top up if needed).
3. Enter your **company/team name**, pick a **voucher package**, and
   **Buy from balance**.
4. You receive a batch of **unique codes** — copy and share one per employee.
5. As people redeem codes and finish, the **Individual results** and team
   analytics fill in.

Employees redeem a code on the assessment's **Redeem** page and then take the
assessment like any other taker.

---

## 5. Quick start for an Admin

1. Go to **`/admin/login`** and sign in with an admin account.
2. From the **Admin Dashboard** you can review users, assessments, and
   platform activity.
3. **Platform fee:** for any assessment, set the **platform fee percent**. On
   every paid purchase or voucher sale of that assessment, the platform keeps
   that percentage and the rest is credited to the expert's wallet.

---

## 6. Switching language

Use the **language switch** in the top navigation to toggle between **English**
and **Bahasa Indonesia**. It applies across the expert and user dashboards. The
branded landing pages use the language the expert configured.

---

## 7. Everyday tips

- **Publish is the switch that makes a landing page live.** A draft assessment
  has no public page.
- **Pricing lives in "Product & pricing," not in the assessment settings.**
  The tiers you enable there decide whether the assessment is free, paid, or
  voucher‑gated.
- **Bonus content is a per‑tier reward** shown on the result page after the
  buyer finishes — it never appears on the public landing.
- **The opening video plays before the assessment**, on the intro screen.
- **Balance is shared:** topping up updates both the wallet card and the balance
  shown in the top bar.

---

_For a full walkthrough of every setting, continue to the
[User Manual](./USER_MANUAL.md)._
