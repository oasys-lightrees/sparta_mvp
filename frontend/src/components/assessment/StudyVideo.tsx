'use client';

import { ExternalLink } from 'lucide-react';

/**
 * Convert a mentor-provided video URL into an embeddable player URL.
 * Supports YouTube (watch/youtu.be/shorts/embed) and Vimeo; returns null for
 * anything else so we can fall back to a native <video>/link.
 */
function toEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const m = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

const isDirectVideo = (raw: string): boolean =>
  /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(raw);

export function StudyVideo({ url }: { url: string }) {
  const embed = toEmbedUrl(url);

  return (
    <div className="space-y-2">
      {embed ? (
        <div className="relative w-full overflow-hidden rounded-md border bg-black pt-[56.25%]">
          <iframe
            src={embed}
            title="Opening video"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : isDirectVideo(url) ? (
        <video
          controls
          src={url}
          className="w-full rounded-md border bg-black"
        />
      ) : null}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open video
      </a>
    </div>
  );
}
