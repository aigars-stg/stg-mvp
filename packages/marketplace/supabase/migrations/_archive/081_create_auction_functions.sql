-- Migration: Create auction helper functions
-- Description: Functions for placing bids, ending auctions, and anti-snipe logic
--
-- Functions:
--   - place_bid: Place a bid with validation and anti-snipe
--   - process_ended_auctions: Cron job to determine winners
--   - handle_expired_auction_payments: Cron job for payment deadlines
--   - can_cancel_auction: Check if auction can be cancelled

-- =============================================================================
-- Function: place_bid
-- Places a bid on an auction with validation and anti-snipe logic
-- =============================================================================
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

  -- Anti-snipe logic: extend if bid placed in final 5 minutes
  v_time_remaining := v_listing.auction_ends_at - NOW();
  v_extension_minutes := 0;
  v_new_end_time := v_listing.auction_ends_at;

  IF v_time_remaining <= INTERVAL '5 minutes' THEN
    -- Random extension between 2-5 minutes to prevent predictable timing
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

-- =============================================================================
-- Function: process_ended_auctions
-- Called by cron job to determine winners for ended auctions
-- =============================================================================
CREATE OR REPLACE FUNCTION process_ended_auctions()
RETURNS JSON AS $$
DECLARE
  v_auction RECORD;
  v_winning_bid RECORD;
  v_processed_count INTEGER := 0;
  v_winners_set INTEGER := 0;
  v_no_bids_count INTEGER := 0;
BEGIN
  -- Find all auctions that have ended but not yet processed
  FOR v_auction IN
    SELECT id, seller_id, auction_current_bid, game_name, auction_bid_count
    FROM listings
    WHERE listing_type = 'auction'
      AND status = 'active'
      AND auction_ends_at <= NOW()
      AND auction_winner_id IS NULL
  LOOP
    v_processed_count := v_processed_count + 1;

    -- Find winning bid
    SELECT * INTO v_winning_bid
    FROM bids
    WHERE listing_id = v_auction.id
      AND is_winning = true
    LIMIT 1;

    IF FOUND THEN
      -- Set winner and payment deadline (48 hours)
      UPDATE listings
      SET
        auction_winner_id = v_winning_bid.bidder_id,
        auction_payment_deadline = NOW() + INTERVAL '48 hours',
        updated_at = NOW()
      WHERE id = v_auction.id;

      v_winners_set := v_winners_set + 1;

      -- Create notification for winner (email sent by Edge Function)
      PERFORM create_notification(
        v_winning_bid.bidder_id,
        'auction_won',
        format('You won %s!', v_auction.game_name),
        format('Congratulations! Complete your payment within 48 hours to claim your game.'),
        json_build_object(
          'listing_id', v_auction.id,
          'game_name', v_auction.game_name,
          'winning_bid', v_auction.auction_current_bid
        )::JSONB
      );
    ELSE
      -- No bids - mark as removed (expired)
      UPDATE listings
      SET
        status = 'removed',
        removed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_auction.id;

      v_no_bids_count := v_no_bids_count + 1;

      -- Create notification for seller
      PERFORM create_notification(
        v_auction.seller_id,
        'auction_expired',
        format('%s auction ended with no bids', v_auction.game_name),
        'Consider relisting at a lower starting price to attract bidders.',
        json_build_object(
          'listing_id', v_auction.id,
          'game_name', v_auction.game_name
        )::JSONB
      );
    END IF;
  END LOOP;

  RETURN json_build_object(
    'processed_count', v_processed_count,
    'winners_set', v_winners_set,
    'no_bids_count', v_no_bids_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: handle_expired_auction_payments
-- Called by cron job to handle auctions where winner did not pay
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_expired_auction_payments()
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_second_bidder RECORD;
  v_expired_count INTEGER := 0;
  v_offered_to_second INTEGER := 0;
  v_expired_no_second INTEGER := 0;
  v_threshold DECIMAL(10,2);
BEGIN
  FOR v_listing IN
    SELECT l.id, l.auction_winner_id, l.auction_current_bid, l.seller_id, l.game_name
    FROM listings l
    WHERE l.listing_type = 'auction'
      AND l.auction_winner_id IS NOT NULL
      AND l.auction_payment_deadline < NOW()
      AND l.status = 'active' -- Not yet paid/completed
  LOOP
    v_expired_count := v_expired_count + 1;

    -- Calculate 80% threshold for second bidder offer
    v_threshold := v_listing.auction_current_bid * 0.80;

    -- Find second-highest bidder (if >= 80% of winning bid)
    SELECT b.bidder_id, b.amount INTO v_second_bidder
    FROM bids b
    WHERE b.listing_id = v_listing.id
      AND b.bidder_id != v_listing.auction_winner_id
      AND b.amount >= v_threshold
    ORDER BY b.amount DESC
    LIMIT 1;

    IF FOUND THEN
      -- Offer to second-highest bidder
      UPDATE listings
      SET
        auction_winner_id = v_second_bidder.bidder_id,
        auction_payment_deadline = NOW() + INTERVAL '48 hours',
        updated_at = NOW()
      WHERE id = v_listing.id;

      v_offered_to_second := v_offered_to_second + 1;

      -- Create notification for second bidder
      PERFORM create_notification(
        v_second_bidder.bidder_id,
        'second_chance',
        format('Second chance: %s is available!', v_listing.game_name),
        format('The original winner''s payment didn''t go through. Would you still like %s at your bid of EUR %.2f?', v_listing.game_name, v_second_bidder.amount),
        json_build_object(
          'listing_id', v_listing.id,
          'game_name', v_listing.game_name,
          'your_bid', v_second_bidder.amount
        )::JSONB
      );
    ELSE
      -- No eligible second bidder - expire the listing
      UPDATE listings
      SET
        status = 'removed',
        removed_at = NOW(),
        updated_at = NOW()
      WHERE id = v_listing.id;

      v_expired_no_second := v_expired_no_second + 1;

      -- Notify seller
      PERFORM create_notification(
        v_listing.seller_id,
        'auction_expired',
        format('%s auction payment expired', v_listing.game_name),
        'The winning bidder did not complete payment. You can relist the item.',
        json_build_object(
          'listing_id', v_listing.id,
          'game_name', v_listing.game_name
        )::JSONB
      );
    END IF;
  END LOOP;

  RETURN json_build_object(
    'expired_count', v_expired_count,
    'offered_to_second', v_offered_to_second,
    'expired_no_second', v_expired_no_second
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: can_cancel_auction
-- Returns false if auction has bids (cancellation blocked)
-- =============================================================================
CREATE OR REPLACE FUNCTION can_cancel_auction(p_listing_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_bid_count INTEGER;
BEGIN
  SELECT auction_bid_count INTO v_bid_count
  FROM listings
  WHERE id = p_listing_id
    AND listing_type = 'auction';

  IF NOT FOUND THEN
    RETURN true; -- Not an auction, can cancel
  END IF;

  RETURN COALESCE(v_bid_count, 0) = 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION place_bid TO authenticated;
GRANT EXECUTE ON FUNCTION process_ended_auctions TO service_role;
GRANT EXECUTE ON FUNCTION handle_expired_auction_payments TO service_role;
GRANT EXECUTE ON FUNCTION can_cancel_auction TO authenticated;

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON FUNCTION place_bid IS 'Place a bid on an auction with validation and anti-snipe logic. Returns JSON with success status, bid details, and previous bidder ID for outbid notification.';
COMMENT ON FUNCTION process_ended_auctions IS 'Cron job function: determine winners for ended auctions, create notifications, mark no-bid auctions as expired.';
COMMENT ON FUNCTION handle_expired_auction_payments IS 'Cron job function: handle auctions where winner did not pay within 48h. Offers to second bidder if >= 80% threshold, otherwise expires listing.';
COMMENT ON FUNCTION can_cancel_auction IS 'Check if an auction can be cancelled (only if no bids have been placed).';
