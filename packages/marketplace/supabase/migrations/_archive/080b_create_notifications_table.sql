-- Migration: Create notifications table for in-app notifications
-- Description: Stores user notifications for auction events (outbid, won, expired, etc.)
--
-- This is a general-purpose notifications table that can be extended
-- for other features beyond auctions

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL CHECK (type IN (
    'outbid',           -- Someone placed a higher bid
    'auction_won',      -- User won an auction
    'auction_expired',  -- Auction ended with no bids (for seller)
    'second_chance',    -- Winner didn't pay, offering to second bidder
    'payment_reminder', -- Reminder to complete payment
    'auction_ending'    -- Auction ending soon (watched)
  )),
  title TEXT NOT NULL,
  body TEXT,

  -- Structured data for the notification (listing_id, bid_amount, etc.)
  data JSONB DEFAULT '{}',

  -- Read status
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System/service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert their own notifications (for edge functions)
CREATE POLICY "Authenticated can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Helper function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO service_role;

-- Comments for documentation
COMMENT ON TABLE notifications IS 'In-app notifications for users (auction events, etc.)';
COMMENT ON COLUMN notifications.type IS 'Notification type for categorization and display';
COMMENT ON COLUMN notifications.data IS 'Structured data: listing_id, bid_amount, game_name, etc.';
COMMENT ON COLUMN notifications.read_at IS 'NULL if unread, timestamp when read';
