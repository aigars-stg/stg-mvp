-- Migration: Add transaction conversations support
-- Description: Links conversations to orders for unified transaction messaging,
--              adds photo attachments to messages, and adds system message types

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- 1. Add order_id to conversations table
-- This allows conversations to be linked to orders/transactions
ALTER TABLE conversations
ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- Index for efficient lookup by order_id
CREATE INDEX idx_conversations_order_id ON conversations(order_id);

-- Unique constraint: only one conversation per order
-- (NULL values are allowed and don't conflict)
CREATE UNIQUE INDEX idx_conversations_order_unique
ON conversations(order_id)
WHERE order_id IS NOT NULL;

-- 2. Add photo attachments support to messages
ALTER TABLE messages
ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

-- 3. Add system message type for categorization
-- Values: order_created, order_accepted, order_declined, order_cancelled,
--         order_shipped, order_in_transit, order_delivered, order_completed,
--         issue_reported, staff_note, refund_processed
ALTER TABLE messages
ADD COLUMN system_message_type VARCHAR(50);

-- ============================================================================
-- CREATE STORAGE BUCKET FOR TRANSACTION PHOTOS
-- ============================================================================

-- Note: Storage bucket creation should be done via Supabase dashboard or API:
-- Bucket name: transaction-photos
-- Public: false
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Max file size: 5MB

-- ============================================================================
-- RLS POLICY UPDATES
-- ============================================================================

-- Drop existing SELECT policy to replace with enhanced version
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

-- New SELECT policy: Users can view conversations they're part of
-- Either as direct participant (buyer/seller) or via linked order
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  -- Direct participant (existing behavior)
  auth.uid() = buyer_id
  OR auth.uid() = seller_id
  -- OR participant on linked order
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  )
);

-- Drop existing UPDATE policy to replace with enhanced version
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;

-- New UPDATE policy: Participants can update conversations
CREATE POLICY "Participants can update conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  auth.uid() = buyer_id
  OR auth.uid() = seller_id
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  )
)
WITH CHECK (
  auth.uid() = buyer_id
  OR auth.uid() = seller_id
  OR (
    order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = conversations.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  )
);

-- Drop existing INSERT policy to replace with enhanced version
DROP POLICY IF EXISTS "Buyers can create conversations" ON conversations;

-- New INSERT policy: Users can create conversations for listings OR orders
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND buyer_id != seller_id
  AND (
    -- For order-based conversations: order_id must exist and user must be participant
    (
      order_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
      )
    )
    OR
    -- For wanted listings: listing_id is null
    listing_id IS NULL
    OR
    -- For regular listings: listing_id must reference an active listing
    EXISTS (
      SELECT 1 FROM listings
      WHERE id = listing_id
      AND status = 'active'
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = seller_id AND blocked_id = buyer_id)
    OR (blocker_id = buyer_id AND blocked_id = seller_id)
  )
);

-- ============================================================================
-- UPDATE MESSAGES POLICIES FOR PHOTO ATTACHMENTS
-- ============================================================================

-- Drop existing INSERT policy to replace with photo validation
DROP POLICY IF EXISTS "Participants can send messages" ON messages;

-- New INSERT policy: Participants can send messages with optional photos
CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  -- For system messages, sender_id can be null
  (is_system_message = true AND sender_id IS NULL)
  OR
  (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (
        -- Direct participant
        c.buyer_id = auth.uid() OR c.seller_id = auth.uid()
        -- OR order participant
        OR (
          c.order_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = c.order_id
            AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
          )
        )
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      INNER JOIN conversations c ON c.id = conversation_id
      WHERE (
        (bu.blocker_id = c.buyer_id AND bu.blocked_id = c.seller_id)
        OR (bu.blocker_id = c.seller_id AND bu.blocked_id = c.buyer_id)
      )
    )
  )
  -- Validate photo_urls: max 5 photos per message
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 5)
);

-- Drop existing SELECT policy to replace with enhanced version
DROP POLICY IF EXISTS "Participants can view messages" ON messages;

-- New SELECT policy: Participants can view messages (including via order)
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.buyer_id = auth.uid()
      OR c.seller_id = auth.uid()
      OR (
        c.order_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM orders o
          WHERE o.id = c.order_id
          AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        )
      )
    )
  )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get or create conversation for an order
CREATE OR REPLACE FUNCTION get_or_create_transaction_conversation(
  p_order_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  -- Check if conversation already exists for this order
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE order_id = p_order_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Get buyer and seller from order
  SELECT buyer_id, seller_id
  INTO v_buyer_id, v_seller_id
  FROM orders
  WHERE id = p_order_id;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (order_id, buyer_id, seller_id, listing_id)
  VALUES (p_order_id, v_buyer_id, v_seller_id, NULL)
  RETURNING id INTO v_conversation_id;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Post system message to transaction conversation
CREATE OR REPLACE FUNCTION post_transaction_system_message(
  p_order_id UUID,
  p_message_type VARCHAR(50),
  p_content TEXT
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_message_id UUID;
BEGIN
  -- Get or create conversation
  v_conversation_id := get_or_create_transaction_conversation(p_order_id);

  -- Insert system message
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    is_system_message,
    system_message_type
  )
  VALUES (
    v_conversation_id,
    NULL,  -- System messages have no sender
    p_content,
    true,
    p_message_type
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN conversations.order_id IS
  'Links conversation to an order for transaction messaging. NULL for listing-only conversations.';

COMMENT ON COLUMN messages.photo_urls IS
  'Array of Supabase Storage URLs for photo attachments. Max 5 photos per message.';

COMMENT ON COLUMN messages.system_message_type IS
  'Type of system message for categorization and formatting (e.g., order_created, order_shipped).';

COMMENT ON FUNCTION get_or_create_transaction_conversation(UUID) IS
  'Gets existing or creates new conversation for an order. Returns conversation_id.';

COMMENT ON FUNCTION post_transaction_system_message(UUID, VARCHAR, TEXT) IS
  'Posts a system message to a transaction conversation. Creates conversation if needed.';
