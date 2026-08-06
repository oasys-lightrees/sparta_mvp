import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import adminRoutes from './routes/admin.routes';
import assessmentRoutes from './routes/assessment.routes';
import attemptRoutes from './routes/attempt.routes';
import authRoutes from './routes/auth.routes';
import blogRoutes from './routes/blog.routes';
import configRoutes from './routes/config.routes';
import contactRoutes from './routes/contact.routes';
import mentorRoutes from './routes/mentor.routes';
import questionRoutes from './routes/question.routes';
import reportRoutes from './routes/report.routes';
import submissionRoutes from './routes/submission.routes';
import tokenRoutes from './routes/token.routes';
import uploadRoutes from './routes/upload.routes';
import voucherRoutes from './routes/voucher.routes';
import { error, success } from './utils/response';

// Fail fast on a misconfigured deployment: a missing JWT secret would otherwise
// only surface on the first authenticated request. (DATABASE_URL is validated in
// db/client on import.)
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — refusing to start');
}

const app = new Hono();

// CORS allowlist. Defaults to the production domain + local dev; override with
// the CORS_ORIGINS env var (comma-separated). Auth uses Bearer tokens (not
// cookies), so credentials are not enabled.
const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  'https://lato.example.com,http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Health check — verifies the backend container is up.
app.get('/api/health', (c) => c.json(success({ status: 'ok' })));

// Feature routes.
app.route('/api/auth', authRoutes);
app.route('/api/assessments', assessmentRoutes);
app.route('/api/assessments', submissionRoutes);
// Question + mentor-editing routes (paths: /api/assessments/:id/questions,
// /api/questions/:id, /api/mentor/assessments/:id).
app.route('/api', questionRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/mentor', mentorRoutes);
app.route('/api/attempts', attemptRoutes);
app.route('/api/blogs', blogRoutes);
app.route('/api/tokens', tokenRoutes);
app.route('/api/vouchers', voucherRoutes);
app.route('/api/reports', reportRoutes);
// Mentor image uploads (POST) + public serving (GET /api/uploads/:name).
app.route('/api/uploads', uploadRoutes);
// Contact routes (public POST /api/contact + admin /api/admin/contacts).
app.route('/api', contactRoutes);
// Branded AssessmentApp config (public read + mentor edit).
app.route('/api', configRoutes);

// Fallback for unmatched routes.
app.notFound((c) => c.json(error('Not found'), 404));

// Catch-all error handler.
app.onError((err, c) => {
  console.error(err);
  return c.json(error('Internal server error'), 500);
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`LATO backend running on http://localhost:${info.port}`);
});
