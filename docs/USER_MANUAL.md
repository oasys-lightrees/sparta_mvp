# LATO — User Manual

A complete reference for using the LATO assessment platform. For a fast
task‑oriented overview, see [How to Use](./HOW_TO_USE.md).

## Contents

1. [Concepts & glossary](#1-concepts--glossary)
2. [Accounts, roles & signing in](#2-accounts-roles--signing-in)
3. [Expert guide](#3-expert-guide)
4. [Taker guide](#4-taker-guide)
5. [Company / HR buyer guide](#5-company--hr-buyer-guide)
6. [Admin guide](#6-admin-guide)
7. [Wallet & payments](#7-wallet--payments)
8. [Language](#8-language)
9. [FAQ & troubleshooting](#9-faq--troubleshooting)

---

## 1. Concepts & glossary

| Term | Meaning |
|------|---------|
| **Assessment** | A questionnaire someone takes. Either **Skill** (scored) or **Personality** (categorized). |
| **Attempt** | One person's completed run of an assessment, which produces a report. |
| **Report** | The personalized result shown after finishing (score/level or personality result, learning resources, and any unlocked bonus content). |
| **Branded landing page** | The public, brand‑themed page for one assessment, at `/a/<assessment-id>`. |
| **Product & pricing** | The sellable packaging around an assessment: a set of pricing **tiers** plus optional **voucher packages**. |
| **Tier** | One pricing card on the landing page — **Free**, **Paid**, or **Voucher**. A Paid tier is bought at its own price and can carry its own bonus content. |
| **Bonus content** | Videos/text attached to a tier, delivered on the result page **after** a buyer of that tier finishes. Never shown publicly. |
| **Voucher package** | A bulk "seat" package a company buys to get many one‑use codes. |
| **Voucher code** | A single code that unlocks one assessment for one person. |
| **Wallet balance** | Money held in the account, in **IDR** (whole rupiah). Funded by top‑ups; spent on paid access and voucher packages. |
| **Platform fee** | A percentage (set by an admin, per assessment) the platform keeps on each sale; the remainder is credited to the expert. |
| **Opening video** | A video shown on the intro screen, before the taker answers. |

**No tokens or currency conversion.** The amount topped up is exactly the amount
charged and credited (1:1, in IDR).

---

## 2. Accounts, roles & signing in

- **Register** at `/register`, **log in** at `/login`.
- Roles: **User** (default / taker), **Expert (Mentor)**, **Admin**.
- The **Expert Dashboard** is at `/mentor`; the **User Dashboard** at
  `/dashboard`; the **Admin Dashboard** at `/admin` (log in via `/admin/login`).
- A taker who completes an assessment as a guest is prompted to create a free
  account to keep the report; the guest attempt is claimed to that account.

---

## 3. Expert guide

The Expert Dashboard (`/mentor`) shows summary stats, your assessments, revenue,
and analytics. Open an assessment to reach the **Manage** page.

### 3.1 The Manage page (sidebar)

The Manage page uses a left sidebar to switch between sections. The assessment
**title**, **status badge**, and **Publish / Unpublish** button live in the
header above it.

- **Details** — type, description, thresholds/categories, opening video, edit.
- **Questions** — the question & choice editor.
- **Product & pricing** — tiers, bonus content, voucher packages.
- **Landing page** — branding and page sections.
- **Share** — the public link.
- **Results** — everyone who has taken it.

### 3.2 Creating an assessment

1. **Create assessment** on the dashboard.
2. **Assessment type:**
   - **Skill Assessment** — evaluates knowledge; results are a **score** and a
     level derived from the **low/high score thresholds**.
   - **Personality Assessment** — categorizes takers; you define **result
     categories** and each answer maps to one or more of them. Skill‑only fields
     (thresholds, per‑choice score) disappear in this mode.
3. **Title, description, cover photo.**
4. **Free report text** — the intro shown above the result.
5. **Opening video URL** *(optional)* — YouTube, Vimeo, or a direct video link,
   shown on the intro screen before answering.
6. **Learning resources** *(optional)* — a curated library per result profile
   (see 3.6).

### 3.3 Questions & choices

In **Questions**, add each question and its choices.

- **Skill:** give each choice an integer **score**.
- **Personality:** map each choice to one or more **result category codes**
  (the score field is hidden).

Edit or delete questions at any time. Re‑ordering content and mappings takes
effect immediately for new attempts.

### 3.4 Product & pricing

Pricing is set **here**, not in the assessment settings.

**Pricing tiers** (cards on the landing page). For each tier set: enabled,
highlight, title, pricing type, price label, price (IDR), description, image,
and button label. Pricing type:

- **Free** — anyone can take it, no charge.
- **Paid** — the tier is bought on its own at its own price. Each Paid tier can
  carry its own **Bonus content** (video/text) unlocked on the result page after
  the buyer finishes.
- **Voucher** — the button routes to the redeem flow (unlock with a code).

Saving the product derives the assessment's access model from the enabled tiers.

**Company voucher packages** (optional). Bulk seat packages a company buys from
their balance to receive that many codes. Set a label, seat count, price (IDR),
and an optional image. Cheaper per seat than the individual price is typical.
Configured packages also appear as cards on the landing page.

**Publish / Draft.** A published product's tiers are live on the landing page.

### 3.5 Landing page editor

Customize the branded page. Sections:

- **Brand** — brand name, monogram, logo, favicon, three theme colors, color
  scheme (auto/light/dark), corner style.
- **Hero** — eyebrow, headline, subtitle, description, hero photo, primary and
  secondary buttons.
- **About** *(toggle)* — title + description on the left, photo on the right.
  When Contact is enabled, the About section also gets a button to the WhatsApp
  contact.
- **Benefits** *(toggle)* — a titled grid of cards, each with an image, heading,
  and short description (e.g. "4 Ways You Can Benefit…").
- **Contact** *(toggle)* — a clickable title in the footer that opens a WhatsApp
  chat. You provide the title, a contact name, and a WhatsApp number **with
  country code** (e.g. `628123456789`).
- **Closing call to action** *(toggle)*.
- **Search & social (SEO)** — page title and meta description.

Use **View** to preview the published page, **Customize** to edit, **Save**, or
**Reset to default**.

### 3.6 Learning resources

Curate an independent library per result profile plus a shared set shown for
every result. Each resource has a type (video, PDF, article, link, course,
file), a title, URL, description, and an access level (free / locked). They
appear on the taker's report.

### 3.7 Publishing & sharing

- **Publish** (Manage header) makes the landing page live.
- **Share** tab has the public URL (`/a/<id>`). Anyone can open it and take the
  assessment; no sign‑up is required to start.

### 3.8 Results, analytics & revenue

- **Results** — every participant with their score/result and date.
- **Analytics** — **Assessments bought** (purchases per day) and **Revenue over
  time** (IDR earned per day).
- **Revenue** — total revenue, **Assessments Bought**, and a history table:
  **Assessment · Product tier · Amount · Date · Bought by**.

Money from a paid purchase or voucher sale is credited to the expert's wallet,
minus the admin‑set **platform fee** for that assessment.

---

## 4. Taker guide

1. Open the branded landing page and start.
2. Watch the **opening video** on the intro if present.
3. Clear the **access gate** if needed:
   - **Paid** — buy access from your wallet (the specific tier you chose).
   - **Voucher** — redeem your code.
   - **Free** — begin immediately.
4. **Answer** the questions and submit.
5. **Log in / create an account** to view the report.
6. The **report** shows your result, learning resources, and any **bonus
   content** unlocked by the tier you bought.
7. Your **dashboard** (`/a/<id>/dashboard`) holds your history, wallet balance
   (with **Top up**), a **Redeem voucher** action, and the **Team vouchers**
   section for company buying.

---

## 5. Company / HR buyer guide

The company portal lives in the **Team vouchers** section of the branded
dashboard.

1. Ensure your **wallet balance** covers the package (top up if needed).
2. Enter a **company/team name**, select a **voucher package**, and
   **Buy from balance**.
3. Receive a batch of unique **codes**; use **Copy all** to distribute them.
4. **Your packages** lists each batch with redeemed counts. Open one to see:
   - **Team analytics** — redeemed, completed, completion rate, and (for skill
     assessments) average score.
   - **Individual results** — each employee, their code, redemption date,
     status, and score/result.
   - The full **voucher codes** list (redeemed codes are marked).

Employees redeem a code at the assessment's **Redeem** page, then take it.

---

## 6. Admin guide

1. Sign in at **`/admin/login`**.
2. The **Admin Dashboard** (`/admin`) provides oversight of users, assessments,
   contacts, and platform analytics.
3. **Platform fee.** For each assessment, set the **platform fee percent**
   (0–100). On every paid purchase or voucher sale of that assessment the
   platform keeps that percent; the remainder is credited to the expert's wallet.

---

## 7. Wallet & payments

- The wallet holds **IDR** (whole rupiah). Top‑up amount = amount charged =
  amount credited (1:1).
- **Top up** from a dashboard: choose a preset or type a custom amount.
  - **Gateway configured:** you're redirected to **Midtrans** to pay; on return
    your balance is confirmed and updated.
  - **Demo mode (no gateway):** the balance is credited instantly (development /
    demo only; disabled in production).
- **Spending:** buying a Paid tier debits its price; buying a voucher package
  debits the package price. The expert is credited the amount minus the
  platform fee.
- **Balance sync:** after a top‑up the balance updates in real time in both the
  wallet card and the top bar.

> **Operator note (payments):** for live payments the Midtrans **Payment
> Notification URL** should point to `/api/balance/midtrans/notification`. If the
> webhook doesn't arrive, the balance is still reconciled when the browser
> returns from the payment page. Crediting is idempotent (never double‑credits).

---

## 8. Language

A **language switch** in the top navigation toggles **English** ⇄ **Bahasa
Indonesia** across the expert and user dashboards (including the manage‑assessment
editors). Branded landing pages render in the language the expert configured.

---

## 9. FAQ & troubleshooting

**My landing page isn't live.** Publish the assessment (Manage header). A draft
has no public page.

**Where do I set the price?** In **Product & pricing**, by enabling a Paid or
Voucher tier — not in the assessment settings.

**A buyer paid but doesn't see the bonus content.** Bonus content is per‑tier
and shows on the **result page after finishing**, only for the tier that was
purchased.

**The opening video plays after the test, not before.** Opening videos now play
on the **intro** screen, before answering. Confirm the URL is set in Details.

**A top‑up didn't credit.** Ensure the Midtrans keys/environment match the
account used, and that the Payment Notification URL is configured. The balance
is also reconciled on return from the payment page.

**Personality assessment shows score options.** It shouldn't — personality mode
hides all scoring fields. Re‑check that result categories are defined (that's
what puts the assessment in personality mode).

**Can a taker start without an account?** Yes — they can answer as a guest and
are prompted to create a free account to view/keep the report.
