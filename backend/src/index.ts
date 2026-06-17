import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { error, success } from './utils/response';

const app = new Hono();

app.use('*', cors());

// Health check — verifies the backend container is up.
app.get('/api/health', (c) => c.json(success({ status: 'ok' })));

// Feature routes are mounted here in later steps, e.g.:
//   app.route('/api/auth', authRoutes);
//   app.route('/api/assessments', assessmentRoutes);
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
