/**
 * Remove a query parameter from the current URL without triggering a page reload.
 * Commonly used to clean up one-time flags like ?welcome=true or ?published=1.
 */
export function cleanUrlParam(key: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(key);
  window.history.replaceState({}, '', url.pathname + url.search);
}
