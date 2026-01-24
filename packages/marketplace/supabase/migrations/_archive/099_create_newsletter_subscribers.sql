-- Create newsletter subscription system
-- Supports both anonymous and authenticated subscribers with soft-delete unsubscription

-- ============================================
-- Create newsletter_subscribers table
-- ============================================

CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,  -- Soft delete
  source TEXT DEFAULT 'footer' CHECK (source IN ('footer', 'registration', 'settings')),
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'lv')),
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Create indexes
-- ============================================

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_user_id ON newsletter_subscribers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_newsletter_active ON newsletter_subscribers(subscribed_at) WHERE unsubscribed_at IS NULL;
CREATE INDEX idx_newsletter_unsubscribe_token ON newsletter_subscribers(unsubscribe_token);

-- ============================================
-- Create updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_newsletter_subscribers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_newsletter_subscribers_updated_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_subscribers_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe to newsletter (anon + authenticated)
CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own subscription (by user_id or email)
CREATE POLICY "Users can view own subscription"
  ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update their own subscription (by user_id or email)
CREATE POLICY "Users can update own subscription"
  ON newsletter_subscribers FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Service role can do everything (for API routes with service key)
-- Note: Service role bypasses RLS by default

-- ============================================
-- Function to link anonymous subscription to user after registration
-- ============================================

CREATE OR REPLACE FUNCTION link_newsletter_to_user(p_user_id UUID, p_email TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE newsletter_subscribers
  SET user_id = p_user_id, updated_at = NOW()
  WHERE email = LOWER(TRIM(p_email)) AND user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE newsletter_subscribers IS 'Newsletter subscription management with support for anonymous and authenticated subscribers';
COMMENT ON COLUMN newsletter_subscribers.email IS 'Subscriber email address (normalized to lowercase)';
COMMENT ON COLUMN newsletter_subscribers.user_id IS 'Linked user account if subscriber is registered';
COMMENT ON COLUMN newsletter_subscribers.unsubscribed_at IS 'Soft delete timestamp - NULL means actively subscribed';
COMMENT ON COLUMN newsletter_subscribers.source IS 'Where the subscription originated: footer, registration, or settings';
COMMENT ON COLUMN newsletter_subscribers.locale IS 'Preferred language for communications';
COMMENT ON COLUMN newsletter_subscribers.unsubscribe_token IS 'Token for one-click unsubscribe links in emails';
