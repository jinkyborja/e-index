import { env } from './env.js';
import { PrismaClient } from '@prisma/client';

export function getDatasourceUrl() {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missing = required.filter(name => !env[name]);
  if (missing.length) {
    throw new Error(`Missing database configuration variables: ${missing.join(', ')}.`);
  }

  const username = encodeURIComponent(env.DB_USER);
  const password = encodeURIComponent(env.DB_PASSWORD);
  const database = encodeURIComponent(env.DB_NAME);
  const url = new URL(`mysql://${username}:${password}@${env.DB_HOST}:${env.DB_PORT}/${database}`);
  if (env.DB_SSL) {
    url.searchParams.set('sslaccept', env.DB_SSL_REJECT_UNAUTHORIZED ? 'strict' : 'accept_invalid_certs');
  }
  return url.toString();
}

export const prisma = new PrismaClient({ datasourceUrl: getDatasourceUrl() });
