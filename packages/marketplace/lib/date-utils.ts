import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

/**
 * Date formatting utilities for consistent European-style display.
 * Format: dd.MM.yyyy (e.g., 31.08.2026) with 24-hour time (e.g., 14:30)
 */

type DateInput = Date | string | number;

/**
 * Safely converts various date inputs to a Date object
 */
function toDate(date: DateInput): Date {
  if (date instanceof Date) return date;
  return new Date(date);
}

/**
 * Formats a date as dd.MM.yyyy (e.g., 31.08.2026)
 */
export function formatDate(date: DateInput): string {
  return format(toDate(date), 'dd.MM.yyyy');
}

/**
 * Formats a date as dd.MM (e.g., 31.08) for compact displays
 */
export function formatDateShort(date: DateInput): string {
  return format(toDate(date), 'dd.MM');
}

/**
 * Formats time as HH:mm in 24-hour format (e.g., 14:30)
 */
export function formatTime(date: DateInput): string {
  return format(toDate(date), 'HH:mm');
}

/**
 * Formats date and time as dd.MM.yyyy HH:mm (e.g., 31.08.2026 14:30)
 */
export function formatDateTime(date: DateInput): string {
  return format(toDate(date), 'dd.MM.yyyy HH:mm');
}

/**
 * Formats a relative time string (e.g., "5 minutes ago", "2 hours ago")
 */
export function formatRelativeTime(date: DateInput, addSuffix = true): string {
  return formatDistanceToNow(toDate(date), { addSuffix });
}

/**
 * Formats a message timestamp with smart relative display:
 * - Today: "14:30"
 * - Yesterday: "Yesterday, 14:30"
 * - Within 7 days: "Wed, 14:30"
 * - Older: "31.08 14:30"
 */
export function formatMessageTime(timestamp: DateInput): string {
  const date = toDate(timestamp);

  if (isToday(date)) {
    return formatTime(date);
  }

  if (isYesterday(date)) {
    return `Yesterday, ${formatTime(date)}`;
  }

  // Less than 7 days ago
  if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return format(date, 'EEE, HH:mm');
  }

  return `${formatDateShort(date)} ${formatTime(date)}`;
}
