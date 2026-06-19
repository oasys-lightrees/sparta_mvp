import 'dotenv/config';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * SMTP transport, configured entirely from environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
 *
 * If SMTP_HOST is not set, email is treated as disabled: sends are skipped
 * (logged) and never throw, so callers (e.g. assessment submission) are never
 * blocked or broken by email.
 */
let transporter: Transporter | null = null;
let initialized = false;

const getTransporter = (): Transporter | null => {
  if (initialized) return transporter;
  initialized = true;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });
  return transporter;
};

export type EmailMessage = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Send an email. Returns { sent } and NEVER throws — failures are logged so the
 * caller's flow (assessment submission) is unaffected.
 */
export const sendEmail = async (
  message: EmailMessage,
): Promise<{ sent: boolean }> => {
  const t = getTransporter();
  if (!t) {
    console.log(
      `[email] SMTP not configured — skipping email to ${message.to}`,
    );
    return { sent: false };
  }

  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? 'no-reply@sparta.local',
      to: message.to,
      subject: message.subject,
      text: message.body,
    });
    return { sent: true };
  } catch (err) {
    console.error('[email] failed to send:', err);
    return { sent: false };
  }
};
