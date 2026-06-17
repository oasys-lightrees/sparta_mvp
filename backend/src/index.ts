import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import adminRoutes from './routes/admin.routes';
import assessmentRoutes from './routes/assessment.routes';
import attemptRoutes from './routes/attempt.routes';
import authRoutes from './routes/auth.routes';
import blogRoutes from './routes/blog.routes';
import contactRoutes from './routes/contact.routes';
import mentorRoutes from './routes/mentor.routes';
import questionRoutes from './routes/question.routes';
import submissionRoutes from './routes/submission.routes';
import { error, success } from './utils/response';

const app = new Hono();

app.use('*', cors());

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
// Contact routes (public POST /api/contact + admin /api/admin/contacts).
app.route('/api', contactRoutes);
//   app.route('/api/admin', adminRoutes);
//   app.route('/api/mentor', mentorRoutes);

// Fallback for unmatched routes.
app.notFound((c) => c.json(error('Not found'), 404));

// Catch-all error handler.
app.onError((err, c) => {
  console.error(err);
  return c.json(error('Internal server error'), 500);
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`SPARTA backend running on http://localhost:${info.port}`);
});
