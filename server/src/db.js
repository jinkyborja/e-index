import { env } from './env.js';
import { PrismaClient } from '@prisma/client';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env and set your Aiven MySQL connection URL.');
}

export const prisma = new PrismaClient();
