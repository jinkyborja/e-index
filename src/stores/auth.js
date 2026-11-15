import { derived, writable } from 'svelte/store';
import { apiRequest } from '../utils/api.js';

export const authUser = writable(null);
export const isAuthenticated = derived(authUser, user => Boolean(user));
export const authRole = derived(authUser, user => user?.role || null);

export async function restoreAuth() {
  try {
    const result = await apiRequest('/api/auth/me');
    authUser.set(result.user);
    return result.user;
  } catch (error) {
    if (error.code === 'UNAUTHENTICATED') {
      authUser.set(null);
      return null;
    }
    throw error;
  }
}

export async function signIn(email, password, rememberMe) {
  const result = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password, rememberMe }
  });
  authUser.set(result.user);
  return { account: result.user, error: null };
}

export async function fetchActiveColleges() {
  return apiRequest('/api/auth/colleges');
}

export async function registerTeacher(name, email, collegeId, password, confirmPassword) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name, email, collegeId, password, confirmPassword }
  });
}

export async function requestPasswordReset(email) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email }
  });
}

export async function resetPassword(token, password) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: { token, password }
  });
}

export async function signOut() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  authUser.set(null);
}
