import { Link } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase/client';
import { ListingCard } from '@/components/listing/ListingCard';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';
import { Button } from '@second-turn/design-system';
import type { ListingWithSeller } from '@/lib/types/listing';
import { getTranslations } from 'next-intl/server';

async function getFeaturedListings() {
  const client = supabase;

  const { data: listings, error } = await client
    .from('listings')
    .select(`
      *,
      game:games!listings_bgg_game_id_fkey (
        thumbnail,
        image,
        player_count,
        min_age,
        playing_time,
        is_expansion
      ),
      seller:user_profiles!listings_seller_id_fkey (
        id,
        full_name,
        email,
        avatar_url,
        country
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error('Error fetching featured listings:', error);
    return [];
  }

  // Cast through unknown due to JSONB columns (included_expansions) typed as generic Json
  return (listings || []) as unknown as ListingWithSeller[];
}

export async function FeaturedGames() {
  const t = await getTranslations('Home.FeaturedGames');
  const listings = await getFeaturedListings();

  if (listings.length === 0) {
    return null; // Don't show section if no listings
  }

  return (
    <section className="py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Listings grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} showSeller={true} />
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center">
          <Link href="/browse">
            <Button size="lg" variant="secondary">
              {t('browseAll')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// Loading state component
export function FeaturedGamesLoading() {
  return (
    <section className="py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <div className="h-10 bg-bg-elevated rounded w-64 mx-auto mb-4 animate-pulse" />
          <div className="h-6 bg-bg-elevated rounded w-96 mx-auto animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[...Array(4)].map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
