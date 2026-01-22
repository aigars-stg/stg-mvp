/**
 * Feedback Utilities
 * Validation and helper functions for the user feedback system
 */

import {
  FEEDBACK_CONSTRAINTS,
  type FeedbackType,
  type SubmitFeedbackRequest,
} from '@/lib/types/feedback';

/**
 * Validate feedback type
 */
export function isValidFeedbackType(type: string): type is FeedbackType {
  return ['feature_request', 'bug_report', 'other'].includes(type);
}

/**
 * Validate feedback description
 */
export function validateDescription(description: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = description.trim();

  if (trimmed.length < FEEDBACK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH) {
    return {
      valid: false,
      error: `Description must be at least ${FEEDBACK_CONSTRAINTS.DESCRIPTION_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > FEEDBACK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `Description must be less than ${FEEDBACK_CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate screenshot base64 string
 */
export function validateScreenshot(base64: string): {
  valid: boolean;
  error?: string;
  mimeType?: string;
  buffer?: Buffer;
} {
  // Extract mime type and data from base64 string
  const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    return { valid: false, error: 'Invalid screenshot format' };
  }

  const [, mimeType, data] = matches;

  // Validate mime type
  if (
    !FEEDBACK_CONSTRAINTS.ALLOWED_SCREENSHOT_TYPES.includes(
      mimeType as (typeof FEEDBACK_CONSTRAINTS.ALLOWED_SCREENSHOT_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: `Screenshot must be JPEG, PNG, or WebP`,
    };
  }

  // Decode and check size
  const buffer = Buffer.from(data, 'base64');
  if (buffer.length > FEEDBACK_CONSTRAINTS.MAX_SCREENSHOT_SIZE_BYTES) {
    return {
      valid: false,
      error: `Screenshot must be less than 5MB`,
    };
  }

  return { valid: true, mimeType, buffer };
}

/**
 * Validate complete feedback submission request
 */
export function validateFeedbackRequest(request: SubmitFeedbackRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate type
  if (!isValidFeedbackType(request.type)) {
    errors.push('Invalid feedback type');
  }

  // Validate description
  const descValidation = validateDescription(request.description);
  if (!descValidation.valid && descValidation.error) {
    errors.push(descValidation.error);
  }

  // Validate email if provided
  if (request.email && !isValidEmail(request.email)) {
    errors.push('Invalid email address');
  }

  // Validate screenshot if provided
  if (request.screenshotBase64) {
    const screenshotValidation = validateScreenshot(request.screenshotBase64);
    if (!screenshotValidation.valid && screenshotValidation.error) {
      errors.push(screenshotValidation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate storage path for screenshot
 */
export function generateScreenshotPath(feedbackId: string): string {
  const timestamp = Date.now();
  return `${feedbackId}/${timestamp}.png`;
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return extensions[mimeType] || 'png';
}
