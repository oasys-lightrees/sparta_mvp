import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { inArray } from 'drizzle-orm';
import { db, pool } from './client';
import {
  assessments,
  attempts,
  blogs,
  choices,
  contacts,
  questions,
  reports,
  transactions,
  users,
} from './schema';

/**
 * Demo seed — populates SPARTA with realistic, presentation-ready SaaS data so
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
  '{{category}} level.\n\n{{summary}}\n\nThis is a quick snapshot of where you ' +
  'are today. Unlock your premium report for a personalized breakdown of your ' +
  'strengths, the gaps holding you back, and a 30-day plan to level up.';

type Band = 'LOW' | 'MEDIUM' | 'HIGH';
const CATEGORY: Record<Band, string> = {
  LOW: 'Beginner',
  MEDIUM: 'Intermediate',
  HIGH: 'Advanced',
};
const SUMMARY: Record<Band, string> = {
  LOW: 'You are getting started — focus on building the fundamentals.',
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

// Sectioned premium report (matches the AI output format: ## Overview, etc.).
const renderPremium = (title: string, score: number): string => {
  const band = bandFor(score);
  const level = CATEGORY[band];
  return [
    '## Overview',
    `Based on your score of ${score} on the ${title}, you are performing at the ${level} level. This report breaks down what is working, where you can improve, and a concrete plan for the next 30 days.`,
    '## Strengths',
    '- You show consistent effort and a genuine willingness to grow.\n- Your strongest responses point to reliable fundamentals you can build on.\n- You bring self-awareness about where you stand today.',
    '## Weaknesses',
    '- A few areas show hesitation under pressure or ambiguity.\n- Consistency dips when situations fall outside your comfort zone.\n- Some advanced competencies are still developing.',
    '## Recommendations',
    '1. Double down on your two strongest areas to create momentum.\n2. Pick one weakness and practice it deliberately each week.\n3. Seek feedback from someone a level ahead of you.\n4. Review your results again in 30 days to measure progress.',
    '## 30-Day Improvement Roadmap',
    'Week 1: Audit your current habits and set one measurable goal.\nWeek 2: Apply a new technique in a real situation and reflect.\nWeek 3: Get feedback and adjust your approach.\nWeek 4: Consolidate the habit and retake the assessment to see your growth.',
  ].join('\n\n');
};

// The demo mentor persona — owns all three assessments so logging in as the
// mentor immediately shows a full dashboard (assessments, revenue, analytics).
const MENTOR = {
  name: 'Sarah Chen — AI Career Coach',
  email: 'mentor@sparta.demo',
};

type AssessmentSeed = {
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  premiumTokenCost: number;
  premiumReportDescription: string;
  baseKnowledge: string;
  studyVideoUrl?: string;
  questions: string[];
};

const ASSESSMENTS: AssessmentSeed[] = [
  {
    title: 'AI Engineer Readiness Assessment',
    description:
      'Find out how ready you are for a professional AI/ML engineering role across modeling, MLOps, software craft and applied research.',
    imageUrl:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    price: 49,
    premiumTokenCost: 50,
    premiumReportDescription:
      'A personalized deep-dive into your AI engineering readiness: your strongest competencies, the specific gaps holding you back, recommended resources, and a 30-day roadmap to become production-ready.',
    baseKnowledge:
      'This assessment measures readiness for a professional AI/ML engineering role across modeling, MLOps, software engineering and applied research. Higher scores indicate production-grade competency. Beginners should focus on Python and ML fundamentals; intermediates on deployment and evaluation; advanced engineers on research and system design.',
    // Study video unlocked with the premium report (demo).
    studyVideoUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
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
    premiumTokenCost: 40,
    premiumReportDescription:
      'An in-depth look at your leadership style: where you naturally lead, the blind spots that hold teams back, and a focused 30-day plan to grow your influence.',
    baseKnowledge:
      'This assessment measures leadership potential across initiative, composure, communication, accountability, decisiveness and people development. Higher scores indicate stronger leadership instincts. Beginners should focus on self-management and communication; intermediates on coaching and conflict; advanced leaders on vision and organizational influence.',
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
      'Understand your natural sales strengths — from rapport and discovery to resilience and closing.',
    imageUrl:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    price: 29,
    premiumTokenCost: 30,
    premiumReportDescription:
      'A tailored breakdown of your sales skills: the instincts that win deals, the habits that cost you, and a 30-day plan to sharpen your pipeline and close rate.',
    baseKnowledge:
      'This assessment measures sales aptitude across rapport, discovery, resilience, tailoring, closing, follow-up, product mastery, qualification, negotiation and drive. Higher scores indicate stronger natural selling ability. Beginners should focus on listening and follow-up; intermediates on qualification and objection handling; advanced sellers on negotiation and strategic accounts.',
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

// Realistic registered users (besides admin + mentors). Token balances vary so
// the user dashboards and admin token column look populated.
const USERS = [
  { name: 'Demo User', email: 'user@sparta.demo', tokens: 120 },
  { name: 'Olivia Bennett', email: 'olivia.bennett@sparta.demo', tokens: 70 },
  { name: 'Liam Carter', email: 'liam.carter@sparta.demo', tokens: 35 },
  { name: 'Sophia Nguyen', email: 'sophia.nguyen@sparta.demo', tokens: 0 },
  { name: 'Noah Patel', email: 'noah.patel@sparta.demo', tokens: 60 },
  { name: 'Emma Rossi', email: 'emma.rossi@sparta.demo', tokens: 15 },
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
      'The skills that actually get you hired as an AI engineer — and a simple way to find your gaps before the interview.',
    content:
      'Breaking into AI engineering is less about knowing every paper and more about a handful of durable skills.\n\nYou need solid Python, a real grasp of how models train and fail, and the ability to ship and monitor a service in production. Add clear thinking about data quality and evaluation, and you are most of the way there.\n\nThe fastest way forward is to find your specific gaps — then close them one at a time.',
    cover_image_url:
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800',
  },
  {
    title: 'What Great Leaders Actually Do Differently',
    slug: 'great-leaders-do-differently',
    excerpt:
      'Leadership is not a title — it is a set of everyday behaviours. We break down the habits that set the best leaders apart.',
    content:
      'The best leaders we have worked with share a few unglamorous habits.\n\nThey communicate context, not just instructions. They make decisions and explain the why. They give credit generously and absorb blame willingly. And they create room for others to lead.\n\nNone of this requires a corner office — it starts wherever you are today.',
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
    'admin@sparta.demo',
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
        email: 'admin@sparta.demo',
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
          tokenBalance: u.tokens,
        })),
      )
      .returning({ id: users.id });
    const userIds = userRows.map((u) => u.id);

    // Token top-up ledger so the admin transaction count looks real.
    const topups = USERS.map((u, i) => ({ u, id: userIds[i] })).filter(
      (x) => x.u.tokens > 0,
    );
    if (topups.length) {
      await tx.insert(transactions).values(
        topups.map((x, i) => ({
          userId: x.id,
          amount: x.u.tokens + 50, // topped up more than the current balance
          type: 'TOKEN_TOPUP' as const,
          createdAt: daysAgo(60 - i * 3),
        })),
      );
    }

    // --- Assessments + questions + choices + attempts + premium unlocks ---
    let premiumUnlocks = 0;
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
          lowScoreThreshold: LOW,
          highScoreThreshold: HIGH,
          price: a.price,
          premiumTokenCost: a.premiumTokenCost,
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

        // Premium unlocks (registered users only) → premium report + revenue.
        if (spec.premium && userId) {
          const [premium] = await tx
            .insert(reports)
            .values({
              attemptId: attempt.id,
              reportType: 'PREMIUM',
              content: renderPremium(a.title, spec.score),
            })
            .returning({ id: reports.id });

          await tx.insert(transactions).values({
            userId,
            mentorId,
            assessmentId: assessment.id,
            reportId: premium.id,
            amount: a.premiumTokenCost,
            type: 'PREMIUM_UNLOCK',
            createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
          });
          premiumUnlocks++;
        }
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
          'Loved the AI Engineer Readiness assessment — do you offer team packages for our bootcamp?',
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

    return { totalAttempts, premiumUnlocks };
  });

  console.log('✅ Demo seed complete.');
  console.log('   Password for all accounts: %s', DEMO_PASSWORD);
  console.log('   ADMIN  -> admin@sparta.demo');
  console.log('   MENTOR -> mentor@sparta.demo (Sarah Chen — AI Career Coach)');
  console.log('   USER   -> user@sparta.demo (+ 5 named users)');
  console.log('   3 published assessments (10 questions each, AI enabled)');
  console.log('   Historical attempts across beginner/intermediate/advanced');
  console.log('   Premium unlocks + token transactions + mentor revenue');
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
