import process from 'node:process';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import listingsRoutes from './routes/listings.routes.js';
import brokersRoutes from './routes/brokers.routes.js';
import adminRoutes from './routes/admin.routes.js';
import creditsRoutes from './routes/credits.routes.js';
import conversationsRoutes from './routes/conversations.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import { PUBLIC_UPLOADS_DIR, readDocument } from './lib/uploads.js';
import { requireAuth } from './middleware/auth.middleware.js';

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Never expose the upload root or private directory, including legacy paths.
app.use('/uploads', express.static(PUBLIC_UPLOADS_DIR, {
  dotfiles: 'deny', index: false,
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));
app.get('/uploads/:filename', requireAuth, readDocument);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/brokers', brokersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/uploads', uploadsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

export default app;
