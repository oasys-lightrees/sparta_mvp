'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Assessment cover image with a graceful fallback.
 *
 *  - fixed 16:9 aspect ratio, responsive, object-cover, lazy-loaded
 *  - when there is no URL, or the image fails to load, a branded gradient
 *    placeholder is shown instead so cards never look broken.
 */
export function AssessmentImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-primary/15 via-accent to-sky-100',
        className,
      )}
    >
      {showImage ? (
        // URL-based images from arbitrary mentor-provided hosts; next/image
        // remote config is out of scope for the MVP.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-primary/50">
          <ImageIcon className="h-8 w-8" />
          <span className="px-3 text-center text-xs font-medium text-primary/40">
            {alt}
          </span>
        </div>
      )}
    </div>
  );
}
