import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { contacts } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type ContactStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

export type CreateContactInput = {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
};

/**
 * Store a contact-form submission (status defaults to NEW).
 */
export const create = async (input: CreateContactInput) => {
  const [created] = await db
    .insert(contacts)
    .values({
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone ?? null,
      message: input.message.trim(),
    })
    .returning({ id: contacts.id });

  return created;
};

/**
 * List all contact submissions (admin), newest first.
 */
export const list = async () => {
  return db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      message: contacts.message,
      status: contacts.status,
      created_at: contacts.createdAt,
    })
    .from(contacts)
    .orderBy(desc(contacts.createdAt));
};

/**
 * Update a contact's status. 404 if missing.
 */
export const updateStatus = async (id: string, status: ContactStatus) => {
  const [updated] = await db
    .update(contacts)
    .set({ status })
    .where(eq(contacts.id, id))
    .returning({ id: contacts.id, status: contacts.status });

  if (!updated) {
    throw new HttpError(404, 'Contact not found');
  }

  return updated;
};
