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

export type GeneratedChoice = { text: string; score: number };
export type GeneratedQuestion = {
  question: string;
  choices: GeneratedChoice[];
  correct_answer: string;
  explanation: string;
};

/**
 * Convert raw pasted text into structured MCQ questions. Validates the AI's
 * JSON and rejects malformed output.
 */
export const generateQuestionsFromText = async (
  rawText: string,
): Promise<GeneratedQuestion[]> => {
  const system =
    'You convert raw assessment text into structured multiple-choice questions. ' +
    'Respond ONLY with JSON of shape ' +
    '{"questions":[{"question":string,"choices":[{"text":string,"score":number}],' +
    '"correct_answer":string,"explanation":string}]}. ' +
    'Scores are integers. Do not include any prose outside the JSON.';
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
      choices.push({
        text: c.text,
        score: Number.isFinite(num) ? Math.round(num) : 0,
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

/**
 * Generate a premium report (markdown sections) from assessment context.
 */
export const generatePremiumReport = async (ctx: {
  title: string;
  baseKnowledge: string | null;
  score: number;
  freeReport: string;
  questions: string[];
}): Promise<string> => {
  const system =
    'You are an expert assessment analyst. Write a clear, encouraging premium ' +
    'report using EXACTLY these markdown sections, in order: ' +
    '## Overview, ## Strengths, ## Weaknesses, ## Recommendations, ' +
    '## 30-Day Improvement Roadmap.';
  const user = [
    `Assessment: ${ctx.title}`,
    ctx.baseKnowledge ? `Scoring guidance: ${ctx.baseKnowledge}` : '',
    `Score: ${ctx.score}`,
    `Free report:\n${ctx.freeReport}`,
    ctx.questions.length ? `Questions:\n- ${ctx.questions.join('\n- ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return chat([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
};
