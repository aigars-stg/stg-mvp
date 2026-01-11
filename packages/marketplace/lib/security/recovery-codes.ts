import { createServiceClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Number of recovery codes to generate
 */
const RECOVERY_CODE_COUNT = 8;

/**
 * Length of each code in bytes (4 bytes = 8 hex chars)
 */
const CODE_LENGTH_BYTES = 4;

/**
 * Generate cryptographically secure recovery codes
 *
 * Each code is 8 uppercase hex characters (e.g., "A1B2C3D4")
 * Format chosen for readability and ease of manual entry
 *
 * @returns Array of 8 recovery codes
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    // Generate random bytes and convert to uppercase hex
    const code = crypto.randomBytes(CODE_LENGTH_BYTES).toString('hex').toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Format a recovery code for display (add dash in middle)
 * e.g., "A1B2C3D4" -> "A1B2-C3D4"
 */
export function formatCodeForDisplay(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Normalize a recovery code for comparison
 * Removes dashes, spaces, converts to uppercase
 */
export function normalizeCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Save recovery codes to user profile
 *
 * @param userId - The user's ID
 * @param codes - Array of recovery codes (unhashed)
 * @param supabase - Optional Supabase client (defaults to service client)
 */
export async function saveRecoveryCodes(
  userId: string,
  codes: string[],
  supabase?: SupabaseClient
): Promise<{ success: boolean; error?: Error }> {
  try {
    const client = supabase || createServiceClient();

    // Note: recovery_codes columns added in migration 076
    // Type assertion needed until database types are regenerated after migration
    const { error } = await (client as any)
      .from('user_profiles')
      .update({
        recovery_codes: codes,
        recovery_codes_generated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[RecoveryCodes] Failed to save codes:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (error) {
    console.error('[RecoveryCodes] Exception saving codes:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Validate and consume a recovery code
 *
 * If the code is valid, it is removed from the user's available codes.
 * This ensures each code can only be used once.
 *
 * @param userId - The user's ID
 * @param code - The code to validate (will be normalized)
 * @returns Whether the code was valid and consumed
 */
export async function validateAndConsumeRecoveryCode(
  userId: string,
  code: string
): Promise<{ valid: boolean; remainingCodes?: number; error?: Error }> {
  try {
    const supabase = createServiceClient();
    const normalizedCode = normalizeCode(code);

    // Use the database function to atomically validate and consume
    // Note: consume_recovery_code function added in migration 076
    // Type assertion needed until database types are regenerated after migration
    const { data, error } = await (supabase as any).rpc('consume_recovery_code', {
      target_user_id: userId,
      code_to_use: normalizedCode,
    });

    if (error) {
      console.error('[RecoveryCodes] Failed to validate code:', error);
      return { valid: false, error: new Error(error.message) };
    }

    if (!data) {
      return { valid: false };
    }

    // Get remaining codes count
    const { data: profile } = await (supabase as any)
      .from('user_profiles')
      .select('recovery_codes')
      .eq('id', userId)
      .single();

    const remainingCodes = (profile as any)?.recovery_codes?.length ?? 0;

    return { valid: true, remainingCodes };
  } catch (error) {
    console.error('[RecoveryCodes] Exception validating code:', error);
    return {
      valid: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Get remaining recovery codes count for a user
 *
 * @param userId - The user's ID
 * @returns Number of remaining codes, or null if error
 */
export async function getRemainingCodesCount(userId: string): Promise<number | null> {
  try {
    const supabase = createServiceClient();

    // Type assertion needed until database types are regenerated after migration
    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .select('recovery_codes')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[RecoveryCodes] Failed to get codes count:', error);
      return null;
    }

    return (data as any)?.recovery_codes?.length ?? 0;
  } catch (error) {
    console.error('[RecoveryCodes] Exception getting codes count:', error);
    return null;
  }
}

/**
 * Generate new recovery codes and save them for a user
 *
 * Use this when:
 * 1. User creates account (initial generation)
 * 2. User requests to regenerate codes
 * 3. User has used all codes and needs new ones
 *
 * @param userId - The user's ID
 * @returns The newly generated codes (display to user once, then never again)
 */
export async function regenerateRecoveryCodes(
  userId: string
): Promise<{ success: boolean; codes?: string[]; error?: Error }> {
  const codes = generateRecoveryCodes();
  const result = await saveRecoveryCodes(userId, codes);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, codes };
}
