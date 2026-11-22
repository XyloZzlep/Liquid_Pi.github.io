import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { loadUser } from './middleware/auth.js';
import { csrfProtect } from './middleware/csrf.js';
import healthRoutes from './routes/health.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import appsRoutes from './routes/apps.js';
import googleRoutes from './routes/google.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));

  app.use(session({
    name: 'lp.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
    },
  }));
  app.use(loadUser);

  app.use('/api', csrfProtect);

  app.use('/api/health', healthRoutes);
  app.use('/api/auth/google', googleRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/auth', googleRoutes);
  app.use('/api/apps', appsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use(express.static('public'));

  app.use((_req, res) => res.status(404).json({ error: 'No encontrado' }));

 
  app.use((err, _req, res, _next) => {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: 'Petición inválida' }); 
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  });

  return app;
}