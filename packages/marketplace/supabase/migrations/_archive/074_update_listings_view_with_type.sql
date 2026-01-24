-- Migration: Update listings_with_details view to include listing_type
-- Description: Adds listing_type column for dual-listing model support
-- Depends on: 073_add_listing_type.sql

-- Drop the existing view
DROP VIEW IF EXISTS listings_with_details;

-- Recreate with listing_type included
CREATE OR REPLACE VIEW listings_with_details WITH (security_invoker = true) AS
SELECT
  -- Listing fields
  l.id,
  l.bgg_game_id,
  l.game_name,
  l.game_year,
  l.version_source,
  l.bgg_version_id,
  l.version_name,
  l.publisher,
  l.language,
  l.edition_year,
  l.photo_urls,
  l.condition,
  l.condition_notes,
  l.all_components_present,
  l.missing_components,
  l.price,
  l.previous_price,
  l.shipping_local_pickup,
  l.shipping_parcel_locker,
  l.shipping_notes,
  l.seller_id,
  l.status,
  l.listing_type,  -- NEW: Added for dual-listing model
  l.reserved_by,
  l.reserved_until,
  l.included_expansions,
  l.created_at,
  l.updated_at,

  -- Game metadata (from games table)
  g.thumbnail AS game_thumbnail,
  g.image AS game_image,
  g.player_count AS game_player_count,
  g.min_age AS game_min_age,
  g.playing_time AS game_playing_time,
  g.is_expansion AS game_is_expansion,
  g.versions AS game_versions,

  -- Seller identity (from user_profiles via public_profiles)
  pp.full_name AS seller_name,
  pp.avatar_url AS seller_avatar_url,
  pp.country AS seller_country,

  -- Seller trust metrics (from seller_profiles via public_seller_profiles)
  COALESCE(psp.total_reviews, 0) AS seller_total_reviews,
  COALESCE(psp.average_rating, 0) AS seller_average_rating,
  COALESCE(psp.positive_rating_percent, 0) AS seller_positive_rating_percent,
  COALESCE(psp.total_completed_sales, 0) AS seller_total_completed_sales,
  psp.member_since AS seller_member_since,
  COALESCE(psp.badge_tier, 'new_seller') AS seller_badge_tier

FROM listings l
-- Join game metadata
LEFT JOIN games g ON l.bgg_game_id = g.id
-- Join seller identity (public view - no PII)
LEFT JOIN public_profiles pp ON l.seller_id = pp.id
-- Join seller trust metrics (public view - no sensitive data)
LEFT JOIN public_seller_profiles psp ON l.seller_id = psp.user_id;

-- Grant appropriate permissions
GRANT SELECT ON listings_with_details TO public;
GRANT SELECT ON listings_with_details TO anon;
GRANT SELECT ON listings_with_details TO authenticated;

-- Update comment
COMMENT ON VIEW listings_with_details IS
'Optimized view combining listings with game metadata and seller info.
Includes listing_type for dual-listing model (instant_buy vs contact_seller).
Eliminates N+1 queries in browse/listing APIs.
Uses security_invoker=true to respect RLS policies on underlying tables.';
