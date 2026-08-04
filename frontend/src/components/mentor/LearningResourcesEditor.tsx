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
} from '@/types';

// A result profile the mentor can attach resources to (a personality category
// code, or a skill level). `code` is the storage key; `label` is display-only.
export type ResourceProfile = { code: string; label: string };

const SHARED = '__shared__';

const TYPE_OPTIONS: { value: LearningResourceType; label: string }[] = [
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'article', label: 'Article' },
  { value: 'file', label: 'Downloadable file' },
  { value: 'link', label: 'External link' },
  { value: 'course', label: 'Course' },
];

// Flat editor row: a resource plus the bucket it belongs to (shared or a code).
type Row = {
  id: string;
  type: LearningResourceType;
  title: string;
  description: string;
  url: string;
  access: LearningResourceAccess;
  bucket: string;
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const selectClass =
  'h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

// Flatten a stored doc into editor rows.
const flatten = (doc: LearningResourcesDoc | null | undefined): Row[] => {
  if (!doc) return [];
  const rows: Row[] = [];
  for (const r of doc.shared ?? []) rows.push({ ...toRow(r), bucket: SHARED });
  for (const [code, list] of Object.entries(doc.byProfile ?? {})) {
    for (const r of list) rows.push({ ...toRow(r), bucket: code });
  }
  return rows;
};

const toRow = (r: LearningResource): Omit<Row, 'bucket'> => ({
  id: r.id || newId(),
  type: r.type,
  title: r.title,
  description: r.description ?? '',
  url: r.url,
  access: r.access,
});

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
    if (row.bucket === SHARED) shared.push(resource);
    else (byProfile[row.bucket] ??= []).push(resource);
  }
  if (shared.length === 0 && Object.keys(byProfile).length === 0) return null;
  return { version: 1, shared, byProfile };
};

/**
 * Mentor editor for an assessment's learning resources. Each resource is a type,
 * title, URL, description, an access level (free vs unlocked-with-premium), and
 * the result profile it applies to (shared across all results, or one specific
 * profile). Emits the normalized document on every change.
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

  const setRow = (i: number, patch: Partial<Row>) =>
    apply(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    apply([
      ...rows,
      {
        id: newId(),
        type: 'video',
        title: '',
        description: '',
        url: '',
        access: 'premium',
        bucket: SHARED,
      },
    ]);
  const removeRow = (i: number) => apply(rows.filter((_, idx) => idx !== i));

  // Bucket options: Shared + the assessment's profiles + any code already used by
  // a row but no longer in `profiles` (so switching modes never drops data).
  const bucketOptions = useMemo(() => {
    const opts: ResourceProfile[] = [
      { code: SHARED, label: 'All results (shared)' },
      ...profiles,
    ];
    const known = new Set(opts.map((o) => o.code));
    for (const r of rows) {
      if (!known.has(r.bucket)) {
        opts.push({ code: r.bucket, label: `${r.bucket} (unassigned)` });
        known.add(r.bucket);
      }
    }
    return opts;
  }, [profiles, rows]);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="space-y-1">
        <Label>Learning resources</Label>
        <p className="text-xs text-muted-foreground">
          Attach study materials to each result. Videos support YouTube, Vimeo, or
          a direct file link; other types accept any URL. Choose which result a
          resource applies to, and whether it&apos;s free or unlocked with the
          premium report.
        </p>
      </div>

      {rows.map((row, i) => (
        <div key={row.id} className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap gap-2">
            <select
              className={selectClass}
              value={row.type}
              onChange={(e) =>
                setRow(i, { type: e.target.value as LearningResourceType })
              }
              aria-label="Resource type"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={row.bucket}
              onChange={(e) => setRow(i, { bucket: e.target.value })}
              aria-label="Applies to result"
            >
              {bucketOptions.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={row.access}
              onChange={(e) =>
                setRow(i, { access: e.target.value as LearningResourceAccess })
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
              onClick={() => removeRow(i)}
            >
              Remove
            </Button>
          </div>
          <Input
            value={row.title}
            onChange={(e) => setRow(i, { title: e.target.value })}
            placeholder="Title (e.g. MLOps deployment checklist)"
            aria-label="Resource title"
          />
          <Input
            type="url"
            value={row.url}
            onChange={(e) => setRow(i, { url: e.target.value })}
            placeholder="https://… (video, PDF, article, file or link URL)"
            aria-label="Resource URL"
          />
          <Textarea
            value={row.description}
            onChange={(e) => setRow(i, { description: e.target.value })}
            placeholder="Short description (optional)"
            aria-label="Resource description"
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + Add resource
      </Button>
    </div>
  );
}
