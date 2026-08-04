// Video URL helpers shared by the learning-resources renderers.
// An "external" video is a YouTube/Vimeo watch URL we embed via an <iframe>; an
// "uploaded" video is a direct file URL (…mp4/webm) we play with <video>.

/**
 * Convert a YouTube/Vimeo URL into an embeddable player URL. Returns null for
 * anything that isn't a recognized embeddable host (callers fall back to a
 * native <video> for direct files, or a plain link).
 */
export function toEmbedUrl(raw: string): string | null {
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

/** True when the URL points directly at a playable video file (an upload). */
export const isDirectVideo = (raw: string): boolean =>
  /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(raw);
