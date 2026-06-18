'use client';

import { useEffect, useState } from 'react';
import { blogApi } from '@/services/blog.api';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <section className="container py-12">
      <h2 className="mb-6 text-2xl font-bold">From the Blog</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle className="text-lg">{b.title}</CardTitle>
              {b.excerpt ? (
                <CardDescription className="line-clamp-3">
                  {b.excerpt}
                </CardDescription>
              ) : null}
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
