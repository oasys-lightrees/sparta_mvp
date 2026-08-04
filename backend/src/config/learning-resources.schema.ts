import { z } from 'zod';

/**
 * Learning resources configuration.
 *
 * A configuration-driven document attached to an assessment that maps each
 * result *profile* to a curated set of learning resources. It lives next to the
 * other presentation config on the assessment row (like `resultCategories` and
 * the legacy `studyVideoUrl`) rather than per question, so mentors curate what
 * a taker should study based on the RESULT they got.
 *
 * Resources are intentionally not video-only: the schema is an extensible union
 * (`video | pdf | article | file | link | course`). New types are added by
 * extending `RESOURCE_TYPES` — everything else (storage, validation, rendering
 * fallbacks) is type-agnostic, so future resource kinds are additive.
 *
 * "Uploaded" vs "external" video is a URL distinction, mirroring how the rest of
 * the app handles media (cover images, the legacy study video are all URL-based):
 * an external video is a YouTube/Vimeo watch URL; an uploaded video is a direct
 * file URL (…\.mp4/\.webm) served from storage. The player picks the right
 * embed/native element from the URL, so a future upload endpoint only needs to
 * produce a URL — no schema change.
 */

// The set of supported resource kinds. Extend this to add new types; nothing
// else in the pipeline is hardcoded to "video".
export const RESOURCE_TYPES = [
  'video',
  'pdf',
  'article',
  'file',
  'link',
  'course',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

// Who can see a resource. `premium` resources are a paid perk — resolved only
// after the taker unlocks the premium report (same gate as the legacy video).
export const RESOURCE_ACCESS = ['free', 'premium'] as const;
export type ResourceAccess = (typeof RESOURCE_ACCESS)[number];

export const LearningResourceSchema = z.object({
  // Stable client-generated id (used for list keys, ordering, future edits).
  id: z.string().min(1),
  type: z.enum(RESOURCE_TYPES),
  title: z.string().min(1),
  description: z.string().default(''),
  // External URL or a direct/hosted file URL (see file header).
  url: z.string().url(),
  access: z.enum(RESOURCE_ACCESS).default('premium'),
  // Type-specific metadata bag (reserved & extensible): e.g. durationMinutes,
  // thumbnailUrl, author, pageCount. Never required so adding fields is additive.
  meta: z.record(z.string(), z.unknown()).default({}),
});
export type LearningResource = z.infer<typeof LearningResourceSchema>;

export const LearningResourcesSchema = z
  .object({
    version: z.literal(1).default(1),
    // Resources shown for EVERY result of this assessment.
    shared: z.array(LearningResourceSchema).default([]),
    // Resources keyed by result-profile code: a result-category code for
    // personality assessments (e.g. "PB"), or the score level for skill
    // assessments (e.g. "Beginner"). Missing key -> no profile-specific extras.
    byProfile: z.record(z.string(), z.array(LearningResourceSchema)).default({}),
  })
  .default({ version: 1, shared: [], byProfile: {} });
export type LearningResources = z.infer<typeof LearningResourcesSchema>;

/**
 * Parse an unknown value as a LearningResources document. Throws ZodError on
 * failure. Accepts null/undefined -> a valid empty document (so clearing works).
 */
export const parseLearningResources = (value: unknown): LearningResources =>
  LearningResourcesSchema.parse(value ?? undefined);

export type ResolvedResources = {
  items: LearningResource[];
  // Count of premium resources hidden because the report isn't unlocked yet.
  // Lets the UI show "unlock for N more" without leaking the resource URLs.
  locked: number;
};

/**
 * Resolve the resources a taker should see for their result. Combines the
 * profile-specific resources (most relevant, listed first) with the shared
 * ones, then applies the premium gate: `free` resources are always returned;
 * `premium` resources only once `premiumUnlocked` — otherwise they're counted
 * in `locked` so the URL never reaches a non-purchaser.
 */
export const resolveLearningResources = (
  doc: LearningResources | null | undefined,
  opts: { profileCode?: string | null; premiumUnlocked: boolean },
): ResolvedResources => {
  if (!doc) return { items: [], locked: 0 };
  const profile = opts.profileCode ? (doc.byProfile[opts.profileCode] ?? []) : [];
  const pool = [...profile, ...doc.shared];

  const items: LearningResource[] = [];
  let locked = 0;
  for (const r of pool) {
    if (r.access === 'free' || opts.premiumUnlocked) items.push(r);
    else locked += 1;
  }
  return { items, locked };
};
