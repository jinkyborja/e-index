import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDirectory, '../../.env') });
dotenv.config({ path: path.resolve(serverDirectory, '../../src/.env') });

function booleanEnvironment(defaultValue) {
  return z.preprocess(
    value => typeof value === 'string' ? value.toLowerCase() : value,
    z.enum(['true', 'false']).default(defaultValue ? 'true' : 'false')
  ).transform(value => value === 'true');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().min(1).optional(),
  DB_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  DB_USER: z.string().min(1).optional(),
  DB_PASSWORD: z.string().min(1).optional(),
  DB_NAME: z.string().min(1).optional(),
  DB_SSL: booleanEnvironment(false),
  DB_SSL_REJECT_UNAUTHORIZED: booleanEnvironment(true),
  BREVO_API_KEY: z.string().min(1).optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().min(1).default('E-Index'),
  FRONTEND_URL: z.string().url().optional().transform(value => value ? new URL(value).origin : undefined),
  CORS_ORIGINS: z.string().optional(),
  FRONTEND_ORIGINS: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(1),
  REMEMBER_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server environment: ${parsed.error.issues.map(issue => issue.message).join('; ')}`);
}

const configuredOrigins = parsed.data.CORS_ORIGINS
  ?? parsed.data.FRONTEND_ORIGINS
  ?? 'http://localhost:5173';
const allowedOrigins = new Set(configuredOrigins.split(',').map(origin => origin.trim()).filter(Boolean));
if (parsed.data.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}

export const env = {
  ...parsed.data,
  allowedOrigins: [...allowedOrigins]
};

if (env.allowedOrigins.length === 0) {
  throw new Error('FRONTEND_ORIGINS must contain at least one origin');
}
