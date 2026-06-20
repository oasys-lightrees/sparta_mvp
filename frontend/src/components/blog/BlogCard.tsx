'use client';

import { useState } from 'react';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { BlogSummary } from '@/types';

/**
 * Public blog card. Shows the cover image (when present) above the existing
 * title/excerpt header. Falls back gracefully — when there is no image URL, or
 * it fails to load, the card renders exactly as before (no image block).
 */
export function BlogCard({ blog }: { blog: BlogSummary }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(blog.cover_image_url) && !imgFailed;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {showImage ? (
        <div className="aspect-[16/9] w-full overflow-hidden border-b bg-muted">
          {/* Plain <img> (not next/image) so arbitrary remote cover URLs work
              without remote-image allowlisting. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blog.cover_image_url as string}
            alt={blog.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <CardHeader>
        <CardTitle className="text-lg">{blog.title}</CardTitle>
        {blog.excerpt ? (
          <CardDescription className="line-clamp-3">
            {blog.excerpt}
          </CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  );
}
