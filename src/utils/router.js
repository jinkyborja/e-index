import { writable } from 'svelte/store';

function readLocation() {
  if (typeof window === 'undefined') return { pathname: '/login', search: '' };
  return { pathname: window.location.pathname, search: window.location.search };
}

export const routeLocation = writable(readLocation());

export function navigate(path, options = {}) {
  if (typeof window === 'undefined') return;
  const { replace = false } = options;
  if (window.location.pathname === path && !window.location.search) return;

  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({}, '', path);
  routeLocation.set(readLocation());
}

export function watchHistory() {
  if (typeof window === 'undefined') return () => {};
  const onPopState = () => routeLocation.set(readLocation());
  window.addEventListener('popstate', onPopState);
  return () => window.removeEventListener('popstate', onPopState);
}
