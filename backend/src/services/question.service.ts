import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { assessments, choices, questions } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type ChoiceInput = {
  choice_text: string;
  score: number;
};

export type AddQuestionInput = {
  question_text: string;
  choices: ChoiceInput[];
};

export type UpdateQuestionInput = {
  question_text?: string;
  choices?: ChoiceInput[];
};

type ChoiceView = { id: string; choice_text: string; score: number };
type QuestionView = {
  id: string;
  question_text: string;
  choices: ChoiceView[];
};

const toChoiceView = (row: {
  id: string;
  choiceText: string;
  score: number;
}): ChoiceView => ({
  id: row.id,
  choice_text: row.choiceText,
  score: row.score,
});

/**
 * Ensure the mentor owns the assessment. 404 if missing, 403 if not owner.
 */
const assertAssessmentOwned = async (mentorId: string, assessmentId: string) => {
  const [row] = await db
    .select({ mentorId: assessments.mentorId })
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'Assessment not found');
  }
  if (row.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }
};

/**
 * Ensure the mentor owns the assessment that the question belongs to.
 * 404 if the question is missing, 403 if it belongs to another mentor.
 */
const assertQuestionOwned = async (mentorId: string, questionId: string) => {
  const [row] = await db
    .select({ mentorId: assessments.mentorId })
    .from(questions)
    .innerJoin(assessments, eq(questions.assessmentId, assessments.id))
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'Question not found');
  }
  if (row.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this question');
  }
};

/**
 * Add a question and its choices to an owned assessment (single transaction).
 */
export const addQuestion = async (
  mentorId: string,
  assessmentId: string,
  input: AddQuestionInput,
): Promise<QuestionView> => {
  await assertAssessmentOwned(mentorId, assessmentId);

  return db.transaction(async (tx) => {
    const [question] = await tx
      .insert(questions)
      .values({ assessmentId, questionText: input.question_text.trim() })
      .returning({ id: questions.id, questionText: questions.questionText });

    const insertedChoices = await tx
      .insert(choices)
      .values(
        input.choices.map((ch) => ({
          questionId: question.id,
          choiceText: ch.choice_text.trim(),
          score: ch.score,
        })),
      )
      .returning({
        id: choices.id,
        choiceText: choices.choiceText,
        score: choices.score,
      });

    return {
      id: question.id,
      question_text: question.questionText,
      choices: insertedChoices.map(toChoiceView),
    };
  });
};

/**
 * Update a question's text and/or fully replace its choices. The mentor must
 * own the parent assessment. At least one field is expected (enforced by route).
 */
export const updateQuestion = async (
  mentorId: string,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<QuestionView> => {
  await assertQuestionOwned(mentorId, questionId);

  return db.transaction(async (tx) => {
    if (input.question_text !== undefined) {
      await tx
        .update(questions)
        .set({ questionText: input.question_text.trim() })
        .where(eq(questions.id, questionId));
    }

    if (input.choices !== undefined) {
      await tx.delete(choices).where(eq(choices.questionId, questionId));
      await tx.insert(choices).values(
        input.choices.map((ch) => ({
          questionId,
          choiceText: ch.choice_text.trim(),
          score: ch.score,
        })),
      );
    }

    const [question] = await tx
      .select({ id: questions.id, questionText: questions.questionText })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    const currentChoices = await tx
      .select({
        id: choices.id,
        choiceText: choices.choiceText,
        score: choices.score,
      })
      .from(choices)
      .where(eq(choices.questionId, questionId));

    return {
      id: question.id,
      question_text: question.questionText,
      choices: currentChoices.map(toChoiceView),
    };
  });
};

/**
 * Delete a question (its choices cascade via FK). Mentor must own it.
 */
export const deleteQuestion = async (mentorId: string, questionId: string) => {
  await assertQuestionOwned(mentorId, questionId);
  await db.delete(questions).where(eq(questions.id, questionId));
};

/**
 * Mentor editing view: the full assessment (any status) with its questions,
 * choices and scores. Owner only — scores ARE included here (not public).
 */
export const getMentorAssessmentDetail = async (
  mentorId: string,
  assessmentId: string,
) => {
  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  if (!assessment) {
    throw new HttpError(404, 'Assessment not found');
  }
  if (assessment.mentorId !== mentorId) {
    throw new HttpError(403, 'You do not own this assessment');
  }

  const questionRows = await db
    .select({ id: questions.id, questionText: questions.questionText })
    .from(questions)
    .where(eq(questions.assessmentId, assessmentId))
    .orderBy(questions.createdAt);

  const questionIds = questionRows.map((q) => q.id);
  const choiceRows = questionIds.length
    ? await db
        .select({
          id: choices.id,
          questionId: choices.questionId,
          choiceText: choices.choiceText,
          score: choices.score,
        })
        .from(choices)
        .where(inArray(choices.questionId, questionIds))
    : [];

  const choicesByQuestion = new Map<string, ChoiceView[]>();
  for (const ch of choiceRows) {
    const list = choicesByQuestion.get(ch.questionId) ?? [];
    list.push(toChoiceView(ch));
    choicesByQuestion.set(ch.questionId, list);
  }

  return {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    status: assessment.status,
    free_report_text: assessment.freeReportText,
    low_score_threshold: assessment.lowScoreThreshold,
    high_score_threshold: assessment.highScoreThreshold,
    price: assessment.price,
    created_at: assessment.createdAt,
    updated_at: assessment.updatedAt,
    questions: questionRows.map((q) => ({
      id: q.id,
      question_text: q.questionText,
      choices: choicesByQuestion.get(q.id) ?? [],
    })),
  };
};
