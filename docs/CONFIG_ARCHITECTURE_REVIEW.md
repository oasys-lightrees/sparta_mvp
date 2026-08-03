# AssessmentApp Configuration — Architecture Review

**Reviewer role:** Staff Software Architect
**Subject:** `backend/src/config/assessment-app.schema.ts` (the `AssessmentApp` tenant document)
**Question:** Can this contract support the next 3–5 years of LATO (hundreds of branded products, white-label, enterprise, marketplace) **without a major redesign**, while the existing frontend keeps working?

---

## Verdict

**Yes — the current structure is sound and does not need a redesign.** It is already organized by concern (branding / capability / behavior / content / connectivity), it is versioned with a forward migrator, and it has two escape hatches (`featureFlags`, `metadata`) that let it grow without schema bumps. The frontend only consumes `brand`, `theme`, `landing`, `assessment`, `reports`, `products`, `seo`, so most evolution is invisible to it.

The gaps are **additive**, not structural. This review implements the safe additive ones now (Phase 1) and documents the rest as a roadmap (Phase 2/3). The guiding rule holds: **prefer new optional fields with defaults; bump `version` + add an upcaster only for true shape changes.**

### Backward-compatibility classification used below
- **Non-breaking** — new optional field with a default; old configs parse unchanged; frontend untouched.
- **Minor breaking** — a shape change confined to sections the frontend does *not* consume; handled by the migrator; no frontend change.
- **Major breaking** — changes a consumed section or removes/renames a field the frontend reads; requires coordinated frontend work.

---

## 1. Schema Versioning

**Problem.** v2 had a single `version` (schema version) but no *content* revision or timestamps. You can't tell when a config changed, in what order two edits happened, or safely cache/audit it.

**Why it matters.** As a stable contract shared by backend, frontend, AI, PDF, and email, the config needs provenance: cache-busting, audit trails, optimistic concurrency, and "which revision produced this PDF".

**Breaking?** Non-breaking.

**Recommendation (IMPLEMENTED — Phase 1).** Keep `version` as the **schema** version (drives migration). Add `configVersion` (a monotonic **content** revision the API bumps on every save), plus `createdAt` / `updatedAt` ISO timestamps, stamped server-side (never trusting client input).

**Why better.** Separates *schema shape* from *content revision* — the two evolve independently. `configVersion` gives cheap optimistic-concurrency and cache keys; timestamps give audit and "regenerate if newer" logic for PDFs/emails.

> Naming note: we kept the field `version` (not `schemaVersion`) to avoid churn on an unconsumed field; it is documented as the schema version. Renaming is a Phase-2 minor-breaking cleanup if desired.

---

## 2. Module System

**Problem.** Availability of surfaces was partly hardcoded. Which product surfaces exist for a tenant should be data.

**Why it matters.** Hundreds of products will each enable a different subset (a solo mentor ≠ an enterprise org). The frontend/API must gate on config, not code.

**Breaking?** Non-breaking (booleans default sensibly).

**Recommendation (IMPLEMENTED — Phase 1).** First-class `modules` map. Existing: `landing, assessment, freeReport, premiumReport, studyResources, userDashboard, companyDashboard, mentorDashboard, vouchers, certificates, referral`. **Added (reserved, default off):** `organization, marketplace, blog, community, analytics` — so shipping those never needs a schema bump; a config just flips the flag.

**Why better.** Modules are the platform's capability surface. Reserving flags now means the *contract* is ready before the features are, which is exactly what prevents future breaking changes.

---

## 3. Feature Flags — and why they're separate from modules

**Problem/Question.** Should features be configurable, and should flags be separate from modules?

**Answer: yes, and they must stay separate.** They answer different questions:
- **`modules`** = *typed, first-class product surfaces* the platform officially supports and gates on (stable, documented, part of the contract). Turning one on lights up a whole surface.
- **`featureFlags`** = *open-ended `Record<string, boolean>`* for experiments, gradual rollout, and per-tenant toggles that are **not yet contract-worthy** (e.g. `leaderboard`, `aiCoaching`, `newReportLayout`). No schema change to add one.

**Breaking?** Non-breaking (already present).

**Why better.** Promotion path: an idea starts as a `featureFlag`, and once it's proven and permanent it graduates to a typed `module`. This keeps the typed contract clean while allowing fast experimentation — the classic mistake is putting everything in one bucket, which either bloats the type or turns the whole config into untyped soup.

---

## 4. Theme System — are three colors enough?

**Problem.** Three brand colors drive the whole theme via `color-mix()`. That is *enough for color*, and deliberately so (a tenant can't break the layout, only recolor it — the Stripe-Checkout model). But "theme" is more than color.

**Why it matters.** Premium/enterprise white-label buyers will want typography, motion, chart palettes, and dark-mode control, not just a hue.

**Breaking?** Non-breaking additions.

**Current state.** `theme` already has `radius`, `spacing`, `gradients`, `animations`; `brand` has `typography` (display/body family), `iconStyle`, `illustrationStyle`. **Added Phase 1:** `theme.mode` (`light`/`dark`/`auto`) for explicit dark-mode control.

**Recommendation (Phase 2).** Add, as needed: `theme.charts` (categorical + sequential palettes derived from or overriding brand), a richer `theme.typography` (scale ratio, weights, optional self-hosted font `@font-face` refs), and `theme.motion` (duration/easing tokens). Keep color as the 3-input core; everything else is optional overrides with sane derived defaults.

**Why better.** The three-color core stays the safe default (no tenant can produce an ugly/broken page), while opt-in tokens unlock genuine white-label depth without ever making the simple case harder.

---

## 5. AI Configuration

**Problem/Question.** Should the config reserve space for models, prompts, temperature, knowledge base, guardrails, languages, future capabilities?

**Answer: yes — most already exists; reserve the rest.**

**Current state.** `ai`: `enabled`, `provider`, `model` (null → platform default), `persona`, `tone`, `temperature`, `capabilities.{questionGeneration, premiumReport}`, `guardrails`. **Added Phase 1:** `ai.languages` (output languages).

**Breaking?** Non-breaking.

**Recommendation (Phase 2).**
- `ai.prompts` — optional per-capability **prompt overrides** (system-prompt fragments) so a tenant can tune voice beyond `persona/tone`. Ship with null → platform default prompt.
- `ai.knowledgeBase` — a *reference* (id/URL), **not** inline content. The relational assessment already stores `baseKnowledge`; large knowledge should live in its own store/RAG index, referenced by id.
- `ai.providers[]` / model routing — when you support more than OpenAI, model *routing* (fallbacks, per-capability model) belongs here.

**Hard rule.** **No secrets in config.** `ai.model` picks a model; API keys stay server-side in env/secret store. The config is a *contract*, which may be exported, versioned, and shown to tenant admins — it must never carry credentials.

**Why better.** Reserving `prompts`/`knowledgeBase`/routing as references (not inline blobs) keeps the document small and safe while making the AI layer fully tenant-configurable later.

---

## 6. Enterprise Features — the most important architectural boundary

**Problem.** Organizations, departments, campaigns, managers, and roles are **relational, multi-row, mutable domain entities** — they are **not** per-product presentation config.

**Why it matters.** This is the one place a naïve design goes wrong. If you embed org/department/manager/role data into the `AssessmentApp` document, you get: unbounded document growth, write contention (every employee change rewrites the whole config), no referential integrity, and no way to query "all assessments in Org X". The config is a per-assessment *product definition*, not a database.

**Breaking?** The correct solution is **non-breaking to the config** (it lives in new tables), so it's an additive backend domain, not a schema change.

**Recommendation (Phase 3 — Enterprise domain).**
- New relational tables: `organizations`, `org_members` (user ↔ org ↔ role), `departments`, `campaigns` (a batch rollout with dates/targets). The existing `voucher_batches` already points the way and can hang off an org.
- The config references the org by id only: a small `ownership` block (e.g. `{ ownerType: 'user' | 'org', ownerId }`) or reuse the DB `mentorId`/a new `orgId` FK on the assessment. **White-label and multi-brand** are then org-level: an org owns many assessments that share brand defaults.
- **Roles** (USER/MENTOR/ADMIN today) extend to org roles (OWNER/ADMIN/MANAGER/MEMBER) in `org_members`, checked by middleware — **not** in config.
- **SSO / custom domain** already have config slots (`integrations.sso`, `integrations.customDomain`); the *enforcement* (domain routing, SAML/OIDC handshake) is backend infra (Phase 3).

**Why better.** Keeps the config small, cacheable, and portable; puts mutable, queryable, access-controlled data where it belongs (the database). This is the single most important thing to get right for enterprise scale.

---

## 7. Automation

**Problem/Question.** Should the schema support email automation, reminders, webhook events, workflows, notification rules?

**Current state.** `automation.webhooks` = `{event, url, secret}[]` with a typed event enum (`assessment.completed`, `report.unlocked`, `voucher.redeemed`, `batch.purchased`). This is the right primitive and it's in place.

**Breaking?** Additions are non-breaking.

**Recommendation (Phase 2).**
- `automation.reminders` — declarative schedules (e.g. "nudge non-completers after 3 days"). **Config declares intent; a backend scheduler/worker executes it** — the schema part is cheap, the runtime is the real work.
- `automation.notifications` — rule set mapping events → channels (email/Slack/in-app).
- Full **workflow** automation (multi-step) is Phase 3 and likely a *separate* document/table, not stuffed into the product config — reference by id.

**Why better.** Event→webhook covers integrations today; reminders/notifications are declarative config an external worker consumes. Keeping multi-step workflows out of the config avoids turning it into a mini programming language.

---

## 8. Integrations

**Current state.** `integrations`: `customDomain`, `sso.{enabled, provider, metadataUrl}`, `scimEnabled`, `api.{enabled}`, `analyticsId`.

**Breaking?** Additions non-breaking.

**Recommendation (Phase 2/3).** Add a `connectors` map keyed by provider — `crm`, `hris`, `slack`, `teams`, `googleWorkspace` — each `{ enabled, config-by-reference }`. Store **connection *references*, never live tokens** (OAuth tokens/API keys go in a secured `integration_credentials` table, referenced by id). `api` grows to reference API-key metadata (again, hashes/last-4 only; secrets elsewhere).

**Why better.** A uniform connector shape scales to N integrations without schema churn, and the reference-not-secret rule keeps the config safe to export/version/display.

---

## 9. Long-term Maintainability — risks to watch

1. **Content bloat + i18n (highest risk).** `landing`, `emails`, FAQs etc. embed English copy. At hundreds of products × multiple languages, the document balloons and there's no locale story beyond `settings.defaultLocale`.
   - *Problem:* content and structure are entangled; translations have nowhere to live.
   - *Breaking?* Minor breaking (content sections only; frontend consumes them, so needs coordination) — **defer**.
   - *Recommendation (Phase 2/3):* introduce locale overrides (`content.i18n[locale]` partials merged over the base) or move heavy marketing copy to a lightweight CMS/content store referenced by the config. Keep the base document as the source of truth and structure.

2. **Pricing as display strings.** `products.plans[].price` is `"$29"`. Fine for a marketing card, wrong for real billing.
   - *Recommendation (Phase 2, when billing is real):* add structured `price { amount, currency, interval }` alongside the display string (additive); the display string stays for copy.

3. **Enum churn.** `tone`, `radius`, `illustrationStyle`, webhook `event` are closed enums. Some (event names, tones) will grow.
   - *Recommendation:* for fast-growing sets, prefer a validated open string (or add values behind the migrator). `icon` is already an open string — good precedent.

4. **One giant document.** Validating/patching a large config on every read/write is fine now; at scale, consider lazily parsing sections or splitting rarely-changed enterprise config from frequently-edited content. Not urgent — **watch, don't act**.

5. **Two sources of truth for a few fields.** `assessment.meta.questionCount`, `estimatedMinutes` duplicate relational facts; `ai` overlaps the relational `aiEnabled`/`baseKnowledge`.
   - *Recommendation:* treat the relational tables as authoritative and let the API *derive* those config fields (the default generator already hydrates `questionCount`). Document which side wins to avoid drift.

---

## Implementation Strategy

### Phase 1 — Safe to implement now ✅ (done in this change)
| Item | Area | Breaking |
|---|---|---|
| `configVersion` + `createdAt`/`updatedAt` (server-stamped) | 1 | Non-breaking |
| Reserved `modules`: `organization, marketplace, blog, community, analytics` | 2 | Non-breaking |
| `theme.mode` (light/dark/auto) | 4 | Non-breaking |
| `ai.languages` | 5 | Non-breaking |
| (Already present) `modules`, `featureFlags`, `ai`, `automation.webhooks`, `integrations`, `tier`, `metadata`, `settings.defaultLocale`, `plan.grantsTier`, white-label `settings.removeBranding` | 2,3,5,6,7 | Non-breaking |

### Phase 2 — Wait until the features exist
- `theme.charts` palette, richer `theme.typography`, `theme.motion`.
- `ai.prompts` overrides, `ai.knowledgeBase` reference, model routing.
- `automation.reminders` + `automation.notifications` (needs a scheduler/worker).
- `integrations.connectors` (crm/hris/slack/teams/google) + API-key metadata.
- Structured `products.plans[].price { amount, currency, interval }` (with real billing).
- Locale content overrides (`content.i18n[locale]`).

### Phase 3 — Enterprise roadmap (mostly relational, not config)
- `organizations` / `org_members` / `departments` / `campaigns` tables; `orgId` ownership on assessments; org-level brand defaults + multi-brand.
- Org role management (OWNER/ADMIN/MANAGER/MEMBER) in middleware.
- SSO/SCIM enforcement + custom-domain routing infra.
- Multi-step workflow automation as its own document/engine.

---

## The stable contract

With Phase 1 in place, `AssessmentApp` is a durable contract across **backend, frontend, AI services, PDF generation, email templates, and dashboards**:

- **Versioned** (`version`) + **migratable** (`migrateAssessmentApp`) → shape can evolve without breaking stored configs.
- **Revisioned** (`configVersion`, timestamps) → provenance for caching, audit, and regeneration.
- **Capability-driven** (`modules`) + **experiment-friendly** (`featureFlags`) → surfaces turn on by data, not code.
- **Extensible** (`metadata`, reserved module flags, open `featureFlags`) → most growth is additive.
- **Safe** (no secrets; enterprise/relational data referenced, not embedded) → exportable and portable.

Evolving it should almost always mean *adding an optional field with a default*. A `version` bump + upcaster is the rare exception, and the migrator is the mechanism that keeps that exception non-breaking.
