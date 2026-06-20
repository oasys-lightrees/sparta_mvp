import 'dotenv/config';
import { HttpError } from '../utils/http-error';

/**
 * The ONLY place that talks to OpenAI. Backend-only — the API key is never
 * exposed to the browser. Direct REST calls (no SDK/LangChain/agents).
 *
 * Config (env only, no hardcoded model):
 *   OPENAI_API_KEY   (required to use AI; absent -> clear 503, app still runs)
 *   OPENAI_MODEL     (default gpt-5-mini)
 *   OPENAI_BASE_URL  (default https://api.openai.com/v1)
 */
const BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5-mini';
const TIMEOUT_MS = 30_000;

export const isAiConfigured = (): boolean =>
  Boolean(process.env.OPENAI_API_KEY);

type ChatMessage = { role: 'system' | 'user'; content: string };

const chat = async (
  messages: ChatMessage[],
  opts: { json?: boolean } = {},
): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(503, 'AI is not configured (OPENAI_API_KEY is missing)');
  }
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new HttpError(502, `AI request failed (status ${res.status})`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
      throw new HttpError(502, 'AI returned an empty response');
    }
    return content;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new HttpError(504, 'AI request timed out');
    }
    throw new HttpError(502, 'AI request failed');
  } finally {
    clearTimeout(timer);
  }
};

export type GeneratedChoice = {
  text: string;
  score: number;
  categories: string[];
};
export type GeneratedQuestion = {
  question: string;
  choices: GeneratedChoice[];
  correct_answer: string;
  explanation: string;
};

// Category context passed to the question generator so it can assign mappings.
export type GeneratorCategory = { code: string; name: string };

/**
 * Convert raw pasted text into structured MCQ questions. Validates the AI's
 * JSON and rejects malformed output.
 */
export const generateQuestionsFromText = async (
  rawText: string,
  categories?: GeneratorCategory[],
): Promise<GeneratedQuestion[]> => {
  const hasCats = Array.isArray(categories) && categories.length > 0;
  const catList = hasCats
    ? categories!.map((c) => `${c.code} (${c.name})`).join(', ')
    : '';

  const system =
    'You convert raw assessment text into structured diagnostic ' +
    'multiple-choice questions for a personality/category assessment. ' +
    'Each question must offer distinct answer options that represent DIFFERENT ' +
    'types, styles, or preferences — NOT one correct answer and others wrong. ' +
    (hasCats
      ? `The available result categories are: ${catList}. For EVERY choice, set ` +
        '"maps_to" to an array of the category CODES that selecting it should ' +
        'increase (usually one, occasionally more). Use ONLY codes from the list.'
      : 'Set "maps_to" to an empty array for every choice.') +
    ' Respond ONLY with JSON of shape ' +
    '{"questions":[{"question":string,"choices":[{"text":string,"score":number,' +
    '"maps_to":[string]}],"correct_answer":string,"explanation":string}]}. ' +
    'Use score 0 for every choice (diagnostic answers are not graded) and leave ' +
    'correct_answer as an empty string. Use explanation to briefly note what the ' +
    'question reveals. Do not include any prose outside the JSON.';
  const user = `Convert the following into questions JSON:\n\n${rawText}`;

  const content = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { json: true },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, 'AI returned malformed JSON');
  }

  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw new HttpError(502, 'AI response is missing a questions array');
  }

  const result: GeneratedQuestion[] = [];
  for (const raw of questions) {
    const q = raw as Record<string, unknown>;
    if (typeof q?.question !== 'string' || !Array.isArray(q.choices)) {
      throw new HttpError(502, 'AI returned an invalid question');
    }
    const choices: GeneratedChoice[] = [];
    for (const rawChoice of q.choices) {
      const c = rawChoice as Record<string, unknown>;
      if (typeof c?.text !== 'string') {
        throw new HttpError(502, 'AI returned an invalid choice');
      }
      const num = Number(c.score);
      const mapsTo = Array.isArray(c.maps_to)
        ? c.maps_to.filter((x): x is string => typeof x === 'string')
        : [];
      choices.push({
        text: c.text,
        score: Number.isFinite(num) ? Math.round(num) : 0,
        categories: mapsTo,
      });
    }
    if (choices.length === 0) {
      throw new HttpError(502, 'AI returned a question with no choices');
    }
    result.push({
      question: q.question,
      choices,
      correct_answer:
        typeof q.correct_answer === 'string' ? q.correct_answer : '',
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    });
  }

  if (result.length === 0) {
    throw new HttpError(502, 'AI returned no questions');
  }
  return result;
};

// Per-question evidence used to ground the premium report. Mirrors the
// AnswerSnapshotItem stored on the attempt.
export type AnswerEvidence = {
  question: string;
  userAnswer: string;
  userAnswerText: string;
  expectedAnswer: string;
  expectedAnswerText: string;
  explanation: string | null;
  score: number;
};

const REPORT_SECTIONS =
  '## Overview, ## Strengths, ## Weaknesses, ## Recommendations, ' +
  '## 30-Day Improvement Roadmap';

const CATEGORY_SECTIONS =
  '## Personality Overview, ## Strengths, ## Blind Spots, ' +
  '## Growth Recommendations, ## Action Roadmap';

// Category (diagnostic/personality) context for the premium report.
export type CategoryReportContext = {
  dominantName: string;
  dominantKnowledge: string;
  distribution: { label: string; name: string; pct: number }[];
};

/**
 * Generate a premium report for a diagnostic/personality (category) assessment.
 * The AI describes the taker's result TYPE — it must never talk about correct,
 * wrong, or missed answers.
 */
const generateCategoryReport = async (ctx: {
  title: string;
  baseKnowledge: string | null;
  freeReport: string;
  category: CategoryReportContext;
}): Promise<string> => {
  const system = [
    'You are a seasoned mentor writing a personalized diagnostic report.',
    `Write EXACTLY these markdown sections, in order: ${CATEGORY_SECTIONS}.`,
    'Write in a warm, professional, second-person voice.',
    'This is a personality/diagnostic assessment, NOT an exam. The taker has a ' +
      'result TYPE based on their answer pattern. NEVER mention correct, wrong, ' +
      'incorrect, or missed answers, and never imply any answer was a mistake.',
    'Describe what their dominant result type means, where they naturally excel, ' +
      'their blind spots, and how to grow — grounded in the category knowledge ' +
      'and the assessment guidance.',
  ].join(' ');

  const patternBlock = ctx.category.distribution
    .map((d) => `- ${d.name} (${d.label}): ${d.pct}%`)
    .join('\n');

  const user = [
    `Assessment: ${ctx.title}`,
    ctx.baseKnowledge ? `Assessment knowledge: ${ctx.baseKnowledge}` : '',
    `Dominant result: ${ctx.category.dominantName}`,
    ctx.category.dominantKnowledge
      ? `What this result means: ${ctx.category.dominantKnowledge}`
      : '',
    `Answer pattern (how often each type was chosen):\n${patternBlock}`,
    `Free report:\n${ctx.freeReport}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
};

/**
 * Generate a premium report (markdown sections) from assessment context.
 *
 * - When `category` context is provided, a diagnostic/personality report is
 *   produced (no correct/wrong language).
 * - Otherwise, when `answers` (the per-question evaluation snapshot) is
 *   provided, the report is grounded in the actual choices vs. expected answers.
 * - Otherwise it falls back to a score-only report (older attempts).
 */
export const generatePremiumReport = async (ctx: {
  title: string;
  baseKnowledge: string | null;
  score: number;
  category?: string | null;
  freeReport: string;
  questions: string[];
  answers?: AnswerEvidence[] | null;
  categoryContext?: CategoryReportContext | null;
}): Promise<string> => {
  // Category engine takes precedence when configured.
  if (ctx.categoryContext) {
    return generateCategoryReport({
      title: ctx.title,
      baseKnowledge: ctx.baseKnowledge,
      freeReport: ctx.freeReport,
      category: ctx.categoryContext,
    });
  }

  const hasEvidence = Array.isArray(ctx.answers) && ctx.answers.length > 0;

  const system = [
    'You are a seasoned mentor writing a personalized premium assessment report.',
    `Write EXACTLY these markdown sections, in order: ${REPORT_SECTIONS}.`,
    'Write in a warm, professional, second-person voice ("your responses show…").',
    hasEvidence
      ? 'Ground every claim in the evidence below: cite specific questions, ' +
        'compare the choice the taker made against the expected answer, and use ' +
        'the explanations. Identify strengths from questions answered well and ' +
        'weaknesses from questions where the answer fell short of the expected ' +
        'one. Base recommendations on the assessment scoring guidance.'
      : 'Base your analysis on the score and assessment context provided.',
    'Do NOT just restate the numeric score (avoid "you scored X"); describe ' +
      'what the responses reveal about ability and where to improve.',
  ].join(' ');

  const evidenceBlock = hasEvidence
    ? 'Per-question evidence (the taker\'s answer vs. the expected best answer):\n' +
      ctx
        .answers!.map((a, i) => {
          const matched =
            a.userAnswer === a.expectedAnswer ? 'MATCH' : 'MISSED';
          return [
            `Q${i + 1}. ${a.question}`,
            `  - Their answer (${a.userAnswer}): ${a.userAnswerText} [${matched}, earned ${a.score}]`,
            `  - Expected best answer (${a.expectedAnswer}): ${a.expectedAnswerText}`,
            a.explanation ? `  - Explanation: ${a.explanation}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n')
    : '';

  const user = [
    `Assessment: ${ctx.title}`,
    ctx.baseKnowledge ? `Scoring guidance: ${ctx.baseKnowledge}` : '',
    `Total score: ${ctx.score}${ctx.category ? ` (level: ${ctx.category})` : ''}`,
    `Free report:\n${ctx.freeReport}`,
    evidenceBlock,
    // Fallback context when no per-answer evidence is available.
    !hasEvidence && ctx.questions.length
      ? `Questions:\n- ${ctx.questions.join('\n- ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
};
