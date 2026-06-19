import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  assessments,
  attempts,
  choices,
  questions,
  reports,
  users,
} from '../db/schema';
import { HttpError } from '../utils/http-error';
import { sendEmail } from './email.service';

export type SubmitAnswer = {
  question_id: string;
  choice_id: string;
};

export type SubmitInput = {
  userId: string | null;
  guestEmail: string | null;
  answers: SubmitAnswer[];
};

type AssessmentForReport = {
  title: string;
  freeReportText: string | null;
  freeReportTemplate: string | null;
  premiumReportDescription: string | null;
  emailTemplate: string | null;
  lowScoreThreshold: number | null;
  highScoreThreshold: number | null;
};

type ReportBand = 'LOW' | 'MEDIUM' | 'HIGH';
const BAND_LABEL: Record<ReportBand, string> = {
  LOW: 'Needs improvement',
  MEDIUM: 'Average',
  HIGH: 'Strong',
};

const CATEGORY: Record<ReportBand, string> = {
  LOW: 'Beginner',
  MEDIUM: 'Intermediate',
  HIGH: 'Advanced',
};
const SUMMARY: Record<ReportBand, string> = {
  LOW: 'You are getting started — focus on building the fundamentals.',
  MEDIUM: 'You have a solid foundation with clear room to grow.',
  HIGH: 'You show strong proficiency in this area.',
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
): { content: string; category: string; summary: string } => {
  const band = bandFor(
    score,
    assessment.lowScoreThreshold,
    assessment.highScoreThreshold,
  );
  const category = band ? CATEGORY[band] : 'Completed';
  const summary = band ? SUMMARY[band] : 'Thanks for completing the assessment.';

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

  // Legacy fallback (unchanged behaviour).
  const parts: string[] = [];
  if (assessment.freeReportText) parts.push(assessment.freeReportText);
  if (band) parts.push(BAND_LABEL[band]);
  if (parts.length === 0) parts.push(`You scored ${score}.`);
  return { content: parts.join('\n\n'), category, summary };
};

const buildEmailBody = (
  assessment: AssessmentForReport,
  score: number,
  category: string,
  summary: string,
  freeReport: string,
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
  const upsell =
    assessment.premiumReportDescription ??
    'Unlock the premium report for a deeper, personalized analysis.';
  return [
    `Thank you for completing "${assessment.title}".`,
    `Your result:\n${freeReport}`,
    `Premium report:\n${upsell}`,
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
      premiumReportDescription: assessments.premiumReportDescription,
      emailTemplate: assessments.emailTemplate,
      lowScoreThreshold: assessments.lowScoreThreshold,
      highScoreThreshold: assessments.highScoreThreshold,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment || assessment.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Assessment not found');
  }

  const questionRows = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.assessmentId, assessmentId));
  const questionIds = new Set(questionRows.map((q) => q.id));

  const choiceRows = await db
    .select({
      id: choices.id,
      questionId: choices.questionId,
      score: choices.score,
    })
    .from(choices)
    .innerJoin(questions, eq(choices.questionId, questions.id))
    .where(eq(questions.assessmentId, assessmentId));
  const choiceMap = new Map(choiceRows.map((c) => [c.id, c]));

  let score = 0;
  for (const ans of input.answers) {
    if (!questionIds.has(ans.question_id)) {
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
  }

  const { content, category, summary } = generateFreeReport(assessment, score);

  const result = await db.transaction(async (tx) => {
    const [attempt] = await tx
      .insert(attempts)
      .values({
        assessmentId,
        userId: input.userId,
        guestEmail: input.guestEmail,
        totalScore: score,
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
      subject: 'Your SPARTA Assessment Result',
      body: buildEmailBody(assessment, score, category, summary, content),
    });
  })().catch((err) => console.error('[email] post-submit send error:', err));

  return result;
};
