import { PrismaClient } from '@prisma/client';
import { getDatasourceUrl } from './datasource-url.js';

export const prisma = new PrismaClient({ datasourceUrl: getDatasourceUrl() });
