/**
 * Check if the browser is currently offline.
 */
export function isOffline(): boolean {
  return typeof window !== 'undefined' && !navigator.onLine;
}

/**
 * Check if an error is likely due to being offline.
 * Use this in catch blocks to show appropriate messaging.
 */
export function isOfflineError(error: unknown): boolean {
  // Check navigator.onLine first
  if (isOffline()) {
    return true;
  }

  // Check for common offline error patterns
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('failed to fetch') ||
      message.includes('net::err_internet_disconnected') ||
      message.includes('net::err_network_changed') ||
      message.includes('networkerror')
    );
  }

  return false;
}
