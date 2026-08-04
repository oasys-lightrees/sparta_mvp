'use client';

import {
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
    return <video controls src={url} className="w-full rounded-md border bg-black" />;
  }
  return null;
}

function ResourceRow({ resource }: { resource: LearningResource }) {
  const meta = TYPE_META[resource.type] ?? TYPE_META.link;
  const Icon = meta.icon;
  const openLabel = resource.type === 'video' ? 'Open video' : `Open ${meta.label.toLowerCase()}`;
  const showPlayer = resource.type === 'video';

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/50 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {resource.title}
            </p>
            <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {meta.label}
            </span>
          </div>
          {resource.description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resource.description}
            </p>
          ) : null}
        </div>
      </div>
      {showPlayer ? (
        <div className="mt-3">
          <VideoPlayer url={resource.url} title={resource.title} />
        </div>
      ) : null}
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {openLabel}
      </a>
    </div>
  );
}

/**
 * A dedicated "Learning Resources" list rendered on the result/report. Renders
 * any resource kind (videos get an inline player; everything else is a link
 * card). Server-side gating means only currently-visible resources are passed —
 * `lockedCount` is how many more unlock with premium.
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

  return (
    <div className={cn('space-y-3', className)}>
      {resources.map((r) => (
        <ResourceRow key={r.id} resource={r} />
      ))}
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
