-- Migration: Add auction last-bid cooldown end strategy
-- Adds two columns to listings and updates place_bid() to support cooldown auctions

-- Step 1: Add columns
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS auction_end_strategy TEXT DEFAULT 'fixed'
    CHECK (auction_end_strategy IN ('fixed', 'cooldown')),
  ADD COLUMN IF NOT EXISTS auction_cooldown_hours INTEGER
    CHECK (auction_cooldown_hours IS NULL OR auction_cooldown_hours IN (24, 48));

-- Step 2: Enforce cooldown_hours required when strategy is cooldown
ALTER TABLE listings
  ADD CONSTRAINT auction_cooldown_required
    CHECK (
      auction_end_strategy != 'cooldown'
      OR auction_cooldown_hours IS NOT NULL
    );

-- Step 3: Update place_bid() to branch on end strategy
CREATE OR REPLACE FUNCTION place_bid(
  p_listing_id UUID,
  p_bidder_id UUID,
  p_amount DECIMAL(10,2),
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_current_high_bid DECIMAL(10,2);
  v_previous_bidder_id UUID;
  v_min_bid DECIMAL(10,2);
  v_time_remaining INTERVAL;
  v_extension_minutes INTEGER;
  v_new_end_time TIMESTAMPTZ;
  v_bid_id UUID;
BEGIN
  -- Lock the listing row to prevent race conditions
  SELECT * INTO v_listing
  FROM listings
  WHERE id = p_listing_id
  FOR UPDATE;

  -- Validation: Listing exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  -- Validation: Is an auction
  IF v_listing.listing_type != 'auction' THEN
    RETURN json_build_object('success', false, 'error', 'This listing is not an auction');
  END IF;

  -- Validation: Auction is active
  IF v_listing.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'This auction is not active');
  END IF;

  -- Validation: Auction has not ended
  IF v_listing.auction_ends_at <= NOW() THEN
    RETURN json_build_object('success', false, 'error', 'This auction has ended');
  END IF;

  -- Validation: Seller cannot bid on own auction
  IF v_listing.seller_id = p_bidder_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot bid on your own auction');
  END IF;

  -- Get previous highest bidder (for outbid notification)
  SELECT bidder_id INTO v_previous_bidder_id
  FROM bids
  WHERE listing_id = p_listing_id AND is_winning = true
  LIMIT 1;

  -- Calculate minimum bid (current bid + EUR 1.00 increment)
  v_current_high_bid := COALESCE(v_listing.auction_current_bid, 0);
  IF v_current_high_bid = 0 THEN
    v_min_bid := v_listing.auction_start_price;
  ELSE
    v_min_bid := v_current_high_bid + 1.00; -- EUR 1.00 minimum increment
  END IF;

  -- Validation: Bid meets minimum
  IF p_amount < v_min_bid THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Bid must be at least EUR %.2f', v_min_bid),
      'minimum_bid', v_min_bid
    );
  END IF;

  -- Extension logic: branch on end strategy
  v_time_remaining := v_listing.auction_ends_at - NOW();
  v_extension_minutes := 0;
  v_new_end_time := v_listing.auction_ends_at;

  IF COALESCE(v_listing.auction_end_strategy, 'fixed') = 'cooldown' THEN
    -- Cooldown strategy: always reset timer to NOW() + cooldown hours
    v_extension_minutes := COALESCE(v_listing.auction_cooldown_hours, 24) * 60;
    v_new_end_time := NOW() + (COALESCE(v_listing.auction_cooldown_hours, 24) || ' hours')::INTERVAL;
  ELSIF v_time_remaining <= INTERVAL '5 minutes' THEN
    -- Fixed strategy: anti-snipe extension (2-5 minutes) in final 5 minutes
    v_extension_minutes := 2 + floor(random() * 4)::INTEGER;
    v_new_end_time := v_listing.auction_ends_at + (v_extension_minutes || ' minutes')::INTERVAL;
  END IF;

  -- Mark previous winning bid as not winning
  UPDATE bids SET is_winning = false
  WHERE listing_id = p_listing_id AND is_winning = true;

  -- Insert the new bid
  INSERT INTO bids (
    listing_id, bidder_id, amount, is_winning,
    triggered_extension, extension_minutes, ip_address, user_agent
  )
  VALUES (
    p_listing_id, p_bidder_id, p_amount, true,
    v_extension_minutes > 0, NULLIF(v_extension_minutes, 0), p_ip_address, p_user_agent
  )
  RETURNING id INTO v_bid_id;

  -- Update listing with new bid info
  UPDATE listings
  SET
    auction_current_bid = p_amount,
    auction_bid_count = COALESCE(auction_bid_count, 0) + 1,
    auction_ends_at = v_new_end_time,
    auction_anti_snipe_extended = auction_anti_snipe_extended OR (v_extension_minutes > 0),
    updated_at = NOW()
  WHERE id = p_listing_id;

  -- Broadcast bid event for Realtime subscribers
  PERFORM pg_notify('auction_bids', json_build_object(
    'listing_id', p_listing_id,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'bid_count', v_listing.auction_bid_count + 1,
    'ends_at', v_new_end_time,
    'was_extended', v_extension_minutes > 0
  )::TEXT);

  RETURN json_build_object(
    'success', true,
    'bid_id', v_bid_id,
    'amount', p_amount,
    'new_end_time', v_new_end_time,
    'was_extended', v_extension_minutes > 0,
    'extension_minutes', v_extension_minutes,
    'previous_bidder_id', v_previous_bidder_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update listings_with_details view to include new columns
CREATE OR REPLACE VIEW listings_with_details WITH (security_invoker = true) AS
SELECT
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
  l.transaction_method,
  l.pricing_format,
  l.listing_type,
  l.reserved_by,
  l.reserved_until,
  l.included_expansions,
  l.created_at,
  l.updated_at,
  l.auction_start_price,
  l.auction_current_bid,
  l.auction_bid_count,
  l.auction_ends_at,
  l.auction_duration_days,
  l.auction_winner_id,
  l.auction_payment_deadline,
  l.auction_anti_snipe_extended,
  l.auction_end_strategy,
  l.auction_cooldown_hours,
  g.thumbnail AS game_thumbnail,
  g.image AS game_image,
  g.player_count AS game_player_count,
  g.min_age AS game_min_age,
  g.playing_time AS game_playing_time,
  g.is_expansion AS game_is_expansion,
  g.versions AS game_versions,
  pp.full_name AS seller_name,
  pp.avatar_url AS seller_avatar_url,
  pp.country AS seller_country,
  COALESCE(psp.total_reviews, 0) AS seller_total_reviews,
  COALESCE(psp.average_rating, 0) AS seller_average_rating,
  COALESCE(psp.positive_rating_percent, 0) AS seller_positive_rating_percent,
  COALESCE(psp.total_completed_sales, 0) AS seller_total_completed_sales,
  psp.member_since AS seller_member_since,
  COALESCE(psp.badge_tier, 'new_seller') AS seller_badge_tier
FROM listings l
LEFT JOIN games g ON l.bgg_game_id = g.id
LEFT JOIN public_profiles pp ON l.seller_id = pp.id
LEFT JOIN public_seller_profiles psp ON l.seller_id = psp.user_id;
