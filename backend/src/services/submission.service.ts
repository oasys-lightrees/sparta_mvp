import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, attempts, choices, questions, reports } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type SubmitAnswer = {
  question_id: string;
  choice_id: string;
};

export type SubmitInput = {
  userId: string | null;
  guestEmail: string | null;
  answers: SubmitAnswer[];
};

type ReportBand = 'LOW' | 'MEDIUM' | 'HIGH';

const BAND_LABEL: Record<ReportBand, string> = {
  LOW: 'Needs improvement',
  MEDIUM: 'Average',
  HIGH: 'Strong',
};

/**
 * Build the FREE report text from the assessment's thresholds:
 *   score < low                  -> LOW
 *   low <= score < high          -> MEDIUM
 *   score >= high                -> HIGH
 * The optional free_report_text is included as an intro when set. If thresholds
 * are not configured, fall back to a simple score line.
 */
const generateReportContent = (
  assessment: {
    freeReportText: string | null;
    lowScoreThreshold: number | null;
    highScoreThreshold: number | null;
  },
  score: number,
): string => {
  const parts: string[] = [];

  if (assessment.freeReportText) {
    parts.push(assessment.freeReportText);
  }

  if (
    assessment.lowScoreThreshold !== null &&
    assessment.highScoreThreshold !== null
  ) {
    const band: ReportBand =
      score < assessment.lowScoreThreshold
        ? 'LOW'
        : score < assessment.highScoreThreshold
          ? 'MEDIUM'
          : 'HIGH';
    parts.push(BAND_LABEL[band]);
  }

  if (parts.length === 0) {
    parts.push(`You scored ${score}.`);
  }

  return parts.join('\n\n');
};

/**
 * Submit answers to a PUBLISHED assessment: validate answers, sum the selected
 * choice scores, persist the attempt + FREE report (single transaction), and
 * return the score and report.
 */
export const submit = async (assessmentId: string, input: SubmitInput) => {
  const [assessment] = await db
    .select({
      id: assessments.id,
      status: assessments.status,
      freeReportText: assessments.freeReportText,
      lowScoreThreshold: assessments.lowScoreThreshold,
      highScoreThreshold: assessments.highScoreThreshold,
    })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment || assessment.status !== 'PUBLISHED') {
    throw new HttpError(404, 'Assessment not found');
  }

  // Valid question ids for this assessment.
  const questionRows = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.assessmentId, assessmentId));
  const questionIds = new Set(questionRows.map((q) => q.id));

  // Valid choices (with parent question + score) for this assessment.
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

  return db.transaction(async (tx) => {
    const [attempt] = await tx
      .insert(attempts)
      .values({
        assessmentId,
        userId: input.userId,
        guestEmail: input.guestEmail,
        totalScore: score,
      })
      .returning({ id: attempts.id });

    const content = generateReportContent(assessment, score);

    await tx.insert(reports).values({
      attemptId: attempt.id,
      reportType: 'FREE',
      content,
    });

    return {
      score,
      report: { type: 'FREE' as const, content },
    };
  });
};
