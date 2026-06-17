import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware, type AppEnv } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import type { ContactStatus } from '../services/contact.service';
import * as contactService from '../services/contact.service';
import { HttpError } from '../utils/http-error';
import { error, success } from '../utils/response';

const contact = new Hono<AppEnv>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES: ContactStatus[] = ['NEW', 'CONTACTED', 'CLOSED'];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const handleError = (c: Context<AppEnv>, err: unknown) => {
  if (err instanceof HttpError) {
    return c.json(error(err.message), err.status as ContentfulStatusCode);
  }
  throw err;
};

// POST /api/contact — public contact-form submission
contact.post('/contact', async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body || !isNonEmptyString(body.name)) {
    return c.json(error('name is required'), 400);
  }
  if (!isNonEmptyString(body.email) || !EMAIL_REGEX.test(body.email)) {
    return c.json(error('A valid email is required'), 400);
  }
  if (!isNonEmptyString(body.message)) {
    return c.json(error('message is required'), 400);
  }
  if (
    body.phone !== undefined &&
    body.phone !== null &&
    typeof body.phone !== 'string'
  ) {
    return c.json(error('phone must be a string'), 400);
  }

  try {
    const created = await contactService.create({
      name: body.name,
      email: body.email,
      phone: body.phone ?? null,
      message: body.message,
    });
    return c.json(success(created), 201);
  } catch (err) {
    return handleError(c, err);
  }
});

// GET /api/admin/contacts — list submissions (ADMIN)
contact.get(
  '/admin/contacts',
  authMiddleware,
  requireRole('ADMIN'),
  async (c) => {
    try {
      const list = await contactService.list();
      return c.json(success(list), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

// PATCH /api/admin/contacts/:id/status — update status (ADMIN)
contact.patch(
  '/admin/contacts/:id/status',
  authMiddleware,
  requireRole('ADMIN'),
  async (c) => {
    const id = c.req.param('id');
    if (!UUID_REGEX.test(id)) {
      return c.json(error('Invalid contact id'), 400);
    }

    const body = await c.req.json().catch(() => null);
    if (!body || !STATUSES.includes(body.status)) {
      return c.json(
        error('status must be one of NEW, CONTACTED, CLOSED'),
        400,
      );
    }

    try {
      const updated = await contactService.updateStatus(id, body.status);
      return c.json(success(updated), 200);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export default contact;
