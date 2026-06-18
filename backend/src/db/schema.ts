import { relations } from 'drizzle-orm';
import {
  integer,
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
  status: assessmentStatus('status').notNull().default('DRAFT'),
  freeReportText: text('free_report_text'),
  lowScoreThreshold: integer('low_score_threshold'),
  highScoreThreshold: integer('high_score_threshold'),
  // Listed price for analytics only (no payment/checkout in MVP).
  price: integer('price').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

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
});

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
