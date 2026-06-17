import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import type { BlogStatus } from '../services/blog.service';
import * as blogService from '../services/blog.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const blog = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES: BlogStatus[] = ['DRAFT', 'PUBLISHED'];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === 'string';

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// --- Public ---------------------------------------------------------------

// GET /api/blogs — list PUBLISHED blogs
blog.get('/', async (c) => {
  try {
    const list = await blogService.listPublished();
    return c.json(success(list), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/blogs/:slug — PUBLISHED blog detail
blog.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  try {
    const detail = await blogService.getPublishedBySlug(slug);
    return c.json(success(detail), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// --- Admin / Mentor -------------------------------------------------------

// POST /api/blogs — create a blog
blog.post('/', authMiddleware, requireRole('ADMIN', 'MENTOR'), async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || !isNonEmptyString(body.title)) {
    return c.json(error('title is required'), 400);
  }
  if (!isNonEmptyString(body.slug) || !SLUG_REGEX.test(body.slug)) {
    return c.json(
      error('slug is required (lowercase letters, numbers, hyphens)'),
      400,
    );
  }
  if (!isOptionalString(body.excerpt) || !isOptionalString(body.content)) {
    return c.json(error('excerpt and content must be strings'), 400);
  }
  if (!isOptionalString(body.cover_image_url)) {
    return c.json(error('cover_image_url must be a string'), 400);
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return c.json(error('status must be DRAFT or PUBLISHED'), 400);
  }

  try {
    const created = await blogService.create(c.get('user').id, {
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: body.content,
      cover_image_url: body.cover_image_url,
      status: body.status,
    });
    return c.json(success(created), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// PATCH /api/blogs/:id — update a blog
blog.patch('/:id', authMiddleware, requireRole('ADMIN', 'MENTOR'), async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid blog id'), 400);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json(error('Invalid request body'), 400);
  }
  if (body.title !== undefined && !isNonEmptyString(body.title)) {
    return c.json(error('title must be a non-empty string'), 400);
  }
  if (
    body.slug !== undefined &&
    (!isNonEmptyString(body.slug) || !SLUG_REGEX.test(body.slug))
  ) {
    return c.json(
      error('slug must be lowercase letters, numbers, hyphens'),
      400,
    );
  }
  if (!isOptionalString(body.excerpt) || !isOptionalString(body.content)) {
    return c.json(error('excerpt and content must be strings'), 400);
  }
  if (!isOptionalString(body.cover_image_url)) {
    return c.json(error('cover_image_url must be a string'), 400);
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return c.json(error('status must be DRAFT or PUBLISHED'), 400);
  }

  const hasUpdate = [
    'title',
    'slug',
    'excerpt',
    'content',
    'cover_image_url',
    'status',
  ].some((k) => body[k] !== undefined);
  if (!hasUpdate) {
    return c.json(error('Nothing to update'), 400);
  }

  try {
    const updated = await blogService.update(id, {
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt,
      content: body.content,
      cover_image_url: body.cover_image_url,
      status: body.status,
    });
    return c.json(success(updated), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

// DELETE /api/blogs/:id — delete a blog
blog.delete('/:id', authMiddleware, requireRole('ADMIN', 'MENTOR'), async (c) => {
  const id = c.req.param('id');
  if (!UUID_REGEX.test(id)) {
    return c.json(error('Invalid blog id'), 400);
  }

  try {
    await blogService.remove(id);
    return c.json(success({ id }), 200);
  } catch (err) {
    return handleError(c, err);
  }
});

export default blog;
