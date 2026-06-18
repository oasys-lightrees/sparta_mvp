'use client';

import { useCallback, useEffect, useState } from 'react';
import { blogApi } from '@/services/blog.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loading } from '@/components/common/Loading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import type { AssessmentStatus } from '@/types';

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: AssessmentStatus;
  content: string | null;
};

type BlogPayload = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  status: AssessmentStatus;
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// --- Create/Edit form -----------------------------------------------------
function BlogForm({
  initial,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<BlogRow>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: BlogPayload) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [cover, setCover] = useState(initial?.cover_image_url ?? '');
  const [status, setStatus] = useState<AssessmentStatus>(
    initial?.status ?? 'DRAFT',
  );
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Title is required');
    if (!SLUG_REGEX.test(slug))
      return setError('Slug must be lowercase letters, numbers and hyphens');
    onSubmit({
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() === '' ? null : excerpt,
      content: content.trim() === '' ? null : content,
      cover_image_url: cover.trim() === '' ? null : cover,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-post"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cover image URL</Label>
        <Input value={cover} onChange={(e) => setCover(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Excerpt</Label>
        <Textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[140px]"
        />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex gap-2">
          {(['DRAFT', 'PUBLISHED'] as AssessmentStatus[]).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={status === s ? 'default' : 'outline'}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>
      <ErrorMessage message={error} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// --- Management -----------------------------------------------------------
export function ContentManagement() {
  const [items, setItems] = useState<BlogRow[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BlogRow | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await blogApi.listPublished();
      setItems(
        list.map((b) => ({
          id: b.id,
          title: b.title,
          slug: b.slug,
          excerpt: b.excerpt,
          cover_image_url: b.cover_image_url,
          status: 'PUBLISHED' as AssessmentStatus,
          content: null,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blogs');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsertLocal = (row: BlogRow) =>
    setItems((prev) => {
      const list = prev ?? [];
      const exists = list.some((b) => b.id === row.id);
      return exists ? list.map((b) => (b.id === row.id ? row : b)) : [row, ...list];
    });

  const handleCreate = async (payload: BlogPayload) => {
    setBusy(true);
    setError('');
    try {
      const created = await blogApi.create(payload);
      upsertLocal({ ...payload, id: created.id });
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create blog');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (id: string, payload: BlogPayload) => {
    setBusy(true);
    setError('');
    try {
      await blogApi.update(id, payload);
      upsertLocal({ ...payload, id });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update blog');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = async (row: BlogRow) => {
    setError('');
    // Published rows from the list have no content yet — fetch it.
    if (row.content === null && row.status === 'PUBLISHED') {
      setBusy(true);
      try {
        const detail = await blogApi.getBySlug(row.slug);
        row = { ...row, content: detail.content };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load blog content',
        );
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setEditing(row);
  };

  const togglePublish = (row: BlogRow) => {
    const next: AssessmentStatus =
      row.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    handleUpdate(row.id, { ...row, status: next });
  };

  const remove = async (row: BlogRow) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    setBusy(true);
    setError('');
    try {
      await blogApi.remove(row.id);
      setItems((prev) => (prev ?? []).filter((b) => b.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete blog');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Note: the API lists published blogs only. Drafts you create or unpublish
        stay editable here until you refresh the page.
      </p>

      <div className="flex justify-end">
        {!creating && !editing ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            New blog
          </Button>
        ) : null}
      </div>

      <ErrorMessage message={error} />

      {creating ? (
        <Card>
          <CardHeader>
            <CardTitle>New blog</CardTitle>
          </CardHeader>
          <CardContent>
            <BlogForm
              submitLabel="Create"
              submitting={busy}
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit blog</CardTitle>
          </CardHeader>
          <CardContent>
            <BlogForm
              initial={editing}
              submitLabel="Save"
              submitting={busy}
              onSubmit={(payload) => handleUpdate(editing.id, payload)}
              onCancel={() => setEditing(null)}
            />
          </CardContent>
        </Card>
      ) : null}

      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No blogs yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.title}</TableCell>
                <TableCell>{b.slug}</TableCell>
                <TableCell>
                  <Badge
                    variant={b.status === 'PUBLISHED' ? 'default' : 'secondary'}
                  >
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(b)}
                      disabled={busy}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublish(b)}
                      disabled={busy}
                    >
                      {b.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(b)}
                      disabled={busy}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
