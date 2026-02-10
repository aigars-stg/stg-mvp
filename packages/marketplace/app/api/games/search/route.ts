import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api/error-handler';

function calculateRelevance(
  gameName: string,
  query: string,
  alternateNames: string[] | null,
  matchedInAlternate: boolean
): number {
  const lowerName = gameName.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Base scores for primary name matches
  let score = 0;

  // Exact match (highest priority)
  if (lowerName === lowerQuery) score = 1000;
  // Starts with query (very high priority)
  else if (lowerName.startsWith(lowerQuery)) score = 900;
  // Word starts with query (high priority)
  else if (lowerName.split(/[:\s-]/).some((word) => word.startsWith(lowerQuery))) score = 800;
  // Contains query as substring (medium priority)
  else score = 500;

  // If matched in alternate name but not in primary, reduce score slightly
  // This ensures primary name matches rank higher than alternate name matches
  if (matchedInAlternate && !lowerName.includes(lowerQuery)) {
    score = score * 0.9; // 10% reduction for alternate name matches
  }

  return score;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const withListings = searchParams.get('with_listings') === 'true';
  const baseGamesOnly = searchParams.get('base_games_only') === 'true';

  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      games: [],
      count: 0,
      message: 'Query must be at least 2 characters',
    });
  }

  try {
    const startTime = Date.now();
    console.log(`🔍 [Search API] Searching for: "${query}"`);

    // Fetch matching games (base games AND expansions)
    // Search in both name and alternate_names (JSONB array)
    // Fetch 3x the requested limit to ensure we get exact matches after sorting
    // This balances performance with getting all relevant exact matches
    const fetchLimit = Math.min(limit * 3, 300); // Cap at 300 to prevent timeouts

    // Search in primary name first (fast index-based search)
    let nameQuery = supabase
      .from('games')
      .select('id, name, yearpublished, thumbnail, bayesaverage, is_expansion, alternate_names')
      .ilike('name', `%${query}%`);

    if (baseGamesOnly) {
      nameQuery = nameQuery.eq('is_expansion', false);
    }

    const { data: nameMatches, error: nameError } = await nameQuery.limit(fetchLimit);

    if (nameError) {
      throw new Error(`Search failed: ${nameError.message}`);
    }

    // Also search in alternate names (slower, client-side filtering)
    // Only do this if we have room for more results
    type GameRow = NonNullable<typeof nameMatches>[number];

    let alternateMatches: GameRow[] = [];
    if ((nameMatches?.length || 0) < limit) {
      let alternateQuery = supabase
        .from('games')
        .select('id, name, yearpublished, thumbnail, bayesaverage, is_expansion, alternate_names')
        .not('alternate_names', 'is', null);

      if (baseGamesOnly) {
        alternateQuery = alternateQuery.eq('is_expansion', false);
      }

      const { data: allGamesWithAlternates } = await alternateQuery.limit(500); // Fetch more to filter client-side

      if (allGamesWithAlternates) {
        alternateMatches = allGamesWithAlternates.filter((game) => {
          if (!game.alternate_names) return false;
          const alternateNames = Array.isArray(game.alternate_names)
            ? (game.alternate_names as string[])
            : [];
          return alternateNames.some((altName) =>
            altName.toLowerCase().includes(query.toLowerCase())
          );
        });
      }
    }

    // Combine results, removing duplicates
    const nameMatchIds = new Set(nameMatches?.map((g) => g.id) || []);
    const uniqueAlternateMatches = alternateMatches.filter((g) => !nameMatchIds.has(g.id));
    const games = [...(nameMatches || []), ...uniqueAlternateMatches];

    // Sort by: 1) relevance, 2) base games before expansions, 3) rating
    const sortedGames = (games || [])
      .map((game) => {
        // Check if match was in alternate names
        const alternateNames = Array.isArray(game.alternate_names)
          ? (game.alternate_names as string[])
          : [];

        // Find the specific alternate name that matched (if any)
        const lowerQuery = query.toLowerCase();
        const matchedAlternateName = alternateNames.find((altName) =>
          altName.toLowerCase().includes(lowerQuery)
        );

        // Only consider it an "alternate match" if primary name doesn't contain query
        const matchedInAlternate = !!matchedAlternateName &&
          !game.name.toLowerCase().includes(lowerQuery);

        return {
          ...game,
          _relevanceScore: calculateRelevance(game.name, query, alternateNames, matchedInAlternate),
          // Include matched alternate name if it was the primary match reason
          _matchedAlternateName: matchedInAlternate ? matchedAlternateName : null,
        };
      })
      .sort((a, b) => {
        // Primary sort: relevance score (descending)
        if (b._relevanceScore !== a._relevanceScore) {
          return b._relevanceScore - a._relevanceScore;
        }

        // Secondary sort: base games before expansions
        if (a.is_expansion !== b.is_expansion) {
          return a.is_expansion ? 1 : -1; // false (base) comes before true (expansion)
        }

        // Tertiary sort: Bayesian average (descending), nulls last
        const aRating = a.bayesaverage ?? -1;
        const bRating = b.bayesaverage ?? -1;
        return bRating - aRating;
      })
      .slice(0, limit)
      .map(({ _relevanceScore, _matchedAlternateName, alternate_names: _alternateNames, ...game }) => ({
        ...game,
        // Include matched alternate name so UI can auto-select version/display name
        matchedAlternateName: _matchedAlternateName || undefined,
      }));

    // Optionally add listing counts
    type GameWithOptionalListingCount = (typeof sortedGames)[number] & { listingCount?: number };
    let gamesWithListings: GameWithOptionalListingCount[] = sortedGames;

    if (withListings && sortedGames.length > 0) {
      const gameIds = sortedGames.map((g) => g.id);
      const { data: listingCounts } = await supabase
        .from('listings')
        .select('bgg_game_id')
        .in('bgg_game_id', gameIds)
        .eq('status', 'active');

      // Count listings per game
      const countMap = new Map<number, number>();
      listingCounts?.forEach((l) => {
        countMap.set(l.bgg_game_id, (countMap.get(l.bgg_game_id) || 0) + 1);
      });

      gamesWithListings = sortedGames.map((game) => ({
        ...game,
        listingCount: countMap.get(game.id) || 0,
      }));

      // When showing listings, prioritize games with listings
      gamesWithListings.sort((a, b) =>
        (b.listingCount || 0) - (a.listingCount || 0)
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ [Search API] Found ${gamesWithListings.length} results in ${duration}ms (searched name + alternate names, sorted by relevance + rating)`
    );

    return NextResponse.json({
      games: gamesWithListings,
      count: gamesWithListings.length,
      query,
      durationMs: duration,
    });
  } catch (error: unknown) {
    return handleApiError(error, 'Search games');
  }
}
