import express from 'express';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { createAuthRouter, createSessionMiddleware } from './auth.js';
import { createDataRouter } from './data.js';
import { asyncHandler, HttpError } from './errors.js';

export function createApp({
  prisma,
  staticDirectory,
  allowedOrigins = env.allowedOrigins,
  production = env.NODE_ENV === 'production'
} = {}) {
  if (!prisma) throw new Error('createApp requires a Prisma client instance.');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', production ? 1 : false);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:']
      }
    }
  }));
  app.use((req, res, next) => {
    const origin = req.get('origin');
    const sameOrigin = origin && origin === `${req.protocol}://${req.get('host')}`;
    if (origin && !allowedOrigins.includes(origin) && !sameOrigin) {
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

  app.get('/api/health', asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  }));
  app.use('/api/auth', createAuthRouter(prisma, { production }));
  app.use('/api/data', createDataRouter(prisma));

  app.use('/api', (req, res, next) => next(new HttpError(404, 'NOT_FOUND', 'The requested API route was not found.')));
  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get('*', (req, res, next) => {
      res.sendFile(path.join(staticDirectory, 'index.html'), error => {
        if (error) next(error);
      });
    });
  } else {
    app.use((req, res, next) => next(new HttpError(404, 'NOT_FOUND', 'The requested route was not found.')));
  }

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
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that information already exists.' } });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested record was not found.' } });
    }
    if (['P2021', 'P2022'].includes(error?.code)) {
      return res.status(503).json({ error: { code: 'DATABASE_SCHEMA_NOT_READY', message: 'A required database update has not been applied.' } });
    }
    if (['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1010', 'P1011', 'P1017', 'ECONNREFUSED', 'ENOTFOUND'].includes(error?.code)) {
      return res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The database is temporarily unavailable.' } });
    }
    console.error('Unhandled API error:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' } });
  });

  return app;
}
