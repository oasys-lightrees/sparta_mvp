import type { ResultCategories } from '../db/schema';

/**
 * Shared helpers for the diagnostic / personality "category" engine.
 *
 * Each answer position (A, B, C…) maps to a result category. The dominant
 * category is the position the taker chose most often. This is intentionally
 * separate from the exam-style score engine.
 */

export const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const labelFor = (index: number): string =>
  index < LABELS.length ? LABELS[index] : `#${index + 1}`;

/** True when the assessment is configured for the category engine. */
export const hasCategories = (
  rc: ResultCategories | null | undefined,
): rc is ResultCategories => !!rc && Object.keys(rc).length > 0;

/**
 * The label chosen most often. Iterates labels in ascending order and keeps the
 * first strict maximum, so ties resolve to the earlier label (A before B…).
 */
export const pickDominant = (distribution: Record<string, number>): string => {
  let best = '';
  let bestCount = -1;
  for (const label of Object.keys(distribution).sort()) {
    if (distribution[label] > bestCount) {
      best = label;
      bestCount = distribution[label];
    }
  }
  return best;
};

/** Per-label percentage of the total (rounded). */
export const percentFor = (count: number, total: number): number =>
  total > 0 ? Math.round((count / total) * 100) : 0;
