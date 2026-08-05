'use client';

import {
  Clock,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Link as LinkIcon,
  Newspaper,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';
import { toEmbedUrl, isDirectVideo } from '@/lib/video';
import { cn } from '@/lib/utils';
import type { LearningResource, LearningResourceType } from '@/types';

// Presentation metadata per resource type. Adding a new type only needs a row
// here — the rest of the component is type-agnostic (falls back to a link card).
const TYPE_META: Record<LearningResourceType, { icon: LucideIcon; label: string }> = {
  video: { icon: PlayCircle, label: 'Video' },
  pdf: { icon: FileText, label: 'PDF' },
  article: { icon: Newspaper, label: 'Article' },
  file: { icon: Download, label: 'Download' },
  link: { icon: LinkIcon, label: 'Link' },
  course: { icon: GraduationCap, label: 'Course' },
};

// The learning-path sections, in the order a taker should progress through them.
// Each groups one or more resource types under a friendly heading + icon.
const GROUPS: {
  key: string;
  label: string;
  icon: LucideIcon;
  types: LearningResourceType[];
}[] = [
  { key: 'video', label: 'Videos', icon: PlayCircle, types: ['video'] },
  { key: 'download', label: 'Downloads', icon: Download, types: ['pdf', 'file'] },
  { key: 'article', label: 'Articles', icon: Newspaper, types: ['article'] },
  { key: 'course', label: 'Recommended courses', icon: GraduationCap, types: ['course'] },
  { key: 'link', label: 'Links', icon: LinkIcon, types: ['link'] },
];

function VideoPlayer({ url, title }: { url: string; title: string }) {
  const embed = toEmbedUrl(url);
  if (embed) {
    return (
      <div className="relative w-full overflow-hidden rounded-md border bg-black pt-[56.25%]">
        <iframe
          src={embed}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (isDirectVideo(url)) {
    return (
      <video controls src={url} className="w-full rounded-md border bg-black" />
    );
  }
  return null;
}

/** Rich video card: title, provider + duration meta, description, inline player. */
function VideoCard({ resource }: { resource: LearningResource }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{resource.title}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {resource.durationLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3" />
              {resource.durationLabel}
            </span>
          ) : null}
          {resource.provider ? (
            <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {resource.provider}
            </span>
          ) : null}
        </div>
      </div>
      {resource.description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {resource.description}
        </p>
      ) : null}
      <div className="mt-3">
        <VideoPlayer url={resource.url} title={resource.title} />
      </div>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open video
      </a>
    </div>
  );
}

/** Compact link card for non-video resources (PDF, article, file, link, course). */
function ResourceRow({ resource }: { resource: LearningResource }) {
  const meta = TYPE_META[resource.type] ?? TYPE_META.link;
  const Icon = meta.icon;

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/50 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{resource.title}</p>
          {resource.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resource.description}
            </p>
          ) : null}
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open {meta.label.toLowerCase()}
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * A personalized "learning path" rendered on the result/report: resources are
 * grouped by kind (Videos → Downloads → Articles → Courses → Links) so the
 * taker gets an ordered path rather than a flat list. Server-side gating means
 * only currently-visible resources are passed — `lockedCount` is how many more
 * unlock with premium.
 */
export function LearningResources({
  resources,
  lockedCount = 0,
  lockedHint,
  className,
}: {
  resources: LearningResource[];
  lockedCount?: number;
  lockedHint?: string;
  className?: string;
}) {
  if (resources.length === 0 && lockedCount === 0) return null;

  const sections = GROUPS.map((g) => ({
    ...g,
    items: resources.filter((r) => g.types.includes(r.type)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className={cn('space-y-5', className)}>
      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.key} className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <SectionIcon className="h-3.5 w-3.5 text-primary" />
              {section.label}
              <span className="text-muted-foreground/60">
                ({section.items.length})
              </span>
            </h4>
            <div className="space-y-3">
              {section.items.map((r) =>
                r.type === 'video' ? (
                  <VideoCard key={r.id} resource={r} />
                ) : (
                  <ResourceRow key={r.id} resource={r} />
                ),
              )}
            </div>
          </div>
        );
      })}
      {lockedCount > 0 ? (
        <p className="rounded-md border border-dashed bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
          {lockedHint ??
            `Unlock the premium report to access ${lockedCount} more resource${
              lockedCount === 1 ? '' : 's'
            }.`}
        </p>
      ) : null}
    </div>
  );
}
