/**
 * Feedback Types
 * Type definitions for the user feedback system
 */

/**
 * Types of feedback submissions
 */
export type FeedbackType = 'feature_request' | 'bug_report' | 'other';

/**
 * Workflow status for feedback management
 */
export type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';

/**
 * User feedback submission with optional joined user data
 */
export interface UserFeedback {
  id: string;
  type: FeedbackType;
  description: string;
  email: string | null;
  screenshot_url: string | null;
  page_url: string | null;
  user_id: string | null;
  user_agent: string | null;
  viewport_size: string | null;
  locale: string | null;
  status: FeedbackStatus;
  internal_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined data
  user?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  reviewer?: {
    id: string;
    full_name: string | null;
  } | null;
}

/**
 * Request payload for submitting feedback
 */
export interface SubmitFeedbackRequest {
  type: FeedbackType;
  description: string;
  email?: string;
  screenshotBase64?: string;
  context: {
    pageUrl: string;
    userAgent: string;
    viewportSize: string;
    locale: string;
  };
}

/**
 * Response from submitting feedback
 */
export interface SubmitFeedbackResponse {
  success: boolean;
  id: string;
}

/**
 * Request payload for updating feedback (staff only)
 */
export interface UpdateFeedbackRequest {
  status?: FeedbackStatus;
  internal_notes?: string;
}

/**
 * Query parameters for listing feedback
 */
export interface FeedbackListParams {
  status?: FeedbackStatus;
  type?: FeedbackType;
  page?: number;
  limit?: number;
}

/**
 * Paginated response for feedback list
 */
export interface FeedbackListResponse {
  data: UserFeedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Feedback validation constraints
 */
export const FEEDBACK_CONSTRAINTS = {
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 5000,
  MAX_SCREENSHOT_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_SCREENSHOT_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

/**
 * Display labels for feedback types
 */
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  feature_request: 'Feature request',
  bug_report: 'Bug report',
  other: 'Other',
};

/**
 * Display labels for feedback statuses
 */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
