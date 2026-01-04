/**
 * Listing Question Types
 * Type definitions for the public Q&A system on listings
 */

/**
 * Author information for questions/answers
 */
export interface QuestionAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * A question or reply in the listing Q&A system
 */
export interface ListingQuestion {
  id: string;
  listing_id: string;
  user_id: string;
  content: string;
  parent_id: string | null; // null = top-level question, UUID = reply
  created_at: string;
  updated_at: string;

  // Joined data
  author: QuestionAuthor;
  is_seller: boolean; // true if author is the listing's seller

  // Only present on top-level questions
  replies?: ListingQuestion[];
  reply_count?: number;
}

/**
 * Response from GET /api/listings/[id]/questions
 */
export interface ListingQuestionsResponse {
  questions: ListingQuestion[];
  total: number; // Total top-level questions
}

/**
 * Response from GET /api/listings/[id]/questions?count_only=true
 */
export interface ListingQuestionCountResponse {
  count: number;
}

/**
 * Request to create a new question
 */
export interface CreateQuestionRequest {
  content: string;
}

/**
 * Request to create a reply to a question
 */
export interface CreateReplyRequest {
  content: string;
}

/**
 * Request to update a question
 */
export interface UpdateQuestionRequest {
  content: string;
}

/**
 * Question validation constraints
 */
export const QUESTION_CONSTRAINTS = {
  MAX_LENGTH: 2000,
  MIN_LENGTH: 1,
  /** Character count at which counter appears */
  COUNTER_SHOW_THRESHOLD: 1500,
  /** Character count for warning state */
  COUNTER_WARNING_THRESHOLD: 1800,
  /** Character count for critical state */
  COUNTER_CRITICAL_THRESHOLD: 1950,
} as const;

/**
 * Real-time question event payload (for future Supabase subscriptions)
 */
export interface QuestionRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ListingQuestion;
  old: ListingQuestion | null;
}
