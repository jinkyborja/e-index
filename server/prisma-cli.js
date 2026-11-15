import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatasourceUrl } from './src/datasource-url.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, '..');
const prismaCli = path.join(projectDirectory, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: projectDirectory,
  env: { ...process.env, DATABASE_URL: getDatasourceUrl() },
  stdio: 'inherit'
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
