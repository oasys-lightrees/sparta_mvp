'use client';

import { useEffect, useState } from 'react';
import { blogApi } from '@/services/blog.api';
import { BlogCard } from '@/components/blog/BlogCard';
import type { BlogSummary } from '@/types';

export function BlogSection() {
  const [items, setItems] = useState<BlogSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await blogApi.listPublished();
        if (active) setItems(data);
      } catch {
        if (active) setItems([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Section only renders when content is available.
  if (!items || items.length === 0) return null;

  return (
    <section className="border-t bg-muted/30">
      <div className="container py-16">
        <div className="mb-8 space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">From the Blog</h2>
          <p className="text-muted-foreground">
            Insights and updates from the SPARTA team.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <BlogCard key={b.id} blog={b} />
          ))}
        </div>
      </div>
    </section>
  );
}
