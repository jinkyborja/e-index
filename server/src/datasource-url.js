import { env } from './env.js';

export function getDatasourceUrl() {
  let url;
  if (env.DATABASE_URL) {
    url = new URL(env.DATABASE_URL);
  } else {
    const username = encodeURIComponent(env.DB_USER);
    const password = encodeURIComponent(env.DB_PASSWORD);
    const database = encodeURIComponent(env.DB_NAME);
    url = new URL(`mysql://${username}:${password}@${env.DB_HOST}:${env.DB_PORT}/${database}`);
  }

  if (env.DB_SSL) {
    url.searchParams.set('sslaccept', env.DB_SSL_REJECT_UNAUTHORIZED ? 'strict' : 'accept_invalid_certs');
  }
  url.searchParams.set('connect_timeout', String(Math.max(1, Math.ceil(env.DB_CONNECT_TIMEOUT_MS / 1000))));
  return url.toString();
}
