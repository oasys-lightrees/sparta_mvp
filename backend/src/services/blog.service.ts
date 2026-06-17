import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '../db/client';
import { blogs } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type BlogStatus = 'DRAFT' | 'PUBLISHED';

export type CreateBlogInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  status?: BlogStatus;
};

export type UpdateBlogInput = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  status?: BlogStatus;
};

// Full blog row mapped to snake_case for management/detail responses.
const fullColumns = {
  id: blogs.id,
  author_id: blogs.authorId,
  title: blogs.title,
  slug: blogs.slug,
  excerpt: blogs.excerpt,
  content: blogs.content,
  cover_image_url: blogs.coverImageUrl,
  status: blogs.status,
  created_at: blogs.createdAt,
  updated_at: blogs.updatedAt,
};

/**
 * Public list — PUBLISHED blogs only, summary fields (no full content).
 */
export const listPublished = async () => {
  return db
    .select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      excerpt: blogs.excerpt,
      cover_image_url: blogs.coverImageUrl,
      created_at: blogs.createdAt,
    })
    .from(blogs)
    .where(eq(blogs.status, 'PUBLISHED'))
    .orderBy(desc(blogs.createdAt));
};

/**
 * Public detail — PUBLISHED blog by slug. 404 otherwise.
 */
export const getPublishedBySlug = async (slug: string) => {
  const [row] = await db
    .select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      excerpt: blogs.excerpt,
      content: blogs.content,
      cover_image_url: blogs.coverImageUrl,
      created_at: blogs.createdAt,
      updated_at: blogs.updatedAt,
    })
    .from(blogs)
    .where(and(eq(blogs.slug, slug), eq(blogs.status, 'PUBLISHED')))
    .limit(1);

  if (!row) {
    throw new HttpError(404, 'Blog not found');
  }

  return row;
};

/**
 * Create a blog. 409 if the slug is already taken.
 */
export const create = async (authorId: string, input: CreateBlogInput) => {
  const existing = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(eq(blogs.slug, input.slug))
    .limit(1);

  if (existing.length > 0) {
    throw new HttpError(409, 'A blog with this slug already exists');
  }

  const [created] = await db
    .insert(blogs)
    .values({
      authorId,
      title: input.title.trim(),
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content: input.content ?? null,
      coverImageUrl: input.cover_image_url ?? null,
      status: input.status ?? 'DRAFT',
    })
    .returning(fullColumns);

  return created;
};

/**
 * Update a blog. 404 if missing, 409 if changing to a slug another blog uses.
 */
export const update = async (id: string, input: UpdateBlogInput) => {
  const [current] = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(eq(blogs.id, id))
    .limit(1);

  if (!current) {
    throw new HttpError(404, 'Blog not found');
  }

  if (input.slug !== undefined) {
    const clash = await db
      .select({ id: blogs.id })
      .from(blogs)
      .where(and(eq(blogs.slug, input.slug), ne(blogs.id, id)))
      .limit(1);
    if (clash.length > 0) {
      throw new HttpError(409, 'A blog with this slug already exists');
    }
  }

  const values: Partial<{
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    coverImageUrl: string | null;
    status: BlogStatus;
  }> = {};
  if (input.title !== undefined) values.title = input.title.trim();
  if (input.slug !== undefined) values.slug = input.slug;
  if (input.excerpt !== undefined) values.excerpt = input.excerpt;
  if (input.content !== undefined) values.content = input.content;
  if (input.cover_image_url !== undefined)
    values.coverImageUrl = input.cover_image_url;
  if (input.status !== undefined) values.status = input.status;

  const [updated] = await db
    .update(blogs)
    .set(values)
    .where(eq(blogs.id, id))
    .returning(fullColumns);

  return updated;
};

/**
 * Delete a blog. 404 if missing.
 */
export const remove = async (id: string) => {
  const [current] = await db
    .select({ id: blogs.id })
    .from(blogs)
    .where(eq(blogs.id, id))
    .limit(1);

  if (!current) {
    throw new HttpError(404, 'Blog not found');
  }

  await db.delete(blogs).where(eq(blogs.id, id));
};
