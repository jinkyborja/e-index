import { derived, get, writable } from 'svelte/store';
import { appData } from './appData.js';
import { clearSavedSession, getSavedSession, saveSession } from '../utils/auth.js';

export const authUser = writable(null);
export const isAuthenticated = derived(authUser, user => Boolean(user));
export const authRole = derived(authUser, user => user?.role || null);

function isAccountActive(account, data) {
  if (!account || account.active === false) return false;
  if (account.role !== 'teacher') return account.status !== 'Inactive';

  const teacher = data.teachers.find(item => item.email.toLowerCase() === account.email.toLowerCase());
  return Boolean(teacher && teacher.status === 'Approved' && teacher.active !== false);
}

function createUser(account) {
  return {
    ...account,
    userId: account.teacherId || account.id || account.email,
    fullName: account.name,
    status: account.active === false ? 'Inactive' : 'Approved'
  };
}

export function restoreAuth() {
  const session = getSavedSession();
  if (!session) {
    authUser.set(null);
    return null;
  }

  const data = get(appData);
  const account = data.accounts.find(item => item.email.toLowerCase() === session.email.toLowerCase()
    && item.role === session.role);
  if (!isAccountActive(account, data)) {
    clearSavedSession();
    authUser.set(null);
    return null;
  }

  const user = createUser(account);
  user.remember = Boolean(session.remember);
  authUser.set(user);
  return user;
}

export function signIn(email, password, role, rememberMe) {
  const data = get(appData);
  const account = data.accounts.find(item => item.email.toLowerCase() === email.toLowerCase());
  if (!account || account.password !== password) return { account: null, error: 'invalid' };
  if (account.role !== role) return { account: null, error: 'role' };
  if (!isAccountActive(account, data)) return { account: null, error: 'inactive' };

  const user = createUser(account);
  user.remember = Boolean(rememberMe);
  saveSession(account, rememberMe);
  authUser.set(user);
  return { account: user, error: null };
}

export function updateAuthUser(user) {
  const session = getSavedSession();
  saveSession(user, Boolean(session?.remember));
  authUser.set(createUser(user));
}

export function signOut() {
  clearSavedSession();
  authUser.set(null);
}
