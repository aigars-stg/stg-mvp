/**
 * Achievement service
 * Checks and awards achievements after listing creation
 * Achievement failures are silently caught — they should never break listing flow
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ==============================================
// CONSTANTS
// ==============================================

export const ACHIEVEMENT_IDS = {
  FIRST_TURN: 'first_turn',
  SPEED_ROUND: 'speed_round',
} as const;

/** Maximum time (ms) from flow start to listing creation for speed_round */
export const SPEED_ROUND_THRESHOLD_MS = 60_000;

// ==============================================
// TYPES
// ==============================================

export interface AchievementContext {
  /** Epoch ms when the listing flow started (used for speed_round check) */
  flowStartTime?: number;
}

// ==============================================
// MAIN FUNCTION
// ==============================================

/**
 * Check and award achievements after listing creation.
 * Uses INSERT ... ON CONFLICT DO NOTHING to ensure idempotency.
 * Returns an array of newly awarded achievement IDs (empty if none or on error).
 *
 * @param supabase - Service role client (needed for insert permission on user_achievements)
 * @param userId - The user to check achievements for
 * @param context - Additional context about the listing flow
 */
export async function checkAndAwardAchievements(
  supabase: SupabaseClient,
  userId: string,
  context: AchievementContext = {}
): Promise<string[]> {
  try {
    const awarded: string[] = [];

    // Check each achievement independently
    const firstTurnResult = await checkFirstTurn(supabase, userId);
    if (firstTurnResult) awarded.push(firstTurnResult);

    const speedRoundResult = await checkSpeedRound(supabase, userId, context);
    if (speedRoundResult) awarded.push(speedRoundResult);

    return awarded;
  } catch (error) {
    // Achievement failures should never break listing creation
    console.error('[achievements] Error checking achievements:', error);
    return [];
  }
}

// ==============================================
// INDIVIDUAL CHECKS
// ==============================================

/**
 * first_turn: Awarded when user has exactly 1 active listing (their first)
 */
async function checkFirstTurn(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { count, error } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('[achievements] Error checking first_turn:', error.message);
    return null;
  }

  if (count !== 1) return null;

  return awardAchievement(supabase, userId, ACHIEVEMENT_IDS.FIRST_TURN);
}

/**
 * speed_round: Awarded when listing is created within 60 seconds of starting the flow.
 *
 * Note: flowStartTime is client-provided and therefore spoofable. This is an
 * accepted tradeoff — speed_round is a cosmetic gamification achievement with
 * no monetary value. Server-side timing would require persisting flow-start
 * timestamps (e.g., in drafts or sessions), which adds complexity for minimal
 * benefit. If abuse becomes visible, migrate to server-side timestamps.
 */
async function checkSpeedRound(
  supabase: SupabaseClient,
  userId: string,
  context: AchievementContext
): Promise<string | null> {
  if (!context.flowStartTime) return null;

  const elapsed = Date.now() - context.flowStartTime;
  if (elapsed >= SPEED_ROUND_THRESHOLD_MS) return null;

  return awardAchievement(supabase, userId, ACHIEVEMENT_IDS.SPEED_ROUND);
}

// ==============================================
// HELPERS
// ==============================================

/**
 * Insert an achievement row. ON CONFLICT DO NOTHING ensures idempotency.
 * Returns the achievement_id if newly awarded, null if already existed.
 */
async function awardAchievement(
  supabase: SupabaseClient,
  userId: string,
  achievementId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_achievements')
    .upsert(
      { user_id: userId, achievement_id: achievementId },
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    )
    .select('achievement_id')
    .maybeSingle();

  if (error) {
    console.error(`[achievements] Error awarding ${achievementId}:`, error.message);
    return null;
  }

  // data is null when the duplicate was ignored (achievement already existed)
  return data?.achievement_id ?? null;
}
