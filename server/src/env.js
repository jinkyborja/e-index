import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDirectory, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1).optional(),
  FRONTEND_ORIGINS: z.string().default('http://localhost:5173'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(1),
  REMEMBER_SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server environment: ${parsed.error.issues.map(issue => issue.message).join('; ')}`);
}

export const env = {
  ...parsed.data,
  allowedOrigins: parsed.data.FRONTEND_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
};

if (env.allowedOrigins.length === 0) {
  throw new Error('FRONTEND_ORIGINS must contain at least one origin');
}
