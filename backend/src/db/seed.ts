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
  users,
} from './schema';

/**
 * Production demo seed — populates SPARTA with realistic, presentation-ready
 * data. Seed-only: it does not change any application logic. Safe to re-run
 * (it removes the demo accounts/blogs/contacts by their known keys first, which
 * cascades their assessments, questions, choices, attempts and reports).
 *
 *   npm run db:seed
 */

const DEMO_PASSWORD = 'password123';

const DEMO_EMAILS = [
  'admin@sparta.demo',
  'mentor@sparta.demo',
  'user@sparta.demo',
];

// Likert choices reused across questions (realistic 0–3 scoring).
const LIKERT = [
  { choice_text: 'Strongly disagree', score: 0 },
  { choice_text: 'Disagree', score: 1 },
  { choice_text: 'Agree', score: 2 },
  { choice_text: 'Strongly agree', score: 3 },
];

type AssessmentSeed = {
  title: string;
  description: string;
  price: number;
  freeReportText: string;
  low: number;
  high: number;
  questions: string[];
};

// Max score per assessment = 5 questions * 3 = 15. Bands: <6 low, 6–10 medium, >=11 high.
const ASSESSMENTS: AssessmentSeed[] = [
  {
    title: 'Leadership Potential Assessment',
    description:
      'Discover how your instincts, communication and decision-making shape your leadership potential.',
    price: 29,
    freeReportText:
      'Thank you for completing the Leadership Potential Assessment. Your result reflects your current leadership tendencies and where you can grow next.',
    low: 6,
    high: 11,
    questions: [
      'I naturally take initiative when no one else steps up.',
      'I stay calm and focused when the pressure is high.',
      'I communicate goals and expectations clearly to others.',
      'I give credit to my team and openly own my mistakes.',
      'I make timely decisions even with incomplete information.',
    ],
  },
  {
    title: 'Career Direction Assessment',
    description:
      'Gauge how clear you are about the work you want and the path to get there.',
    price: 39,
    freeReportText:
      'Thanks for taking the Career Direction Assessment. Here is a snapshot of your career clarity and momentum.',
    low: 6,
    high: 11,
    questions: [
      'I have a clear picture of the work I find meaningful.',
      'I know which skills I most want to grow this year.',
      'I regularly seek feedback about my strengths.',
      'I can describe my ideal work environment in detail.',
      'I feel confident making decisions about my career.',
    ],
  },
  {
    title: 'Personal Growth Assessment',
    description:
      'Reflect on your habits, mindset and self-awareness to understand your growth trajectory.',
    price: 0,
    freeReportText:
      'Thank you for completing the Personal Growth Assessment. This reflects your current growth mindset and self-awareness.',
    low: 6,
    high: 11,
    questions: [
      'I set aside time for reflection and self-improvement.',
      'I view setbacks as opportunities to learn.',
      'I am aware of my emotional triggers.',
      'I follow through on commitments I make to myself.',
      'I actively seek out new experiences and perspectives.',
    ],
  },
];

const BLOGS = [
  {
    title: '5 Small Habits That Compound Into Real Self-Growth',
    slug: 'habits-for-self-growth',
    excerpt:
      'Big change rarely comes from big gestures. Here are five tiny, repeatable habits that quietly transform how you work and live.',
    content:
      'Self-growth is less about dramatic reinvention and more about the small things you repeat.\n\n1. Reflect for five minutes a day.\n2. Write down one thing you learned.\n3. Ask for feedback before you need it.\n4. Protect a single block of deep focus.\n5. Celebrate tiny wins out loud.\n\nStack these for a few months and the compounding effect is hard to ignore.',
    cover_image_url:
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
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
    title: 'Navigating Your Next Career Move With Confidence',
    slug: 'navigating-your-next-career-move',
    excerpt:
      'Career decisions feel huge in the moment. A simple framework can make your next move feel a lot less daunting.',
    content:
      'When a career decision looms, clarity beats certainty.\n\nStart by naming the work that energises you. Then map the skills that move you toward it, and the environment where you do your best work. Finally, talk to people already doing the role.\n\nConfidence is a by-product of clarity — not the other way around.',
    cover_image_url:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
  },
];

// Guest takers used for sample results.
const GUESTS = [
  'olivia.bennett@example.com',
  'liam.carter@example.com',
  'sophia.nguyen@example.com',
  'noah.patel@example.com',
  'emma.rossi@example.com',
  'james.okoro@example.com',
];

const bandLabel = (score: number, low: number, high: number) =>
  score < low ? 'Needs improvement' : score < high ? 'Average' : 'Strong';

const reportContent = (
  freeText: string,
  score: number,
  low: number,
  high: number,
) => `${freeText}\n\n${bandLabel(score, low, high)}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seed() {
  await db.transaction(async (tx) => {
    // --- Clean previous demo data (idempotent) ---
    await tx.delete(blogs).where(
      inArray(
        blogs.slug,
        BLOGS.map((b) => b.slug),
      ),
    );
    await tx.delete(contacts).where(inArray(contacts.email, GUESTS));
    // Deleting demo users cascades their assessments -> questions/choices/
    // attempts/reports and authored blogs.
    await tx.delete(users).where(inArray(users.email, DEMO_EMAILS));

    // --- Users ---
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const [admin, mentor, user] = await tx
      .insert(users)
      .values([
        {
          name: 'Demo Admin',
          email: 'admin@sparta.demo',
          passwordHash,
          role: 'ADMIN',
        },
        {
          name: 'Demo Mentor',
          email: 'mentor@sparta.demo',
          passwordHash,
          role: 'MENTOR',
        },
        {
          name: 'Demo User',
          email: 'user@sparta.demo',
          passwordHash,
          role: 'USER',
        },
      ])
      .returning({ id: users.id });

    // --- Assessments + questions + choices ---
    let attemptSeq = 0;
    for (const a of ASSESSMENTS) {
      const [assessment] = await tx
        .insert(assessments)
        .values({
          mentorId: mentor.id,
          title: a.title,
          description: a.description,
          status: 'PUBLISHED',
          freeReportText: a.freeReportText,
          lowScoreThreshold: a.low,
          highScoreThreshold: a.high,
          price: a.price,
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

      // --- Sample attempts + reports (varied scores across bands) ---
      const sampleScores = [4, 7, 9, 11, 14];
      for (let i = 0; i < sampleScores.length; i++) {
        const score = sampleScores[i];
        // First attempt is the registered demo user; the rest are guests.
        const isUser = i === 0;
        const guestEmail = GUESTS[(attemptSeq + i) % GUESTS.length];
        const createdAt = daysAgo(attemptSeq * 2 + i + 1);

        const [attempt] = await tx
          .insert(attempts)
          .values({
            assessmentId: assessment.id,
            userId: isUser ? user.id : null,
            guestEmail: isUser ? null : guestEmail,
            totalScore: score,
            createdAt,
          })
          .returning({ id: attempts.id });

        await tx.insert(reports).values({
          attemptId: attempt.id,
          reportType: 'FREE',
          content: reportContent(a.freeReportText, score, a.low, a.high),
        });
      }
      attemptSeq += sampleScores.length;
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
        createdAt: daysAgo((i + 1) * 3),
      })),
    );

    // --- A few contact messages (so the admin inbox looks alive) ---
    await tx.insert(contacts).values([
      {
        name: 'Olivia Bennett',
        email: GUESTS[0],
        phone: '+1 555 0142',
        message: 'Loved the Leadership assessment — do you offer team packages?',
        status: 'NEW',
      },
      {
        name: 'Liam Carter',
        email: GUESTS[1],
        message: 'Can I retake an assessment and compare results over time?',
        status: 'CONTACTED',
      },
    ]);
  });

  console.log('✅ Demo seed complete.');
  console.log('   Accounts (password for all: %s):', DEMO_PASSWORD);
  console.log('     ADMIN  -> admin@sparta.demo');
  console.log('     MENTOR -> mentor@sparta.demo');
  console.log('     USER   -> user@sparta.demo');
  console.log('   3 published assessments (5 questions x 4 choices each)');
  console.log('   15 sample attempts + reports, 3 blog posts, 2 contacts');
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
