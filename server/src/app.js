import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { createAuthRouter, createSessionMiddleware } from './auth.js';
import { HttpError } from './errors.js';

export function createApp({
  prisma,
  allowedOrigins = env.allowedOrigins,
  production = env.NODE_ENV === 'production'
} = {}) {
  if (!prisma) throw new Error('createApp requires a Prisma client instance.');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', production ? 1 : false);
  app.use(helmet());
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      return next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'));
    }
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      callback(null, Boolean(origin && allowedOrigins.includes(origin)));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use('/api', createSessionMiddleware(prisma, { production }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter(prisma, { production }));

  app.use((req, res, next) => next(new HttpError(404, 'NOT_FOUND', 'The requested API route was not found.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the submitted information.',
          details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
        }
      });
    }
    console.error('Unhandled API error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
  });

  return app;
}
