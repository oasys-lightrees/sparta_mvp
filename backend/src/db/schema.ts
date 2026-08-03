import { relations } from 'drizzle-orm';
import type { AssessmentApp } from '../config/assessment-app.schema';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Enums
 */
export const userRole = pgEnum('user_role', ['USER', 'MENTOR', 'ADMIN']);
export const assessmentStatus = pgEnum('assessment_status', [
  'DRAFT',
  'PUBLISHED',
]);
export const reportType = pgEnum('report_type', ['FREE', 'PREMIUM']);
export const blogStatus = pgEnum('blog_status', ['DRAFT', 'PUBLISHED']);
export const contactStatus = pgEnum('contact_status', [
  'NEW',
  'CONTACTED',
  'CLOSED',
]);
export const transactionType = pgEnum('transaction_type', [
  'TOKEN_TOPUP',
  'PREMIUM_UNLOCK',
  'ADMIN_GRANT',
  // Tokens granted to a user when they redeem a company voucher code.
  'VOUCHER_REDEEM',
]);
// Lifecycle of a single voucher code.
export const voucherStatus = pgEnum('voucher_status', [
  'ACTIVE',
  'REDEEMED',
  'REVOKED',
]);
// Lifecycle of a real (Midtrans) token purchase. PENDING until the payment
// gateway confirms; PAID credits the wallet exactly once.
export const paymentStatus = pgEnum('payment_status', [
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
]);

/**
 * users
 * Account information. New registrations always default to USER.
 * MENTOR/ADMIN roles are granted by an admin.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('USER'),
  // Token wallet for unlocking premium reports (no real payment).
  tokenBalance: integer('token_balance').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * assessments
 * Self-assessment tests created by mentors.
 * Report thresholds live here so each assessment can score independently
 * (different question counts -> different score ranges).
 */
export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  mentorId: uuid('mentor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  // Optional cover image (URL-based for the MVP; no file upload yet).
  imageUrl: text('image_url'),
  status: assessmentStatus('status').notNull().default('DRAFT'),
  freeReportText: text('free_report_text'),
  lowScoreThreshold: integer('low_score_threshold'),
  highScoreThreshold: integer('high_score_threshold'),
  // Mentor-authored report templates (v2). Rendered with {{score}},
  // {{category}}, {{assessment_title}}, {{summary}} placeholders.
  freeReportTemplate: text('free_report_template'),
  premiumReportDescription: text('premium_report_description'),
  emailTemplate: text('email_template'),
  // AI assistant (v2 sprint 3).
  baseKnowledge: text('base_knowledge'),
  aiEnabled: boolean('ai_enabled').notNull().default(false),
  // Study video (v4): a mentor-provided URL (YouTube/Vimeo/hosted) unlocked for
  // the taker once they purchase this assessment's premium report. URL-based for
  // the MVP (no file upload), mirroring imageUrl. Null -> no study video.
  studyVideoUrl: text('study_video_url'),
  // Branded landing/app configuration (v5, multi-tenant). The full presentation
  // + branding document that the reusable frontend renders from — see
  // config/assessment-app.schema.ts. Null -> the API returns a generated default
  // derived from this assessment's fields, so it always renders.
  appConfig: jsonb('app_config').$type<AssessmentApp>(),
  // Diagnostic/personality engine (v3): when set, each answer position maps to
  // a result category. Null -> fall back to the exam-style score engine.
  resultCategories: jsonb('result_categories').$type<ResultCategories>(),
  // Listed price for analytics only (no payment/checkout in MVP).
  price: integer('price').notNull().default(0),
  // Token cost to unlock this assessment's premium report (0 = no premium).
  premiumTokenCost: integer('premium_token_cost').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Result categories (diagnostic / personality assessments). The mentor maps
 * each answer position (A, B, C…) to a result type with explanatory knowledge.
 * When set on an assessment, the category engine is used instead of the
 * exam-style score engine.
 */
export type ResultCategory = { name: string; knowledge: string };
export type ResultCategories = Record<string, ResultCategory>;

// Supported report/UI languages (i18n).
export type Language = 'en' | 'id';

/**
 * questions
 * Multiple-choice questions belonging to an assessment.
 */
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  // Optional metadata (e.g. from AI import).
  correctAnswer: text('correct_answer'),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * choices
 * Answer options for a question. `score` is summed to compute a result.
 * Scores must never be exposed to public users.
 */
export const choices = pgTable('choices', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  choiceText: text('choice_text').notNull(),
  score: integer('score').notNull().default(0),
  // Display/answer order within a question. Drives the A/B/C/D labels used by
  // the category engine and answer snapshot. Legacy rows default to 0.
  position: integer('position').notNull().default(0),
  // Psychometric answer key (additive): result category codes this choice
  // contributes to (e.g. ["PB","CH"]). Null/empty -> not a psychometric choice.
  categoryCodes: jsonb('category_codes').$type<string[]>(),
});

/**
 * Per-question evaluation snapshot captured on an attempt at submit time.
 * Stored as a self-contained snapshot (not just question IDs) so a report stays
 * historically accurate even if the mentor later edits or deletes questions.
 */
export type AnswerSnapshotItem = {
  question: string;
  userAnswer: string; // synthesized choice label (A, B, C…)
  userAnswerText: string;
  expectedAnswer: string; // label of the highest-scoring choice
  expectedAnswerText: string;
  explanation: string | null;
  score: number; // points earned for the selected choice
};

/**
 * Category-engine result captured on an attempt at submit time. Self-contained
 * (includes a snapshot of the category config) so the result stays accurate
 * even if the mentor later edits the categories. Null for exam-style attempts.
 */
export type CategoryResult = {
  distribution: Record<string, number>; // label/code -> points
  total: number; // sum of points (or answered count in legacy mode)
  dominant: string; // winning label/code
  dominantName: string; // winning category name
  categories: ResultCategories; // config snapshot
  // Psychometric mode (additive): answer-key scores keyed by category code and
  // the winning code. In legacy A/B/C/D mode these are omitted.
  scores?: Record<string, number>;
  winner?: string;
};

/**
 * attempts
 * A submitted assessment. Login is NOT required:
 *  - logged-in users  -> user_id is set
 *  - guests           -> guest_email is set
 */
export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  guestEmail: varchar('guest_email', { length: 255 }),
  totalScore: integer('total_score').notNull().default(0),
  // Additive (v3): per-question evaluation snapshot. Null for attempts created
  // before this feature — those fall back to a score-only AI report.
  answersSnapshot: jsonb('answers_snapshot').$type<AnswerSnapshotItem[]>(),
  // Additive (v3): category-engine result. Null for exam-style attempts.
  categoryResult: jsonb('category_result').$type<CategoryResult>(),
  // Additive (i18n): language the free + premium reports are generated in, so
  // an attempt's reports stay consistent. Legacy rows default to 'en'.
  reportLanguage: text('report_language').notNull().default('en'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * reports
 * Generated result for an attempt (1:1). MVP only generates FREE reports;
 * the PREMIUM enum value is kept for future compatibility.
 */
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id')
    .notNull()
    .references(() => attempts.id, { onDelete: 'cascade' }),
  reportType: reportType('report_type').notNull().default('FREE'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Relations (used by Drizzle's query API in later steps)
 */
export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
  attempts: many(attempts),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  mentor: one(users, {
    fields: [assessments.mentorId],
    references: [users.id],
  }),
  questions: many(questions),
  attempts: many(attempts),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  assessment: one(assessments, {
    fields: [questions.assessmentId],
    references: [assessments.id],
  }),
  choices: many(choices),
}));

export const choicesRelations = relations(choices, ({ one }) => ({
  question: one(questions, {
    fields: [choices.questionId],
    references: [questions.id],
  }),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  assessment: one(assessments, {
    fields: [attempts.assessmentId],
    references: [assessments.id],
  }),
  user: one(users, {
    fields: [attempts.userId],
    references: [users.id],
  }),
  report: one(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  attempt: one(attempts, {
    fields: [reports.attemptId],
    references: [attempts.id],
  }),
}));

/**
 * blogs
 * Marketing articles shown on the landing page. Only PUBLISHED blogs are
 * exposed publicly.
 */
export const blogs = pgTable('blogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content'),
  coverImageUrl: text('cover_image_url'),
  status: blogStatus('status').notNull().default('DRAFT'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * contacts
 * Landing-page contact-form submissions, managed by admins.
 */
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  message: text('message').notNull(),
  status: contactStatus('status').notNull().default('NEW'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const blogsRelations = relations(blogs, ({ one }) => ({
  author: one(users, {
    fields: [blogs.authorId],
    references: [users.id],
  }),
}));

/**
 * transactions
 * Token ledger: top-ups, admin grants and premium unlocks. mentor_id /
 * assessment_id / report_id are only set for PREMIUM_UNLOCK rows.
 */
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  mentorId: uuid('mentor_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  assessmentId: uuid('assessment_id').references(() => assessments.id, {
    onDelete: 'set null',
  }),
  reportId: uuid('report_id').references(() => reports.id, {
    onDelete: 'set null',
  }),
  amount: integer('amount').notNull(),
  type: transactionType('type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * token_orders
 * A real token purchase processed through the Midtrans payment gateway. One row
 * is created (PENDING) when the user starts checkout; the gateway's asynchronous
 * notification flips it to PAID/FAILED/EXPIRED. On the first PAID transition the
 * wallet is credited and a TOKEN_TOPUP transaction is recorded — the PAID state
 * makes crediting idempotent against duplicate notifications.
 */
export const tokenOrders = pgTable('token_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Midtrans order_id (also our idempotency key). Unique across all orders.
  orderId: varchar('order_id', { length: 255 }).notNull().unique(),
  // Tokens to credit on success.
  tokenAmount: integer('token_amount').notNull(),
  // Charged amount in IDR (Midtrans gross_amount, whole rupiah).
  grossAmount: integer('gross_amount').notNull(),
  status: paymentStatus('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const tokenOrdersRelations = relations(tokenOrders, ({ one }) => ({
  user: one(users, {
    fields: [tokenOrders.userId],
    references: [users.id],
  }),
}));

/**
 * voucher_batches
 * A company's purchase of N assessment credits for a single assessment. Buying
 * a batch generates `credits` unique voucher codes (see vouchers). The buyer is
 * the company admin; employees redeem individual codes.
 */
export const voucherBatches = pgTable('voucher_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id')
    .notNull()
    .references(() => assessments.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Free-text company/org label shown on the buyer's dashboard.
  companyName: varchar('company_name', { length: 255 }).notNull(),
  credits: integer('credits').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * vouchers
 * A single redeemable code belonging to a batch. Redeeming grants the taker the
 * tokens needed to unlock this assessment's premium report (a VOUCHER_REDEEM
 * transaction), so a code == one funded premium assessment.
 */
export const vouchers = pgTable('vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id')
    .notNull()
    .references(() => voucherBatches.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 32 }).notNull().unique(),
  status: voucherStatus('status').notNull().default('ACTIVE'),
  redeemedByUserId: uuid('redeemed_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  redeemedAt: timestamp('redeemed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const voucherBatchesRelations = relations(
  voucherBatches,
  ({ one, many }) => ({
    assessment: one(assessments, {
      fields: [voucherBatches.assessmentId],
      references: [assessments.id],
    }),
    buyer: one(users, {
      fields: [voucherBatches.buyerId],
      references: [users.id],
    }),
    vouchers: many(vouchers),
  }),
);

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  batch: one(voucherBatches, {
    fields: [vouchers.batchId],
    references: [voucherBatches.id],
  }),
  redeemedBy: one(users, {
    fields: [vouchers.redeemedByUserId],
    references: [users.id],
  }),
}));
