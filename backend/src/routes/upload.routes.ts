import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { readImage, storeImage } from '../services/upload.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const uploads = new Hono<AppEnv>();

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

/**
 * Absolute public base for a served upload. The Zod brand schema requires an
 * absolute logoUrl, so the stored URL must be fully qualified. In production
 * nginx forwards the original scheme/host via X-Forwarded-* headers; locally we
 * fall back to the request URL's origin.
 */
const publicBase = (c: Context<AppEnv>): string => {
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host');
  if (host) {
    const proto = c.req.header('x-forwarded-proto') ?? 'http';
    return `${proto}://${host}`;
  }
  return new URL(c.req.url).origin;
};

// POST /api/uploads — store an image, return its public URL. Mentors/admins only.
uploads.post('/', authMiddleware, requireRole('MENTOR', 'ADMIN'), async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json(error('Expected a multipart form upload'), 400);
  }

  const file = body.file;
  if (!(file instanceof File)) {
    return c.json(error('No file was provided (field "file")'), 400);
  }

  try {
    const name = await storeImage(file);
    return c.json(success({ url: `${publicBase(c)}/api/uploads/${name}` }), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/uploads/:name — serve a stored image. Public (landing pages are
// public). SVGs are neutralized with a restrictive CSP + nosniff so a crafted
// file can never execute script in our origin.
uploads.get('/:name', async (c) => {
  const image = await readImage(c.req.param('name'));
  if (!image) {
    return c.json(error('Not found'), 404);
  }
  return new Response(image.body, {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
});

export default uploads;
