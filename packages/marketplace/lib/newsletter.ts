/**
 * Newsletter subscription utilities
 * Shared types, validation, and constants
 */

export type NewsletterSource = 'footer' | 'registration' | 'settings';
export type NewsletterLocale = 'en' | 'lv';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  user_id: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  source: NewsletterSource;
  locale: NewsletterLocale;
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
}

export interface SubscribeRequest {
  email: string;
  locale?: NewsletterLocale;
  source?: NewsletterSource;
}

export interface SubscribeResponse {
  success: boolean;
  error?: string;
}

export interface UnsubscribeResponse {
  success: boolean;
  alreadyUnsubscribed?: boolean;
  error?: string;
}

export interface StatusResponse {
  subscribed: boolean;
  email?: string;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Storage key for session-based success state persistence
 */
export const NEWSLETTER_SUCCESS_KEY = 'newsletter_subscribed';
