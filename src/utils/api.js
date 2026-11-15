import { DEMO_API_UNHANDLED, handleDemoApiRequest } from '../stores/demoData.js';

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', status = 0, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const demoResult = handleDemoApiRequest(path, { method, body });
  if (demoResult !== DEMO_API_UNHANDLED) return demoResult;

  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError('Unable to connect to the E-Index server.', 'NETWORK_ERROR');
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || 'The request could not be completed.',
      payload?.error?.code || 'API_ERROR',
      response.status,
      payload?.error?.details || null
    );
  }

  return payload;
}
