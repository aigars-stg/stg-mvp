import type { User } from '@supabase/supabase-js';
import type { SellerProfile, SellerStatus } from '../types/seller';

/**
 * Auth flow state machine states for the email-first authentication.
 * Used by /auth page to manage inline state transitions.
 */
export type AuthFlowState =
  | 'email_entry'      // Initial state: user enters email
  | 'checking'         // Loading state: checking if email exists
  | 'new_user'         // Email not found: show signup flow (magic link)
  | 'existing_user'    // Email found: show signin flow (magic link or password)
  | 'magic_link_sent'  // Success: magic link email sent
  | 'error';           // Error state

/**
 * Core user profile data (from user_profiles table)
 * Seller-specific data is now in SellerProfile
 */
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deletion_reason?: string | null;
  recovery_deadline?: string | null;
  original_email?: string | null;
  // Onboarding tracking
  profile_banner_dismissed_until?: string | null;
  onboarding_email_step?: number;
  last_onboarding_email_at?: string | null;
  // Legacy: seller_status still available during migration
  seller_status?: SellerStatus;
}

/**
 * Combined user profile with seller data (from user_profiles_full view)
 * Use this during the migration period for backward compatibility
 */
export interface UserProfileFull extends UserProfile {
  // Seller fields (from seller_profiles via view)
  seller_status: SellerStatus;
  seller_terms_accepted_at: string | null;
  seller_terms_version: string;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_completed: boolean;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_details_submitted: boolean;
  stripe_connect_updated_at: string | null;
  stripe_requirements: Record<string, unknown>;
  stripe_capabilities: Record<string, unknown>;
  dac7_annual_transaction_count: number;
  dac7_annual_sales_total: number;
  dac7_reporting_year: number | null;
  dac7_tax_id: string | null;
  dac7_tax_id_type: string | null;
  has_bank_account: boolean;
  bank_account_last4: string | null;
  bank_account_bank_name: string | null;
}

// Re-export seller types for convenience
export type { SellerProfile, SellerStatus };

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Whether user's email is verified */
  isEmailVerified: boolean;
  /** Whether user's profile is complete (has display name and country) */
  isProfileComplete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, country: string | null) => Promise<{ error: Error | null }>;
  /** Sign in with magic link (passwordless) - works for both new and existing users */
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'facebook') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}
