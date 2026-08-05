'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  LearningResource,
  LearningResourceAccess,
  LearningResourceType,
  LearningResourcesDoc,
  VideoProvider,
} from '@/types';

// A result profile the mentor can attach resources to (a personality category
// code, or a skill level). `code` is the storage key; `label` is display-only.
export type ResourceProfile = { code: string; label: string };

const SHARED = '__shared__';

// Per-type "Add" buttons shown under each result section.
const ADD_TYPES: { type: LearningResourceType; label: string }[] = [
  { type: 'video', label: 'Video' },
  { type: 'pdf', label: 'PDF' },
  { type: 'article', label: 'Article' },
  { type: 'link', label: 'Link' },
  { type: 'course', label: 'Course' },
  { type: 'file', label: 'File' },
];

const TYPE_LABEL: Record<LearningResourceType, string> = {
  video: 'Video',
  pdf: 'PDF',
  article: 'Article',
  file: 'File',
  link: 'Link',
  course: 'Course',
};

const PROVIDER_OPTIONS: { value: VideoProvider | ''; label: string }[] = [
  { value: '', label: 'Auto-detect' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'mp4', label: 'Direct MP4' },
  { value: 'file', label: 'Uploaded file' },
  { value: 'external', label: 'External' },
];

// Flat editor row: a resource plus the bucket (result) it belongs to.
type Row = {
  id: string;
  type: LearningResourceType;
  title: string;
  description: string;
  url: string;
  access: LearningResourceAccess;
  bucket: string;
  // Optional video metadata.
  provider: VideoProvider | '';
  thumbnailUrl: string;
  durationLabel: string;
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const toRow = (r: LearningResource, bucket: string): Row => ({
  id: r.id || newId(),
  type: r.type,
  title: r.title,
  description: r.description ?? '',
  url: r.url,
  access: r.access,
  bucket,
  provider: r.provider ?? '',
  thumbnailUrl: r.thumbnailUrl ?? '',
  durationLabel: r.durationLabel ?? '',
});

// Flatten a stored doc into editor rows.
const flatten = (doc: LearningResourcesDoc | null | undefined): Row[] => {
  if (!doc) return [];
  const rows: Row[] = [];
  for (const r of doc.shared ?? []) rows.push(toRow(r, SHARED));
  for (const [code, list] of Object.entries(doc.byProfile ?? {})) {
    for (const r of list) rows.push(toRow(r, code));
  }
  return rows;
};

// Build a storage doc from rows (only rows with a title + url are kept). Returns
// null when there are no valid resources, so the field clears cleanly.
const build = (rows: Row[]): LearningResourcesDoc | null => {
  const shared: LearningResource[] = [];
  const byProfile: Record<string, LearningResource[]> = {};
  for (const row of rows) {
    if (row.title.trim() === '' || row.url.trim() === '') continue;
    const resource: LearningResource = {
      id: row.id,
      type: row.type,
      title: row.title.trim(),
      description: row.description.trim(),
      url: row.url.trim(),
      access: row.access,
      meta: {},
    };
    // Attach optional video metadata only for videos, and only when set.
    if (row.type === 'video') {
      if (row.provider) resource.provider = row.provider;
      if (row.thumbnailUrl.trim()) resource.thumbnailUrl = row.thumbnailUrl.trim();
      if (row.durationLabel.trim()) resource.durationLabel = row.durationLabel.trim();
    }
    if (row.bucket === SHARED) shared.push(resource);
    else (byProfile[row.bucket] ??= []).push(resource);
  }
  if (shared.length === 0 && Object.keys(byProfile).length === 0) return null;
  return { version: 1, shared, byProfile };
};

/** One editable resource card. */
function ResourceCard({
  row,
  onChange,
  onRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const isVideo = row.type === 'video';
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {TYPE_LABEL[row.type]}
        </span>
        <select
          className={selectClass}
          value={row.access}
          onChange={(e) =>
            onChange({ access: e.target.value as LearningResourceAccess })
          }
          aria-label="Access level"
        >
          <option value="free">Free (shown on result)</option>
          <option value="premium">Premium (after unlock)</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
      <Input
        value={row.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder={isVideo ? 'Title (e.g. Leadership Introduction)' : 'Title'}
        aria-label="Resource title"
      />
      <Input
        type="url"
        value={row.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder={
          isVideo
            ? 'https://youtube.com/watch?v=… (or Vimeo / direct .mp4)'
            : 'https://… (PDF, article, file or link URL)'
        }
        aria-label="Resource URL"
      />
      <Textarea
        value={row.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Short description (optional)"
        aria-label="Resource description"
      />
      {isVideo ? (
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClass}
            value={row.provider}
            onChange={(e) =>
              onChange({ provider: e.target.value as VideoProvider | '' })
            }
            aria-label="Video provider"
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Input
            className="flex-1"
            value={row.durationLabel}
            onChange={(e) => onChange({ durationLabel: e.target.value })}
            placeholder="Duration (e.g. 12 min)"
            aria-label="Video duration"
          />
          <Input
            className="w-full"
            type="url"
            value={row.thumbnailUrl}
            onChange={(e) => onChange({ thumbnailUrl: e.target.value })}
            placeholder="Thumbnail URL (optional)"
            aria-label="Video thumbnail URL"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Mentor editor for an assessment's learning resources, organized per result:
 * a "Shared resources" section shown for every result, plus an independent
 * library for each result profile (personality result / score level). Each
 * section has per-type add buttons. Emits the normalized {shared, byProfile}
 * document on every change — the storage shape is unchanged.
 */
export function LearningResourcesEditor({
  initial,
  profiles,
  onChange,
}: {
  initial: LearningResourcesDoc | null;
  profiles: ResourceProfile[];
  onChange: (doc: LearningResourcesDoc | null) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => flatten(initial));

  const apply = (next: Row[]) => {
    setRows(next);
    onChange(build(next));
  };

  const setRow = (id: string, patch: Partial<Row>) =>
    apply(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => apply(rows.filter((r) => r.id !== id));
  const addRow = (bucket: string, type: LearningResourceType) =>
    apply([
      ...rows,
      {
        id: newId(),
        type,
        title: '',
        description: '',
        url: '',
        // Result-specific resources default to free so takers see them on the
        // result; the mentor can switch any to premium.
        access: 'free',
        bucket,
        provider: '',
        thumbnailUrl: '',
        durationLabel: '',
      },
    ]);

  // Sections: Shared first, then each result profile, then any orphaned bucket
  // still holding rows (so renaming a personality category never drops data).
  const sections = useMemo(() => {
    const base: ResourceProfile[] = [
      { code: SHARED, label: 'Shared resources' },
      ...profiles,
    ];
    const known = new Set(base.map((s) => s.code));
    for (const r of rows) {
      if (!known.has(r.bucket)) {
        base.push({ code: r.bucket, label: `${r.bucket} (unassigned)` });
        known.add(r.bucket);
      }
    }
    return base;
  }, [profiles, rows]);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-1">
        <Label>Learning resources</Label>
        <p className="text-xs text-muted-foreground">
          Curate an independent library per result. Shared resources appear for
          every result; each result profile below gets its own personalized set.
          Videos support YouTube, Vimeo, or a direct file link.
        </p>
      </div>

      {profiles.length === 0 ? (
        <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
          Only shared resources are available right now. Define this
          assessment&apos;s result categories (above) to give each personality
          result its own resource library.
        </p>
      ) : null}

      {sections.map((section) => {
        const sectionRows = rows.filter((r) => r.bucket === section.code);
        return (
          <div key={section.code} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{section.label}</span>
              <span className="text-xs text-muted-foreground">
                {sectionRows.length} resource
                {sectionRows.length === 1 ? '' : 's'}
              </span>
            </div>

            {sectionRows.map((row) => (
              <ResourceCard
                key={row.id}
                row={row}
                onChange={(patch) => setRow(row.id, patch)}
                onRemove={() => removeRow(row.id)}
              />
            ))}

            <div className="flex flex-wrap gap-2">
              {ADD_TYPES.map((t) => (
                <Button
                  key={t.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(section.code, t.type)}
                >
                  + Add {t.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
