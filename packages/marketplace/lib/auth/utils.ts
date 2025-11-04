import { PASSWORD_REQUIREMENTS } from './constants';

/**
 * Password validation utilities
 */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3; // 0: weak, 1: fair, 2: good, 3: strong
  feedback: string;
  isValid: boolean;
}

export function validatePassword(password: string): PasswordStrength {
  const checks = {
    length: password.length >= PASSWORD_REQUIREMENTS.minLength,
    uppercase: !PASSWORD_REQUIREMENTS.requireUppercase || /[A-Z]/.test(password),
    lowercase: !PASSWORD_REQUIREMENTS.requireLowercase || /[a-z]/.test(password),
    number: !PASSWORD_REQUIREMENTS.requireNumber || /\d/.test(password),
    specialChar: !PASSWORD_REQUIREMENTS.requireSpecialChar || /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.values(checks).length;

  // Calculate score
  let score: 0 | 1 | 2 | 3;
  if (passedChecks === totalChecks && password.length >= 12) {
    score = 3; // Strong
  } else if (passedChecks === totalChecks) {
    score = 2; // Good
  } else if (passedChecks >= totalChecks - 1) {
    score = 1; // Fair
  } else {
    score = 0; // Weak
  }

  // Generate feedback
  let feedback = '';
  if (!checks.length) {
    feedback = `At least ${PASSWORD_REQUIREMENTS.minLength} characters`;
  } else if (!checks.uppercase) {
    feedback = 'Add an uppercase letter';
  } else if (!checks.lowercase) {
    feedback = 'Add a lowercase letter';
  } else if (!checks.number) {
    feedback = 'Add a number';
  } else if (password.length < 12) {
    feedback = 'Good! Try 12+ characters for stronger security';
  } else {
    feedback = 'Strong password!';
  }

  return {
    score,
    feedback,
    isValid: passedChecks === totalChecks,
  };
}

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone number validation (US format)
 */
export function validatePhone(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Check if it's 10 or 11 digits (with or without country code)
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Get initials from full name for avatar
 */
export function getInitials(name: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
