'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { TranslationKey } from '@/lib/i18n';
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

const PROVIDER_OPTIONS: { value: VideoProvider | ''; labelKey: TranslationKey }[] = [
  { value: '', labelKey: 'lr.provAuto' },
  { value: 'youtube', labelKey: 'lr.provYoutube' },
  { value: 'vimeo', labelKey: 'lr.provVimeo' },
  { value: 'mp4', labelKey: 'lr.provMp4' },
  { value: 'file', labelKey: 'lr.provFile' },
  { value: 'external', labelKey: 'lr.provExternal' },
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
  const { t } = useLanguage();
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
          aria-label={t('lr.accessAria')}
        >
          <option value="free">{t('lr.accessFree')}</option>
          <option value="premium">{t('lr.accessLocked')}</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onRemove}
        >
          {t('lr.remove')}
        </Button>
      </div>
      <Input
        value={row.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder={isVideo ? t('lr.titleVideoPh') : t('lr.titlePh')}
        aria-label={t('lr.titleAria')}
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
        aria-label={t('lr.urlAria')}
      />
      <Textarea
        value={row.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder={t('lr.descPh')}
        aria-label={t('lr.descAria')}
      />
      {isVideo ? (
        <div className="flex flex-wrap gap-2">
          <select
            className={selectClass}
            value={row.provider}
            onChange={(e) =>
              onChange({ provider: e.target.value as VideoProvider | '' })
            }
            aria-label={t('lr.providerAria')}
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
          <Input
            className="flex-1"
            value={row.durationLabel}
            onChange={(e) => onChange({ durationLabel: e.target.value })}
            placeholder={t('lr.durationPh')}
            aria-label={t('lr.durationAria')}
          />
          <Input
            className="w-full"
            type="url"
            value={row.thumbnailUrl}
            onChange={(e) => onChange({ thumbnailUrl: e.target.value })}
            placeholder={t('lr.thumbPh')}
            aria-label={t('lr.thumbAria')}
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
  const { t } = useLanguage();
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
      { code: SHARED, label: t('lr.shared') },
      ...profiles,
    ];
    const known = new Set(base.map((s) => s.code));
    for (const r of rows) {
      if (!known.has(r.bucket)) {
        base.push({ code: r.bucket, label: `${r.bucket} (${t('lr.unassigned')})` });
        known.add(r.bucket);
      }
    }
    return base;
  }, [profiles, rows, t]);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-1">
        <Label>{t('lr.title')}</Label>
        <p className="text-xs text-muted-foreground">{t('lr.help')}</p>
      </div>

      {profiles.length === 0 ? (
        <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
          {t('lr.onlyShared')}
        </p>
      ) : null}

      {sections.map((section) => {
        const sectionRows = rows.filter((r) => r.bucket === section.code);
        return (
          <div key={section.code} className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{section.label}</span>
              <span className="text-xs text-muted-foreground">
                {sectionRows.length} {t('lr.resourcesWord')}
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
              {ADD_TYPES.map((at) => (
                <Button
                  key={at.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addRow(section.code, at.type)}
                >
                  + {t('lr.add')} {at.label}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
