import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './src/app.js';
import { env } from './src/env.js';
import { prisma } from './src/db.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const app = createApp({
  prisma,
  staticDirectory: path.resolve(serverDirectory, '../dist')
});
const server = app.listen(env.PORT, () => {
  console.log(`E-Index is listening on port ${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing the E-Index API.`);
  server.close(async error => {
    if (error) {
      console.error('Unable to close the API server cleanly:', error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
