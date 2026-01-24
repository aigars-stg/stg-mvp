-- Migration: Add wanted_match notification type
-- Purpose: Notify buyers when a listing is created matching their wanted listing
-- Notification copy: "{Game Name} just got listed — matches your request. Act fast!"

-- Drop and recreate the CHECK constraint to include the new type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'outbid',           -- Someone placed a higher bid
    'auction_won',      -- User won an auction
    'auction_expired',  -- Auction ended with no bids (for seller)
    'second_chance',    -- Winner didn't pay, offering to second bidder
    'payment_reminder', -- Reminder to complete payment
    'auction_ending',   -- Auction ending soon (watched)
    'wanted_match'      -- A listing was created matching user's wanted listing
  ));

COMMENT ON CONSTRAINT notifications_type_check ON notifications IS 'Valid notification types including wanted_match for ISO listing matches';
