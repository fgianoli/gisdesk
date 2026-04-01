import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import projectsRoutes from './routes/projects.routes';
import ticketsRoutes from './routes/tickets.routes';
import timelineRoutes from './routes/timeline.routes';
import todosRoutes from './routes/todos.routes';
import faqRoutes from './routes/faq.routes';
import aiRoutes from './routes/ai.routes';
import attachmentsRoutes from './routes/attachments.routes';
import timeEntriesRoutes from './routes/time-entries.routes';
import notificationsRoutes from './routes/notifications.routes';
import templatesRoutes from './routes/templates.routes';
import dependenciesRoutes from './routes/dependencies.routes';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import profileRoutes from './routes/profile.routes';
import auditRoutes from './routes/audit.routes';
import bulkRoutes from './routes/bulk.routes';
import webhooksRoutes from './routes/webhooks.routes';
import customFieldsRoutes from './routes/custom-fields.routes';
import savedFiltersRoutes from './routes/saved-filters.routes';
import sseRoutes from './routes/sse.routes';
import twofaRoutes from './routes/twofa.routes';
import importRoutes from './routes/import.routes';
import messagesRoutes from './routes/messages.routes';
import assignmentRulesRoutes from './routes/assignment-rules.routes';

// Import SLA service to start interval
import './services/sla.service';

// Ensure upload directories exist
import fs from 'fs';
import path from 'path';
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const app = express();

// Trust nginx reverse proxy (needed for express-rate-limit with X-Forwarded-For)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS - restrictive in production
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Troppe richieste, riprova più tardi' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // max 10 login attempts per 15 min
  message: { error: 'Troppi tentativi di login, riprova più tardi' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 AI requests per minute
  message: { error: 'Troppe richieste AI, riprova tra un minuto' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/ai', aiLimiter);

app.use(express.json({ limit: '1mb' }));

// Sanitize request body strings to prevent XSS
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeValue = (val: any): any => {
      if (typeof val === 'string') {
        return val.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
                  .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      }
      if (Array.isArray(val)) return val.map(sanitizeValue);
      if (val && typeof val === 'object') {
        const sanitized: any = {};
        for (const [k, v] of Object.entries(val)) sanitized[k] = sanitizeValue(v);
        return sanitized;
      }
      return val;
    };
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', attachmentsRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/dependencies', dependenciesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/custom-fields', customFieldsRoutes);
app.use('/api/saved-filters', savedFiltersRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/2fa', twofaRoutes);
app.use('/api/import', importRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/assignment-rules', assignmentRulesRoutes);

// Serve uploaded files (logo, attachments) – public access for logo
app.get('/api/uploads/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File non trovato' });
  res.sendFile(path.resolve(filePath));
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${env.PORT}`);
});
