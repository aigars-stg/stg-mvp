/**
 * Cookie Consent Management
 * GDPR-compliant consent handling for Second Turn Games
 */

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

export interface ConsentPreferences {
  necessary: boolean; // Always true - required for core functionality
  analytics: boolean; // Vercel Analytics, Speed Insights
  // Future: marketing, functional, etc.
}

const CONSENT_STORAGE_KEY = 'cookie-consent';
const CONSENT_PREFERENCES_KEY = 'cookie-preferences';

/**
 * Get current consent status
 * @returns 'pending' if not set, 'accepted' or 'rejected' if set
 */
export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending';

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      return stored;
    }
  } catch (e) {
    // localStorage might be unavailable (private browsing, etc.)
    console.warn('Cookie consent: localStorage unavailable', e);
  }

  return 'pending';
}

/**
 * Get detailed consent preferences
 */
export function getConsentPreferences(): ConsentPreferences {
  if (typeof window === 'undefined') {
    return { necessary: true, analytics: false };
  }

  try {
    const stored = localStorage.getItem(CONSENT_PREFERENCES_KEY);
    if (stored) {
      const preferences = JSON.parse(stored) as ConsentPreferences;
      // Necessary cookies always true
      preferences.necessary = true;
      return preferences;
    }
  } catch (e) {
    console.warn('Cookie consent: Could not parse preferences', e);
  }

  // Default: necessary only
  return { necessary: true, analytics: false };
}

/**
 * Save consent status (simple accept/reject all)
 */
export function saveConsentStatus(status: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, status);

    // Set preferences based on status
    const preferences: ConsentPreferences = {
      necessary: true,
      analytics: status === 'accepted'
    };

    localStorage.setItem(CONSENT_PREFERENCES_KEY, JSON.stringify(preferences));

    // Dispatch custom event for components to react
    window.dispatchEvent(new CustomEvent('consentChanged', {
      detail: { status, preferences }
    }));
  } catch (e) {
    console.error('Cookie consent: Could not save consent', e);
  }
}

/**
 * Save detailed consent preferences
 */
export function saveConsentPreferences(preferences: ConsentPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    // Ensure necessary is always true
    const safePreferences = { ...preferences, necessary: true };

    localStorage.setItem(CONSENT_PREFERENCES_KEY, JSON.stringify(safePreferences));

    // Determine overall status
    const status = safePreferences.analytics ? 'accepted' : 'rejected';
    localStorage.setItem(CONSENT_STORAGE_KEY, status);

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('consentChanged', {
      detail: { status, preferences: safePreferences }
    }));
  } catch (e) {
    console.error('Cookie consent: Could not save preferences', e);
  }
}

/**
 * Check if analytics can be loaded
 */
export function canLoadAnalytics(): boolean {
  const preferences = getConsentPreferences();
  return preferences.analytics;
}

/**
 * Reset consent (for testing or user request)
 */
export function resetConsent(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    localStorage.removeItem(CONSENT_PREFERENCES_KEY);

    window.dispatchEvent(new CustomEvent('consentChanged', {
      detail: { status: 'pending', preferences: { necessary: true, analytics: false } }
    }));
  } catch (e) {
    console.error('Cookie consent: Could not reset consent', e);
  }
}
