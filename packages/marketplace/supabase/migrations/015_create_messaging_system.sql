-- Migration: Create messaging system for direct user-to-user communication
-- Description: Adds tables for conversations, messages, read status, and blocked users

-- ============================================================================
-- TABLES
-- ============================================================================

-- Conversations: One conversation per buyer-seller-listing combination
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_archived_at TIMESTAMPTZ,
  seller_archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one conversation per buyer-seller-listing
  CONSTRAINT unique_conversation UNIQUE(listing_id, buyer_id, seller_id),

  -- Prevent self-messaging
  CONSTRAINT no_self_message CHECK (buyer_id != seller_id)
);

-- Messages: Individual messages within conversations
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  is_system_message BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT content_length CHECK (char_length(content) <= 5000),
  CONSTRAINT no_empty_content CHECK (char_length(trim(content)) > 0)
);

-- Read status: Track what each user has read per conversation
CREATE TABLE message_read_status (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, conversation_id)
);

-- Blocked users: Privacy & safety feature
CREATE TABLE blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Conversations indexes
CREATE INDEX idx_conversations_buyer ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON conversations(seller_id, last_message_at DESC);
CREATE INDEX idx_conversations_listing ON conversations(listing_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Read status indexes
CREATE INDEX idx_read_status_user ON message_read_status(user_id);
CREATE INDEX idx_read_status_conversation ON message_read_status(conversation_id);

-- Blocked users indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update conversation timestamp when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update conversation timestamp on new message
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Trigger: Auto-update updated_at for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at for messages
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at for message_read_status
CREATE TRIGGER update_read_status_updated_at
  BEFORE UPDATE ON message_read_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Conversations Policies
-- ----------------------------------------------------------------------------

-- Users can view conversations they're part of (buyer or seller)
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- Buyers can create conversations about active listings
CREATE POLICY "Buyers can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND buyer_id != seller_id
  AND EXISTS (
    SELECT 1 FROM listings
    WHERE id = listing_id
    AND status = 'active'
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = seller_id AND blocked_id = buyer_id)
    OR (blocker_id = buyer_id AND blocked_id = seller_id)
  )
);

-- Participants can update their own archive status
CREATE POLICY "Participants can update conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ----------------------------------------------------------------------------
-- Messages Policies
-- ----------------------------------------------------------------------------

-- Participants can view messages in their conversations (excluding deleted)
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE id = messages.conversation_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Participants can send messages if not blocked
CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users bu
    INNER JOIN conversations c ON c.id = conversation_id
    WHERE (
      (bu.blocker_id = c.buyer_id AND bu.blocked_id = c.seller_id)
      OR (bu.blocker_id = c.seller_id AND bu.blocked_id = c.buyer_id)
    )
  )
);

-- Senders can soft-delete their own messages
CREATE POLICY "Senders can delete their messages"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid() AND deleted_at IS NOT NULL);

-- ----------------------------------------------------------------------------
-- Message Read Status Policies
-- ----------------------------------------------------------------------------

-- Users can view their own read status
CREATE POLICY "Users can view their own read status"
ON message_read_status FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
ON message_read_status FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Users can update their own read status
CREATE POLICY "Users can update their own read status"
ON message_read_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Blocked Users Policies
-- ----------------------------------------------------------------------------

-- Users can view who they've blocked
CREATE POLICY "Users can view their blocks"
ON blocked_users FOR SELECT
TO authenticated
USING (blocker_id = auth.uid());

-- Users can block other users
CREATE POLICY "Users can block others"
ON blocked_users FOR INSERT
TO authenticated
WITH CHECK (blocker_id = auth.uid() AND blocker_id != blocked_id);

-- Users can unblock (delete block records)
CREATE POLICY "Users can unblock"
ON blocked_users FOR DELETE
TO authenticated
USING (blocker_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS FOR APPLICATION LAYER
-- ============================================================================

-- Function: Get unread message count for a user across all conversations
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.conversation_id,
    COUNT(*)::BIGINT as unread_count
  FROM messages m
  INNER JOIN conversations c ON c.id = m.conversation_id
  LEFT JOIN message_read_status mrs ON mrs.conversation_id = m.conversation_id
    AND mrs.user_id = user_uuid
  WHERE
    (c.buyer_id = user_uuid OR c.seller_id = user_uuid)
    AND m.sender_id != user_uuid
    AND m.deleted_at IS NULL
    AND (
      mrs.last_read_message_id IS NULL
      OR m.created_at > (
        SELECT created_at FROM messages WHERE id = mrs.last_read_message_id
      )
    )
  GROUP BY m.conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is blocked from messaging another user
CREATE OR REPLACE FUNCTION is_user_blocked(user1_uuid UUID, user2_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = user1_uuid AND blocked_id = user2_uuid)
    OR (blocker_id = user2_uuid AND blocked_id = user1_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE conversations IS 'Stores conversations between buyers and sellers about specific listings';
COMMENT ON TABLE messages IS 'Individual messages within conversations';
COMMENT ON TABLE message_read_status IS 'Tracks read status for each user in each conversation';
COMMENT ON TABLE blocked_users IS 'Users who have blocked each other from messaging';

COMMENT ON COLUMN conversations.buyer_archived_at IS 'When buyer archived this conversation (null = not archived)';
COMMENT ON COLUMN conversations.seller_archived_at IS 'When seller archived this conversation (null = not archived)';
COMMENT ON COLUMN messages.is_system_message IS 'System-generated messages (e.g., "Listing sold")';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete timestamp for user-deleted messages';
