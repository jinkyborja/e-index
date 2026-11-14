const SESSION_KEY = 'e-index-demo-session-v1';

export function getSavedSession() {
  if (typeof window === 'undefined') return null;

  for (const persistent of [true, false]) {
    try {
      const storage = persistent ? window.localStorage : window.sessionStorage;
      const saved = storage.getItem(SESSION_KEY);
      if (!saved) continue;
      const session = JSON.parse(saved);
      if (session && ['admin', 'teacher'].includes(session.role) && session.email) {
        if (session.expiresAt && Date.now() > session.expiresAt) {
          clearSavedSession();
          return null;
        }
        return { ...session, remember: Boolean(session.remember) };
      }
    } catch (error) {
      console.error('Unable to read the saved E-Index session.', error);
      return null;
    }
  }
  return null;
}

export function saveSession(account, rememberMe) {
  if (typeof window === 'undefined') return;
  clearSavedSession();
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({
      email: account.email,
      role: account.role,
      name: account.name,
      teacherId: account.teacherId || '',
      remember: Boolean(rememberMe),
      expiresAt: Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000
    }));
  } catch (error) {
    console.error('Unable to save the E-Index session.', error);
    throw error;
  }
}

export function clearSavedSession() {
  if (typeof window === 'undefined') return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Unable to clear the saved E-Index session.', error);
      throw error;
    }
  }
}
