import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { inArray } from 'drizzle-orm';
import { db, pool } from './client';
import {
  defaultAssessmentApp,
  mergeAssessmentApp,
  parseAssessmentApp,
  type AssessmentApp,
} from '../config/assessment-app.schema';
import type { LearningResources } from '../config/learning-resources.schema';
import {
  normalizeMode,
  policyFor,
  type AccessMode,
} from '../config/access';
import {
  assessmentAccess,
  assessments,
  attempts,
  blogs,
  choices,
  contacts,
  questions,
  reports,
  transactions,
  users,
  type CategoryResult,
  type ResultCategories,
} from './schema';

/**
 * Demo seed — populates LATO with realistic, presentation-ready SaaS data so
 * every dashboard (user, mentor, admin) and report looks alive during a live
 * MVP demo. Seed-only: it does not change any application logic and is safe to
 * re-run (it removes the known demo accounts first, which cascades their
 * assessments, questions, choices, attempts, reports and transactions).
 *
 *   npm run db:seed
 */

const DEMO_PASSWORD = 'password123';

// Likert choices reused across questions (0–3 scoring → max 30 over 10 Qs).
const LIKERT = [
  { choice_text: 'Strongly disagree', score: 0 },
  { choice_text: 'Disagree', score: 1 },
  { choice_text: 'Agree', score: 2 },
  { choice_text: 'Strongly agree', score: 3 },
];

// Score bands shared by every demo assessment (low/high thresholds).
const LOW = 12;
const HIGH = 21;

const FREE_TEMPLATE =
  'You scored {{score}} on the {{assessment_title}}, which places you at the ' +
  '{{category}} level.\n\n{{summary}}\n\nThis is your snapshot of where you ' +
  'are today: your strengths, the gaps holding you back, and a 30-day plan to ' +
  'level up.';

type Band = 'LOW' | 'MEDIUM' | 'HIGH';
const CATEGORY: Record<Band, string> = {
  LOW: 'Beginner',
  MEDIUM: 'Intermediate',
  HIGH: 'Advanced',
};
const SUMMARY: Record<Band, string> = {
  LOW: 'You are getting started, so focus on building the fundamentals.',
  MEDIUM: 'You have a solid foundation with clear room to grow.',
  HIGH: 'You show strong proficiency in this area.',
};
const bandFor = (score: number): Band =>
  score < LOW ? 'LOW' : score < HIGH ? 'MEDIUM' : 'HIGH';

const renderFree = (title: string, score: number): string => {
  const band = bandFor(score);
  return FREE_TEMPLATE.replaceAll('{{score}}', String(score))
    .replaceAll('{{assessment_title}}', title)
    .replaceAll('{{category}}', CATEGORY[band])
    .replaceAll('{{summary}}', SUMMARY[band]);
};

// The demo mentor persona — owns all three assessments so logging in as the
// mentor immediately shows a full dashboard (assessments, revenue, analytics).
const MENTOR = {
  name: 'Sarah Chen, AI Career Coach',
  email: 'mentor@lato.demo',
};

type AssessmentSeed = {
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  premiumReportDescription: string;
  baseKnowledge: string;
  studyVideoUrl?: string;
  learningResources?: LearningResources;
  // Access model for the demo. Omit -> FREEMIUM (platform default).
  accessMode?: AccessMode;
  // Access cost in IDR (whole rupiah) when accessMode is PAID.
  accessCost?: number;
  questions: string[];
};

/**
 * Per-assessment branding used to build a polished AssessmentApp config, so each
 * seeded assessment renders as its own distinct branded product at /a/<id>.
 * Keyed by title to avoid bloating the ASSESSMENTS entries.
 */
type Showcase = {
  brandName: string;
  monogram: string;
  colors: { primary: string; secondary: string; accent: string };
  competencies: string[];
  companies: string[];
  stats: { value: string; label: string }[];
  testimonials: { quote: string; name: string; role: string; company: string }[];
};

const SHOWCASE: Record<string, Showcase> = {
  'AI Engineer Readiness Assessment': {
    brandName: 'Aptio',
    monogram: 'AP',
    colors: { primary: '#4f46e5', secondary: '#7c3aed', accent: '#06b6d4' },
    competencies: ['Modeling', 'MLOps', 'Software', 'Evaluation', 'Research'],
    companies: ['Northwind', 'Cobalt', 'Vantly', 'Rhombus', 'Lumen', 'Kestrel'],
    stats: [
      { value: '120k+', label: 'assessments completed' },
      { value: '4.9', label: 'average rating' },
      { value: '2,400+', label: 'companies onboard' },
    ],
    testimonials: [
      { quote: 'The report read like a mentor who had actually seen my work. The roadmap was the useful part.', name: 'Maya Chen', role: 'Product Lead', company: 'Cobalt' },
      { quote: 'We rolled it out to 60 people with voucher codes in an afternoon. The HR dashboard sold it.', name: 'David Okoro', role: 'Head of People', company: 'Northwind' },
      { quote: 'Finally an assessment that tells you what to do next instead of just labeling you.', name: 'Priya Nair', role: 'Engineering Manager', company: 'Vantly' },
    ],
  },
  'Leadership Potential Assessment': {
    brandName: 'Meridian',
    monogram: 'MD',
    // Deep emerald/teal so white button text stays high-contrast.
    colors: { primary: '#0a7d5c', secondary: '#0b8f83', accent: '#65a30d' },
    competencies: ['Vision', 'Decisiveness', 'Empathy', 'Communication', 'Accountability'],
    companies: ['Everline', 'Harborlight', 'Terra', 'Solstice', 'Meadowbrook', 'Ironwood'],
    stats: [
      { value: '80k+', label: 'leaders assessed' },
      { value: '4.8', label: 'average rating' },
      { value: '900+', label: 'organizations' },
    ],
    testimonials: [
      { quote: 'Meridian named a blind spot I’d been dancing around for years. The coaching moves were spot on.', name: 'Elena Ruiz', role: 'VP Engineering', company: 'Everline' },
      { quote: 'We mapped our whole leadership team in a week. The shared vocabulary changed how we run meetings.', name: 'Tom Bradley', role: 'COO', company: 'Harborlight' },
      { quote: 'No right answers, no judgment, just an honest mirror. Rare in this category.', name: 'Aisha Khan', role: 'Director of Ops', company: 'Terra' },
    ],
  },
  'Sales Skill Assessment': {
    brandName: 'Ember',
    monogram: 'EM',
    // Deeper coral/orange so white button text stays legible (amber was too light).
    colors: { primary: '#d23f28', secondary: '#dd6510', accent: '#f43f5e' },
    competencies: ['Discovery', 'Qualifying', 'Objections', 'Closing', 'Follow-up'],
    companies: ['Pipeline', 'Quota', 'Velocity', 'Apex', 'Frontier', 'Momentum'],
    stats: [
      { value: '60k+', label: 'reps benchmarked' },
      { value: '4.9', label: 'average rating' },
      { value: '1,300+', label: 'sales teams' },
    ],
    testimonials: [
      { quote: 'Ember pinpointed that I was losing deals in discovery, not closing. Fixed it in a month.', name: 'Jordan Blake', role: 'Account Executive', company: 'Velocity' },
      { quote: 'The team heatmap told me exactly who to coach on objections. Ramp time dropped noticeably.', name: 'Sara Lindqvist', role: 'Sales Manager', company: 'Apex' },
      { quote: 'Ten minutes, and I got a drill plan I actually used on my next call. It worked.', name: 'Marcus Feld', role: 'SDR', company: 'Pipeline' },
    ],
  },
};

/**
 * Build a complete, polished AssessmentApp config for a seeded assessment:
 * generate sensible defaults from its fields, then layer on the showcase brand,
 * trust, testimonials and competencies. Returns null when there's no showcase
 * (the API then serves a generated default).
 */
const buildAppConfig = (a: AssessmentSeed): AssessmentApp | null => {
  const s = SHOWCASE[a.title];
  if (!s) return null;
  const base = defaultAssessmentApp({
    brandName: s.brandName,
    assessmentTitle: a.title,
    monogram: s.monogram,
    colors: s.colors,
    questionCount: a.questions.length,
    estimatedMinutes: 10,
    description: a.description,
  });
  const merged = mergeAssessmentApp(base, {
    landing: {
      trust: { lead: 'Trusted by teams at', companies: s.companies, stats: s.stats },
      testimonials: s.testimonials,
    },
    reports: { competencies: s.competencies.map((key) => ({ key })) },
  });
  return parseAssessmentApp(merged);
};

const ASSESSMENTS: AssessmentSeed[] = [
  {
    title: 'AI Engineer Readiness Assessment',
    description:
      'Find out how ready you are for a professional AI/ML engineering role across modeling, MLOps, software craft and applied research.',
    imageUrl:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    price: 49,
    premiumReportDescription:
      'A personalized deep-dive into your AI engineering readiness: your strongest competencies, the specific gaps holding you back, recommended resources, and a 30-day roadmap to become production-ready.',
    baseKnowledge:
      'This assessment measures readiness for a professional AI/ML engineering role across modeling, MLOps, software engineering and applied research. Higher scores indicate production-grade competency. Beginners should focus on Python and ML fundamentals; intermediates on deployment and evaluation; advanced engineers on research and system design.',
    // Study video unlocked with the premium report (demo).
    studyVideoUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
    // Learning resources tailored to the taker's result level. `shared` shows for
    // everyone; `byProfile` adds level-specific study material. `free` resources
    // appear on the result immediately; `premium` ones unlock with the report.
    learningResources: {
      version: 1,
      shared: [
        {
          id: 'r-shared-1',
          type: 'article',
          title: 'How to read your AI readiness result',
          description: 'A short guide to interpreting your score and level.',
          url: 'https://example.com/guides/reading-your-result',
          access: 'free',
          meta: {},
        },
      ],
      byProfile: {
        Beginner: [
          {
            id: 'r-beg-1',
            type: 'video',
            title: 'Python & ML foundations (crash course)',
            description: 'Start here: the fundamentals every AI engineer needs.',
            url: 'https://www.youtube.com/watch?v=aircAruvnKk',
            access: 'free',
            meta: { durationMinutes: 18 },
          },
          {
            id: 'r-beg-2',
            type: 'course',
            title: 'From zero to first ML model',
            description: 'A guided path covering data, training and evaluation.',
            url: 'https://example.com/courses/zero-to-first-model',
            access: 'premium',
            meta: {},
          },
        ],
        Intermediate: [
          {
            id: 'r-int-1',
            type: 'pdf',
            title: 'MLOps deployment checklist',
            description: 'Ship and monitor models with confidence.',
            url: 'https://example.com/files/mlops-checklist.pdf',
            access: 'premium',
            meta: {},
          },
          {
            id: 'r-int-2',
            type: 'article',
            title: 'Choosing the right evaluation metrics',
            description: 'Offline vs online metrics, and when to trust them.',
            url: 'https://example.com/guides/evaluation-metrics',
            access: 'free',
            meta: {},
          },
        ],
        Advanced: [
          {
            id: 'r-adv-1',
            type: 'link',
            title: 'Applied research reading list',
            description: 'Curated papers to keep your edge sharp.',
            url: 'https://example.com/reading/applied-research',
            access: 'premium',
            meta: {},
          },
        ],
      },
    },
    questions: [
      'I can design and train machine learning models for production use.',
      'I understand how transformer architectures and attention work.',
      'I can build, deploy and monitor ML services in production.',
      'I write clean, well-tested Python for data and ML workloads.',
      'I understand vector databases and retrieval-augmented generation.',
      'I can evaluate model quality with the right offline and online metrics.',
      'I am comfortable working with cloud infrastructure and GPUs.',
      'I keep up with current AI research and apply it pragmatically.',
      'I can debug data pipelines and reason about data quality.',
      'I can translate ambiguous business problems into ML solutions.',
    ],
  },
  {
    title: 'Leadership Potential Assessment',
    description:
      'Discover how your instincts, communication and decision-making shape your leadership potential.',
    imageUrl:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    price: 39,
    premiumReportDescription:
      'An in-depth look at your leadership style: where you naturally lead, the blind spots that hold teams back, and a focused 30-day plan to grow your influence.',
    baseKnowledge:
      'This assessment measures leadership potential across initiative, composure, communication, accountability, decisiveness and people development. Higher scores indicate stronger leadership instincts. Beginners should focus on self-management and communication; intermediates on coaching and conflict; advanced leaders on vision and organizational influence.',
    // PAID access: buyers unlock the whole assessment up front from balance.
    accessMode: 'PAID',
    accessCost: 30_000,
    questions: [
      'I naturally take initiative when no one else steps up.',
      'I stay calm and focused when the pressure is high.',
      'I communicate goals and expectations clearly to others.',
      'I give credit to my team and openly own my mistakes.',
      'I make timely decisions even with incomplete information.',
      'I actively develop and coach the people around me.',
      'I can align a group around a shared vision.',
      'I handle conflict directly and constructively.',
      'I adapt my style to what each situation needs.',
      'I hold myself and others accountable to high standards.',
    ],
  },
  {
    title: 'Sales Skill Assessment',
    description:
      'Understand your natural sales strengths, from rapport and discovery to resilience and closing.',
    imageUrl:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    price: 29,
    premiumReportDescription:
      'A tailored breakdown of your sales skills: the instincts that win deals, the habits that cost you, and a 30-day plan to sharpen your pipeline and close rate.',
    baseKnowledge:
      'This assessment measures sales aptitude across rapport, discovery, resilience, tailoring, closing, follow-up, product mastery, qualification, negotiation and drive. Higher scores indicate stronger natural selling ability. Beginners should focus on listening and follow-up; intermediates on qualification and objection handling; advanced sellers on negotiation and strategic accounts.',
    // VOUCHER access: takers must redeem a company voucher code to start.
    accessMode: 'VOUCHER',
    questions: [
      'I build rapport with new people quickly and naturally.',
      'I listen more than I talk during a discovery conversation.',
      'I stay resilient and positive after hearing "no".',
      'I tailor my message to each prospect’s real needs.',
      'I am comfortable asking directly for the sale.',
      'I follow up consistently without being pushy.',
      'I understand my product deeply enough to handle objections.',
      'I qualify opportunities instead of chasing every lead.',
      'I negotiate confidently while protecting the relationship.',
      'I am driven by clear targets and measurable goals.',
    ],
  },
];

// Realistic registered users (besides admin + mentors). Wallet balances (IDR)
// vary so the user dashboards and admin balance column look populated.
const USERS = [
  { name: 'Demo User', email: 'user@lato.demo', balance: 120_000 },
  { name: 'Olivia Bennett', email: 'olivia.bennett@lato.demo', balance: 70_000 },
  { name: 'Liam Carter', email: 'liam.carter@lato.demo', balance: 35_000 },
  { name: 'Sophia Nguyen', email: 'sophia.nguyen@lato.demo', balance: 0 },
  { name: 'Noah Patel', email: 'noah.patel@lato.demo', balance: 60_000 },
  { name: 'Emma Rossi', email: 'emma.rossi@lato.demo', balance: 15_000 },
];

// Guest (not-registered) takers, used for some attempts + the contact inbox.
const GUESTS = [
  'james.okoro@example.com',
  'mia.larsen@example.com',
  'lucas.silva@example.com',
];

const BLOGS = [
  {
    title: 'Are You Ready for Your First AI Engineering Role?',
    slug: 'ready-for-first-ai-engineering-role',
    excerpt:
      'The skills that actually get you hired as an AI engineer, and a simple way to find your gaps before the interview.',
    content:
      'Breaking into AI engineering is less about knowing every paper and more about a handful of durable skills.\n\nYou need solid Python, a real grasp of how models train and fail, and the ability to ship and monitor a service in production. Add clear thinking about data quality and evaluation, and you are most of the way there.\n\nThe fastest way forward is to find your specific gaps, then close them one at a time.',
    cover_image_url:
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800',
  },
  {
    title: 'What Great Leaders Actually Do Differently',
    slug: 'great-leaders-do-differently',
    excerpt:
      'Leadership is not a title; it is a set of everyday behaviours. We break down the habits that set the best leaders apart.',
    content:
      'The best leaders we have worked with share a few unglamorous habits.\n\nThey communicate context, not just instructions. They make decisions and explain the why. They give credit generously and absorb blame willingly. And they create room for others to lead.\n\nNone of this requires a corner office; it starts wherever you are today.',
    cover_image_url:
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800',
  },
  {
    title: 'The Sales Habits That Quietly Win Deals',
    slug: 'sales-habits-that-win-deals',
    excerpt:
      'Top sellers are rarely the loudest in the room. These are the quiet habits that move deals forward.',
    content:
      'The best salespeople we know listen more than they pitch.\n\nThey qualify hard, follow up without nagging, and tailor every message to the buyer in front of them. They stay resilient after a "no" and treat negotiation as a way to protect the relationship, not win a point.\n\nMaster these and your pipeline takes care of itself.',
    cover_image_url:
      'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800',
  },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Attempt plan per assessment (index aligns with the ASSESSMENTS order).
// who: index into USERS, or 'guest:N' for a guest taker. premium = unlocked.
type AttemptSpec = {
  who: number | string;
  score: number;
  daysAgo: number;
  premium?: boolean;
};

const ATTEMPTS: AttemptSpec[][] = [
  // AI Engineer Readiness
  [
    { who: 0, score: 26, daysAgo: 3, premium: true },
    { who: 1, score: 19, daysAgo: 6, premium: true },
    { who: 3, score: 9, daysAgo: 9 },
    { who: 4, score: 23, daysAgo: 14, premium: true },
    { who: 'guest:0', score: 14, daysAgo: 18 },
    { who: 2, score: 11, daysAgo: 22 },
    { who: 5, score: 17, daysAgo: 27, premium: true },
    { who: 'guest:1', score: 7, daysAgo: 33 },
    { who: 1, score: 25, daysAgo: 41 },
    { who: 4, score: 20, daysAgo: 52 },
  ],
  // Leadership Potential
  [
    { who: 0, score: 22, daysAgo: 2, premium: true },
    { who: 2, score: 16, daysAgo: 5, premium: true },
    { who: 4, score: 27, daysAgo: 11, premium: true },
    { who: 'guest:2', score: 10, daysAgo: 16 },
    { who: 5, score: 13, daysAgo: 21 },
    { who: 1, score: 24, daysAgo: 29, premium: true },
    { who: 3, score: 8, daysAgo: 37 },
    { who: 0, score: 18, daysAgo: 46 },
    { who: 'guest:0', score: 20, daysAgo: 58 },
  ],
  // Sales Personality
  [
    { who: 1, score: 21, daysAgo: 1, premium: true },
    { who: 0, score: 28, daysAgo: 4, premium: true },
    { who: 3, score: 12, daysAgo: 8 },
    { who: 5, score: 15, daysAgo: 13 },
    { who: 'guest:1', score: 6, daysAgo: 19 },
    { who: 4, score: 25, daysAgo: 24, premium: true },
    { who: 2, score: 17, daysAgo: 31 },
    { who: 'guest:2', score: 23, daysAgo: 44 },
    { who: 1, score: 19, daysAgo: 55 },
  ],
];

async function seed() {
  const allDemoEmails = [
    'admin@lato.demo',
    MENTOR.email,
    ...USERS.map((u) => u.email),
  ];

  await db.transaction(async (tx) => {
    // --- Clean previous demo data (idempotent) ---
    await tx.delete(blogs).where(
      inArray(
        blogs.slug,
        BLOGS.map((b) => b.slug),
      ),
    );
    await tx.delete(contacts).where(inArray(contacts.email, GUESTS));
    // Deleting demo users cascades assessments -> questions/choices/attempts/
    // reports, transactions and authored blogs.
    await tx.delete(users).where(inArray(users.email, allDemoEmails));

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // --- Admin ---
    const [admin] = await tx
      .insert(users)
      .values({
        name: 'Demo Admin',
        email: 'admin@lato.demo',
        passwordHash,
        role: 'ADMIN',
      })
      .returning({ id: users.id });

    // --- Mentor (Sarah Chen — owns every demo assessment) ---
    const [mentor] = await tx
      .insert(users)
      .values({
        name: MENTOR.name,
        email: MENTOR.email,
        passwordHash,
        role: 'MENTOR',
      })
      .returning({ id: users.id });
    const mentorId = mentor.id;

    // --- Registered users ---
    const userRows = await tx
      .insert(users)
      .values(
        USERS.map((u) => ({
          name: u.name,
          email: u.email,
          passwordHash,
          role: 'USER' as const,
          balance: u.balance,
        })),
      )
      .returning({ id: users.id });
    const userIds = userRows.map((u) => u.id);

    // Balance top-up ledger so the admin transaction count looks real.
    const topups = USERS.map((u, i) => ({ u, id: userIds[i] })).filter(
      (x) => x.u.balance > 0,
    );
    if (topups.length) {
      await tx.insert(transactions).values(
        topups.map((x, i) => ({
          userId: x.id,
          amount: x.u.balance + 50_000, // topped up more than the current balance
          type: 'TOPUP' as const,
          createdAt: daysAgo(60 - i * 3),
        })),
      );
    }

    // --- Assessments + questions + choices + attempts ---
    let totalAttempts = 0;

    for (let ai = 0; ai < ASSESSMENTS.length; ai++) {
      const a = ASSESSMENTS[ai];

      const [assessment] = await tx
        .insert(assessments)
        .values({
          mentorId,
          title: a.title,
          description: a.description,
          imageUrl: a.imageUrl,
          status: 'PUBLISHED',
          freeReportText: `Thank you for completing the ${a.title}.`,
          freeReportTemplate: FREE_TEMPLATE,
          premiumReportDescription: a.premiumReportDescription,
          baseKnowledge: a.baseKnowledge,
          aiEnabled: true,
          studyVideoUrl: a.studyVideoUrl ?? null,
          learningResources: a.learningResources ?? null,
          accessMode: a.accessMode ?? null,
          accessCost: a.accessCost ?? 0,
          lowScoreThreshold: LOW,
          highScoreThreshold: HIGH,
          price: a.price,
          // Polished branded landing/app config for the demo (distinct per
          // assessment). Null falls back to a generated default.
          appConfig: buildAppConfig(a),
        })
        .returning({ id: assessments.id });

      for (const qText of a.questions) {
        const [question] = await tx
          .insert(questions)
          .values({ assessmentId: assessment.id, questionText: qText })
          .returning({ id: questions.id });
        await tx.insert(choices).values(
          LIKERT.map((c) => ({
            questionId: question.id,
            choiceText: c.choice_text,
            score: c.score,
          })),
        );
      }

      // Access policy for this assessment (drives demo grants + premium seeding).
      const policy = policyFor(normalizeMode(a.accessMode));

      for (const spec of ATTEMPTS[ai]) {
        const isGuest = typeof spec.who === 'string';
        const userId = isGuest
          ? null
          : userIds[spec.who as number];
        const guestEmail = isGuest
          ? GUESTS[Number((spec.who as string).split(':')[1])]
          : null;
        const createdAt = daysAgo(spec.daysAgo);

        const [attempt] = await tx
          .insert(attempts)
          .values({
            assessmentId: assessment.id,
            userId,
            guestEmail,
            totalScore: spec.score,
            createdAt,
          })
          .returning({ id: attempts.id });
        totalAttempts++;

        await tx.insert(reports).values({
          attemptId: attempt.id,
          reportType: 'FREE',
          content: renderFree(a.title, spec.score),
        });

        // Gated modes (PAID/VOUCHER): the registered taker holds an access
        // grant. For PAID, also record the access purchase as mentor revenue.
        if (policy.startRequiresGrant && userId) {
          const source = policy.grantVia === 'voucher' ? 'VOUCHER' : 'PAYMENT';
          await tx
            .insert(assessmentAccess)
            .values({ userId, assessmentId: assessment.id, source })
            .onConflictDoNothing();
          if (policy.grantVia === 'payment' && (a.accessCost ?? 0) > 0) {
            await tx.insert(transactions).values({
              userId,
              mentorId,
              assessmentId: assessment.id,
              amount: a.accessCost ?? 0,
              type: 'ACCESS_PURCHASE',
              createdAt,
            });
          }
        }
      }
    }

    // --- DISC personality assessment (per-result learning resources demo) ---
    // A dedicated block (not part of the score-based loop above) that shows how
    // each personality result gets its OWN learning library via byProfile, while
    // shared resources apply to everyone.
    {
      const DISC_CATEGORIES: ResultCategories = {
        D: {
          name: 'Dominant',
          knowledge:
            'Direct, results-driven and decisive. You take charge, move fast, and thrive on challenge; growth comes from patience and listening.',
        },
        I: {
          name: 'Influencer',
          knowledge:
            'Outgoing, persuasive and optimistic. You energize people and build relationships; growth comes from follow-through and detail.',
        },
        S: {
          name: 'Steady',
          knowledge:
            'Patient, dependable and supportive. You bring calm and consistency to teams; growth comes from embracing change and speaking up.',
        },
        C: {
          name: 'Conscientious',
          knowledge:
            'Analytical, precise and quality-focused. You value accuracy and structure; growth comes from decisiveness and flexibility.',
        },
      };

      // Each result profile gets a DIFFERENT set of resources (the whole point).
      const vid = (
        id: string,
        title: string,
        description: string,
        url: string,
        provider: 'youtube' | 'vimeo' | 'mp4',
        durationLabel: string,
        access: 'free' | 'premium',
      ) => ({
        id,
        type: 'video' as const,
        title,
        description,
        url,
        access,
        provider,
        durationLabel,
        meta: {},
      });
      const doc = (
        type: 'pdf' | 'article' | 'course' | 'link',
        id: string,
        title: string,
        description: string,
        url: string,
        access: 'free' | 'premium',
      ) => ({ id, type, title, description, url, access, meta: {} });

      const discResources: LearningResources = {
        version: 1,
        shared: [
          doc(
            'article',
            'disc-shared-1',
            'Understanding the DISC model',
            'A quick primer on the four DISC styles and how to read your result.',
            'https://example.com/disc/primer',
            'free',
          ),
        ],
        byProfile: {
          D: [
            vid('d-1', 'Leadership Introduction', 'Lead with clarity and drive.', 'https://www.youtube.com/watch?v=aircAruvnKk', 'youtube', '9 min', 'free'),
            vid('d-2', 'Managing Teams', 'Get the best from the people around you.', 'https://vimeo.com/76979871', 'vimeo', '14 min', 'premium'),
            doc('pdf', 'd-3', 'Leadership Workbook', 'Exercises to channel your drive productively.', 'https://example.com/disc/d-workbook.pdf', 'premium'),
            doc('course', 'd-4', 'Decisive Leadership', 'A short course on high-impact decision making.', 'https://example.com/disc/d-course', 'premium'),
          ],
          I: [
            vid('i-1', 'Communication Mastery', 'Turn your energy into influence.', 'https://www.youtube.com/watch?v=aircAruvnKk', 'youtube', '11 min', 'free'),
            vid('i-2', 'Public Speaking', 'Command a room with confidence.', 'https://vimeo.com/76979871', 'vimeo', '18 min', 'premium'),
            doc('article', 'i-3', 'Sales Psychology', 'Why people say yes, and how to help them.', 'https://example.com/disc/i-sales', 'free'),
            doc('course', 'i-4', 'Networking that Sticks', 'Build a network that compounds.', 'https://example.com/disc/i-course', 'premium'),
          ],
          S: [
            vid('s-1', 'Collaboration Skills', 'Make teamwork your superpower.', 'https://www.youtube.com/watch?v=aircAruvnKk', 'youtube', '10 min', 'free'),
            vid('s-2', 'Emotional Intelligence', 'Read the room and respond well.', 'https://vimeo.com/76979871', 'vimeo', '16 min', 'premium'),
            doc('pdf', 's-3', 'Team Dynamics Guide', 'Bring calm and consistency to any team.', 'https://example.com/disc/s-guide.pdf', 'premium'),
          ],
          C: [
            vid('c-1', 'Critical Thinking', 'Sharpen your analytical edge.', 'https://www.youtube.com/watch?v=aircAruvnKk', 'youtube', '12 min', 'free'),
            vid('c-2', 'Analytical Decision Making', 'Decide with rigor and speed.', 'https://vimeo.com/76979871', 'vimeo', '15 min', 'premium'),
            doc('pdf', 'c-3', 'Productivity Systems', 'Structure your work for quality at scale.', 'https://example.com/disc/c-systems.pdf', 'premium'),
          ],
        },
      };

      const DISC_QUESTIONS: { q: string; options: { text: string; code: keyof typeof DISC_CATEGORIES }[] }[] = [
        { q: 'On a new project, I first…', options: [
          { text: 'Set the goal and drive us toward it', code: 'D' },
          { text: 'Rally people and build excitement', code: 'I' },
          { text: 'Make sure everyone is aligned and comfortable', code: 'S' },
          { text: 'Map out the plan and the details', code: 'C' },
        ]},
        { q: 'Under pressure, I tend to…', options: [
          { text: 'Take charge and decide fast', code: 'D' },
          { text: 'Talk it through and stay upbeat', code: 'I' },
          { text: 'Stay calm and steady the team', code: 'S' },
          { text: 'Slow down and check the facts', code: 'C' },
        ]},
        { q: 'People would describe me as…', options: [
          { text: 'Direct and determined', code: 'D' },
          { text: 'Enthusiastic and persuasive', code: 'I' },
          { text: 'Patient and dependable', code: 'S' },
          { text: 'Precise and analytical', code: 'C' },
        ]},
        { q: 'I am most motivated by…', options: [
          { text: 'Winning and results', code: 'D' },
          { text: 'Recognition and people', code: 'I' },
          { text: 'Stability and belonging', code: 'S' },
          { text: 'Accuracy and mastery', code: 'C' },
        ]},
        { q: 'In a meeting, I usually…', options: [
          { text: 'Push for a decision', code: 'D' },
          { text: 'Keep the energy high', code: 'I' },
          { text: 'Make sure everyone is heard', code: 'S' },
          { text: 'Question assumptions', code: 'C' },
        ]},
        { q: 'My biggest strength is…', options: [
          { text: 'Getting things done', code: 'D' },
          { text: 'Connecting with people', code: 'I' },
          { text: 'Being reliable', code: 'S' },
          { text: 'Getting things right', code: 'C' },
        ]},
        { q: 'When plans change, I…', options: [
          { text: 'Adapt fast and push on', code: 'D' },
          { text: 'Sell the new direction', code: 'I' },
          { text: 'Prefer time to adjust', code: 'S' },
          { text: 'Want to understand why', code: 'C' },
        ]},
        { q: 'I make decisions by…', options: [
          { text: 'Trusting my gut and moving', code: 'D' },
          { text: 'Talking to people I trust', code: 'I' },
          { text: 'Seeking consensus', code: 'S' },
          { text: 'Analyzing the data', code: 'C' },
        ]},
      ];

      const [discAssessment] = await tx
        .insert(assessments)
        .values({
          mentorId,
          title: 'DISC Personality Profile',
          description:
            'Discover your dominant working style (Dominant, Influencer, Steady or Conscientious) and get a learning path tailored to your result.',
          imageUrl:
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
          status: 'PUBLISHED',
          freeReportText: 'Here is your DISC profile.',
          premiumReportDescription:
            'A personalized deep-dive into your DISC style: your strengths, your blind spots, and a 30-day plan to grow.',
          baseKnowledge:
            'DISC classifies working style into Dominant (D), Influencer (I), Steady (S) and Conscientious (C). Report on the dominant style with warmth and concrete, style-specific growth advice.',
          aiEnabled: true,
          resultCategories: DISC_CATEGORIES,
          learningResources: discResources,
          accessMode: 'FREE',
          price: 0,
        })
        .returning({ id: assessments.id });

      for (const dq of DISC_QUESTIONS) {
        const [question] = await tx
          .insert(questions)
          .values({ assessmentId: discAssessment.id, questionText: dq.q })
          .returning({ id: questions.id });
        await tx.insert(choices).values(
          dq.options.map((o, i) => ({
            questionId: question.id,
            choiceText: o.text,
            score: 0,
            position: i,
            categoryCodes: [o.code],
          })),
        );
      }

      const discResult = (dominant: keyof typeof DISC_CATEGORIES): CategoryResult => {
        const scores: Record<string, number> = { D: 2, I: 2, S: 2, C: 2 };
        scores[dominant] = 6;
        const total = Object.values(scores).reduce((x, y) => x + y, 0);
        return {
          distribution: scores,
          total,
          dominant,
          dominantName: DISC_CATEGORIES[dominant].name,
          categories: DISC_CATEGORIES,
          scores,
          winner: dominant,
        };
      };
      const discFree = (dominant: keyof typeof DISC_CATEGORIES): string => {
        const c = DISC_CATEGORIES[dominant];
        return `Your dominant style is ${c.name}.\n\n${c.knowledge}\n\nExplore your personalized learning path below to build on this style.`;
      };

      // A spread of results so the demo shows different learning paths.
      const discAttempts: { who: number; dominant: keyof typeof DISC_CATEGORIES; daysAgo: number }[] = [
        { who: 0, dominant: 'D', daysAgo: 2 },
        { who: 1, dominant: 'I', daysAgo: 5 },
        { who: 2, dominant: 'S', daysAgo: 9 },
        { who: 3, dominant: 'C', daysAgo: 14 },
        { who: 4, dominant: 'D', daysAgo: 20 },
        { who: 5, dominant: 'I', daysAgo: 27 },
      ];
      for (const spec of discAttempts) {
        const createdAt = daysAgo(spec.daysAgo);
        const [attempt] = await tx
          .insert(attempts)
          .values({
            assessmentId: discAssessment.id,
            userId: userIds[spec.who],
            totalScore: 0,
            categoryResult: discResult(spec.dominant),
            createdAt,
          })
          .returning({ id: attempts.id });
        totalAttempts++;
        await tx.insert(reports).values({
          attemptId: attempt.id,
          reportType: 'FREE',
          content: discFree(spec.dominant),
        });
      }
    }

    // --- Blogs (published) ---
    await tx.insert(blogs).values(
      BLOGS.map((b, i) => ({
        authorId: admin.id,
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        content: b.content,
        coverImageUrl: b.cover_image_url,
        status: 'PUBLISHED' as const,
        createdAt: daysAgo((i + 1) * 4),
      })),
    );

    // --- Contact inbox ---
    await tx.insert(contacts).values([
      {
        name: 'James Okoro',
        email: GUESTS[0],
        phone: '+1 555 0142',
        message:
          'Loved the AI Engineer Readiness assessment. Do you offer team packages for our bootcamp?',
        status: 'NEW',
      },
      {
        name: 'Mia Larsen',
        email: GUESTS[1],
        message: 'Can I retake an assessment and compare my results over time?',
        status: 'CONTACTED',
      },
      {
        name: 'Lucas Silva',
        email: GUESTS[2],
        message: 'Is there a way to white-label these assessments for my coaching business?',
        status: 'NEW',
      },
    ]);

    return { totalAttempts };
  });

  console.log('✅ Demo seed complete.');
  console.log('   Password for all accounts: %s', DEMO_PASSWORD);
  console.log('   ADMIN  -> admin@lato.demo');
  console.log('   MENTOR -> mentor@lato.demo (Sarah Chen, AI Career Coach)');
  console.log('   USER   -> user@lato.demo (+ 5 named users)');
  console.log('   3 published assessments (10 questions each, AI enabled)');
  console.log('   Historical attempts across beginner/intermediate/advanced');
  console.log('   Balance transactions + expert revenue');
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seed failed:', err);
    await pool.end();
    process.exit(1);
  });
