import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessments,
  attempts,
  choices,
  questions,
  reports,
  users,
  type AnswerSnapshotItem,
  type CategoryResult,
  type Language,
  type ResultCategories,
} from '../db/schema';
import { HttpError } from '../utils/http-error';
import { sendEmail } from './email.service';
import {
  hasCategories,
  labelFor,
  percentFor,
  pickDominant,
} from './category.engine';

export type SubmitAnswer = {
  question_id: string;
  choice_id: string;
};

export type SubmitInput = {
  userId: string | null;
  guestEmail: string | null;
  answers: SubmitAnswer[];
  language: Language;
};

type AssessmentForReport = {
  title: string;
  freeReportText: string | null;
  freeReportTemplate: string | null;
  emailTemplate: string | null;
  lowScoreThreshold: number | null;
  highScoreThreshold: number | null;
};

/**
 * FREE report for a category (diagnostic/personality) assessment. Shows the
 * dominant result and the full distribution of the taker's answer pattern.
 * Honors free_report_template when set (category -> {{category}}, dominant
 * knowledge -> {{summary}}).
 */
const generateCategoryFreeReport = (
  assessment: AssessmentForReport,
  result: CategoryResult,
  language: Language,
): { content: string; category: string; summary: string } => {
  // Category NAMES are mentor-authored content — never translated.
  const category = result.dominantName;
  const summary = result.categories[result.dominant]?.knowledge ?? '';

  // All configured categories, sorted by label, with their percentage.
  const lines = Object.keys(result.categories)
    .sort()
    .map((label) => {
      const name = result.categories[label]?.name ?? `Result ${label}`;
      const pct = percentFor(result.distribution[label] ?? 0, result.total);
      return `${name}: ${pct}%`;
    });

  if (assessment.freeReportTemplate) {
    return {
      content: renderTemplate(assessment.freeReportTemplate, {
        score: result.total,
        category,
        assessment_title: assessment.title,
        summary,
      }),
      category,
      summary,
    };
  }

  const t = STRINGS[language];
  const content = [
    `${t.yourResult}: ${category}`,
    summary,
    `${t.yourPattern}:\n${lines.join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  return { content, category, summary };
};

type ReportBand = 'LOW' | 'MEDIUM' | 'HIGH';

// Built-in (system-generated) report wording, per language. Mentor-authored
// templates/content are NOT translated here — only the canned fallback text.
const BAND_LABEL: Record<Language, Record<ReportBand, string>> = {
  en: { LOW: 'Needs improvement', MEDIUM: 'Average', HIGH: 'Strong' },
  id: { LOW: 'Perlu peningkatan', MEDIUM: 'Rata-rata', HIGH: 'Kuat' },
};
const CATEGORY: Record<Language, Record<ReportBand, string>> = {
  en: { LOW: 'Beginner', MEDIUM: 'Intermediate', HIGH: 'Advanced' },
  id: { LOW: 'Pemula', MEDIUM: 'Menengah', HIGH: 'Mahir' },
};
const SUMMARY: Record<Language, Record<ReportBand, string>> = {
  en: {
    LOW: 'You are getting started — focus on building the fundamentals.',
    MEDIUM: 'You have a solid foundation with clear room to grow.',
    HIGH: 'You show strong proficiency in this area.',
  },
  id: {
    LOW: 'Anda baru memulai — fokuslah membangun dasar-dasarnya.',
    MEDIUM: 'Anda memiliki fondasi yang kuat dengan ruang untuk berkembang.',
    HIGH: 'Anda menunjukkan kemahiran yang kuat di bidang ini.',
  },
};
const STRINGS: Record<
  Language,
  {
    completedCategory: string;
    completedSummary: string;
    youScored: (s: number) => string;
    yourResult: string;
    yourPattern: string;
    thankYou: (title: string) => string;
    yourResultLabel: string;
    emailSubject: string;
  }
> = {
  en: {
    completedCategory: 'Completed',
    completedSummary: 'Thanks for completing the assessment.',
    youScored: (s) => `You scored ${s}.`,
    yourResult: 'Your result',
    yourPattern: 'Your pattern',
    thankYou: (title) => `Thank you for completing "${title}".`,
    yourResultLabel: 'Your result',
    emailSubject: 'Your LATO Assessment Result',
  },
  id: {
    completedCategory: 'Selesai',
    completedSummary: 'Terima kasih telah menyelesaikan asesmen ini.',
    youScored: (s) => `Skor Anda ${s}.`,
    yourResult: 'Hasil asesmen Anda',
    yourPattern: 'Pola jawaban Anda',
    thankYou: (title) => `Terima kasih telah menyelesaikan "${title}".`,
    yourResultLabel: 'Hasil Anda',
    emailSubject: 'Hasil Asesmen LATO Anda',
  },
};

const bandFor = (
  score: number,
  low: number | null,
  high: number | null,
): ReportBand | null => {
  if (low === null || high === null) return null;
  return score < low ? 'LOW' : score < high ? 'MEDIUM' : 'HIGH';
};

const renderTemplate = (
  template: string,
  vars: {
    score: number;
    category: string;
    assessment_title: string;
    summary: string;
    free_report?: string;
  },
): string =>
  template
    .replaceAll('{{score}}', String(vars.score))
    .replaceAll('{{category}}', vars.category)
    .replaceAll('{{assessment_title}}', vars.assessment_title)
    .replaceAll('{{summary}}', vars.summary)
    .replaceAll('{{free_report}}', vars.free_report ?? '');

/**
 * Generate the FREE report. Uses the mentor's free_report_template (with
 * {{score}}/{{category}}/{{assessment_title}}/{{summary}}) when set; otherwise
 * falls back to the legacy free_report_text + score band so existing
 * assessments keep working unchanged.
 */
const generateFreeReport = (
  assessment: AssessmentForReport,
  score: number,
  language: Language,
): { content: string; category: string; summary: string } => {
  const band = bandFor(
    score,
    assessment.lowScoreThreshold,
    assessment.highScoreThreshold,
  );
  const category = band ? CATEGORY[language][band] : STRINGS[language].completedCategory;
  const summary = band
    ? SUMMARY[language][band]
    : STRINGS[language].completedSummary;

  if (assessment.freeReportTemplate) {
    return {
      content: renderTemplate(assessment.freeReportTemplate, {
        score,
        category,
        assessment_title: assessment.title,
        summary,
      }),
      category,
      summary,
    };
  }

  // Legacy fallback (mentor free_report_text is left as-authored; only the
  // built-in band label + score line are localized).
  const parts: string[] = [];
  if (assessment.freeReportText) parts.push(assessment.freeReportText);
  if (band) parts.push(BAND_LABEL[language][band]);
  if (parts.length === 0) parts.push(STRINGS[language].youScored(score));
  return { content: parts.join('\n\n'), category, summary };
};

const buildEmailBody = (
  assessment: AssessmentForReport,
  score: number,
  category: string,
  summary: string,
  freeReport: string,
  language: Language,
): string => {
  if (assessment.emailTemplate) {
    return renderTemplate(assessment.emailTemplate, {
      score,
      category,
      assessment_title: assessment.title,
      summary,
      free_report: freeReport,
    });
  }
  const t = STRINGS[language];
  return [
    t.thankYou(assessment.title),
    `${t.yourResultLabel}:\n${freeReport}`,
  ].join('\n\n');
};

/**
 * Submit answers to a PUBLISHED assessment: validate answers, sum the selected
 * choice scores, persist the attempt + FREE report (single transaction), then
 * best-effort email the result. Returns the attempt id.
 */
export const submit = async (assessmentId: string, input: SubmitInput) => {
  const [assessment] = await db
    .select({
      id: assessments.id,
      status: assessments.status,
      title: assessments.title,
      freeReportText: assessments.freeReportText,
      freeReportTemplate: assessments.freeReportTemplate,
      emailTemplate: assessments.emailTemplate,
      lowScoreThreshold: assessments.lowScoreThreshold,
      highScoreThreshold: assessments.highScoreThreshold,
      resultCategories: assessments.resultCategories,
      accessMode: assessments.accessMode,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment || assessment.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Assessment not found');
  }

  // Taking the assessment is open to everyone — guests included, every mode.
  // The paywall now lives on the RESULT: gated modes (PAID/VOUCHER) gate the
  // report (see attempt.service.getReport), not the act of answering. This lets
  // a taker invest the effort first and unlock their results afterwards.

  const resultCategories: ResultCategories | null =
    assessment.resultCategories ?? null;
  const categoryMode = hasCategories(resultCategories);

  const questionRows = await db
    .select({
      id: questions.id,
      questionText: questions.questionText,
      explanation: questions.explanation,
    })
    .from(questions)
    .where(eq(questions.assessmentId, assessmentId))
    .orderBy(questions.createdAt);
  const questionById = new Map(questionRows.map((q) => [q.id, q]));

  const choiceRows = await db
    .select({
      id: choices.id,
      questionId: choices.questionId,
      choiceText: choices.choiceText,
      score: choices.score,
      categoryCodes: choices.categoryCodes,
    })
    .from(choices)
    .innerJoin(questions, eq(choices.questionId, questions.id))
    .where(eq(questions.assessmentId, assessmentId))
    // Order by mentor-defined position so A/B/C/D labels are deterministic.
    .orderBy(asc(choices.position), asc(choices.id));
  const choiceMap = new Map(choiceRows.map((c) => [c.id, c]));

  // Psychometric mode: each choice carries an answer key (category codes). It
  // takes priority over the legacy A/B/C/D position-counting category mode.
  const psychometric =
    categoryMode &&
    resultCategories !== null &&
    choiceRows.some((c) => (c.categoryCodes?.length ?? 0) > 0);
  // Initialize every configured category to 0 so unscored ones still appear.
  const scores: Record<string, number> = {};
  if (psychometric && resultCategories) {
    for (const code of Object.keys(resultCategories)) scores[code] = 0;
  }

  // Group each question's choices (ordered) so we can label them and find the
  // highest-scoring "expected" answer for the evaluation snapshot.
  const choicesByQuestion = new Map<string, typeof choiceRows>();
  for (const c of choiceRows) {
    const list = choicesByQuestion.get(c.questionId) ?? [];
    list.push(c);
    choicesByQuestion.set(c.questionId, list);
  }

  let score = 0;
  const snapshot: AnswerSnapshotItem[] = [];
  const distribution: Record<string, number> = {};
  let answeredCount = 0;
  for (const ans of input.answers) {
    const question = questionById.get(ans.question_id);
    if (!question) {
      throw new HttpError(
        400,
        'An answer references a question not in this assessment',
      );
    }
    const choice = choiceMap.get(ans.choice_id);
    if (!choice || choice.questionId !== ans.question_id) {
      throw new HttpError(400, 'An answer references an invalid choice');
    }
    score += choice.score;

    // Build the per-question evaluation snapshot + the category distribution.
    const qChoices = choicesByQuestion.get(ans.question_id) ?? [];
    const selectedIdx = qChoices.findIndex((c) => c.id === ans.choice_id);
    const best = qChoices.reduce(
      (acc, c, i) => (c.score > acc.choice.score ? { choice: c, i } : acc),
      { choice: qChoices[0], i: 0 },
    );
    const selectedLabel = labelFor(selectedIdx);
    distribution[selectedLabel] = (distribution[selectedLabel] ?? 0) + 1;
    answeredCount += 1;

    // Psychometric: increment each category code this choice maps to.
    if (psychometric && resultCategories) {
      for (const code of choice.categoryCodes ?? []) {
        if (code in scores) scores[code] += 1;
      }
    }
    snapshot.push({
      question: question.questionText,
      userAnswer: selectedLabel,
      userAnswerText: choice.choiceText,
      expectedAnswer: labelFor(best.i),
      expectedAnswerText: best.choice?.choiceText ?? '',
      explanation: question.explanation,
      score: choice.score,
    });
  }

  // Category engine when the mentor configured result_categories; otherwise the
  // existing exam-style score engine (unchanged).
  let categoryResult: CategoryResult | null = null;
  let content: string;
  let category: string;
  let summary: string;
  if (psychometric && resultCategories) {
    // Answer-key scoring: the winning category is the highest total.
    const winner = pickDominant(scores);
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    categoryResult = {
      distribution: scores,
      total,
      dominant: winner,
      dominantName: resultCategories[winner]?.name ?? `Result ${winner}`,
      categories: resultCategories,
      scores,
      winner,
    };
    ({ content, category, summary } = generateCategoryFreeReport(
      assessment,
      categoryResult,
      input.language,
    ));
  } else if (categoryMode && resultCategories) {
    // Legacy A/B/C/D position-counting category mode (unchanged).
    const dominant = pickDominant(distribution);
    categoryResult = {
      distribution,
      total: answeredCount,
      dominant,
      dominantName: resultCategories[dominant]?.name ?? `Result ${dominant}`,
      categories: resultCategories,
    };
    ({ content, category, summary } = generateCategoryFreeReport(
      assessment,
      categoryResult,
      input.language,
    ));
  } else {
    ({ content, category, summary } = generateFreeReport(
      assessment,
      score,
      input.language,
    ));
  }

  const result = await db.transaction(async (tx) => {
    const [attempt] = await tx
      .insert(attempts)
      .values({
        assessmentId,
        userId: input.userId,
        guestEmail: input.guestEmail,
        totalScore: score,
        answersSnapshot: snapshot,
        categoryResult,
        reportLanguage: input.language,
      })
      .returning({ id: attempts.id });

    // The report is stored now but gated behind auth (see attempt.service).
    await tx.insert(reports).values({
      attemptId: attempt.id,
      reportType: 'FREE',
      content,
    });

    return { attemptId: attempt.id };
  });

  // --- Best-effort email of the FREE report (never blocks/breaks submit) ---
  void (async () => {
    let recipient: string | null = input.guestEmail;
    if (input.userId) {
      const [u] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      recipient = u?.email ?? recipient;
    }
    if (!recipient) return;
    await sendEmail({
      to: recipient,
      subject: STRINGS[input.language].emailSubject,
      body: buildEmailBody(
        assessment,
        score,
        category,
        summary,
        content,
        input.language,
      ),
    });
  })().catch((err) => console.error('[email] post-submit send error:', err));

  return result;
};
