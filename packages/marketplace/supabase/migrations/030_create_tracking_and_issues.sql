-- Create tracking events and order issues tables
-- For Unisend tracking sync and dispute handling

-- ============================================
-- STEP 1: Create tracking_events table
-- ============================================

-- Synced from Unisend API for T2T shipments
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Event data from Unisend
  event_type VARCHAR(50) NOT NULL,
  state_type VARCHAR(50) NOT NULL, -- LABEL_CREATED, ON_THE_WAY, PARCEL_RECEIVED, PARCEL_DELIVERED, etc.
  state_text VARCHAR(255),
  location VARCHAR(255),
  description TEXT,

  -- When the event occurred (from Unisend)
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

  -- When we synced it
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate events
  UNIQUE(order_id, event_type, event_timestamp)
);

-- ============================================
-- STEP 2: Create order_issues table
-- ============================================

-- Simple issue/dispute tracking with "Report issue" button
CREATE TABLE order_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Who reported the issue
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_role VARCHAR(10) NOT NULL CHECK (reporter_role IN ('buyer', 'seller')),

  -- Issue details
  issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN (
    'not_received', -- Package never arrived
    'damaged', -- Package arrived damaged
    'wrong_item', -- Received wrong item
    'not_as_described', -- Item different from listing
    'shipping_delay', -- Taking too long
    'seller_unresponsive', -- Seller not communicating
    'buyer_unresponsive', -- Buyer not communicating (for sellers)
    'payment_issue', -- Problem with payment
    'other' -- Other issue
  )),

  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}', -- Evidence photos

  -- Resolution
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', -- Just reported
    'investigating', -- Admin looking into it
    'resolved', -- Issue resolved
    'closed' -- Closed without resolution
  )),

  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

CREATE INDEX idx_tracking_events_order ON tracking_events(order_id);
CREATE INDEX idx_tracking_events_timestamp ON tracking_events(event_timestamp DESC);
CREATE INDEX idx_tracking_events_state ON tracking_events(state_type);

CREATE INDEX idx_order_issues_order ON order_issues(order_id);
CREATE INDEX idx_order_issues_reporter ON order_issues(reporter_id);
CREATE INDEX idx_order_issues_status ON order_issues(status) WHERE status = 'open';
CREATE INDEX idx_order_issues_created ON order_issues(created_at DESC);

-- ============================================
-- STEP 4: Enable RLS
-- ============================================

ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_issues ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies for tracking_events
-- ============================================

-- Order participants can view tracking events
CREATE POLICY "Order participants can view tracking"
  ON tracking_events
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- System inserts tracking events (via service role)
-- No direct INSERT policy for users

-- ============================================
-- STEP 6: RLS Policies for order_issues
-- ============================================

-- Order participants can view issues
CREATE POLICY "Order participants can view issues"
  ON order_issues
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Order participants can create issues
CREATE POLICY "Order participants can report issues"
  ON order_issues
  FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND
    order_id IN (
      SELECT id FROM orders WHERE buyer_id = auth.uid() OR seller_id = auth.uid()
    )
  );

-- Reporters can update their own issues (add photos, etc.)
CREATE POLICY "Reporters can update their issues"
  ON order_issues
  FOR UPDATE
  USING (auth.uid() = reporter_id AND status = 'open')
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================
-- STEP 7: Triggers
-- ============================================

-- Update updated_at on issue changes
CREATE OR REPLACE FUNCTION update_order_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_issues_updated_at
  BEFORE UPDATE ON order_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_order_issues_updated_at();

-- Update order status when issue is created
CREATE OR REPLACE FUNCTION mark_order_disputed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only mark as disputed if order is in an active state
  UPDATE orders
  SET status = 'disputed', updated_at = NOW()
  WHERE id = NEW.order_id
    AND status IN ('accepted', 'shipped', 'in_transit', 'delivered');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_order_disputed_on_issue
  AFTER INSERT ON order_issues
  FOR EACH ROW
  EXECUTE FUNCTION mark_order_disputed();

-- ============================================
-- STEP 8: Helper functions
-- ============================================

-- Report an issue on an order
CREATE OR REPLACE FUNCTION report_order_issue(
  p_order_id UUID,
  p_reporter_id UUID,
  p_issue_type VARCHAR(50),
  p_description TEXT,
  p_photo_urls TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_reporter_role VARCHAR(10);
  v_issue_id UUID;
BEGIN
  -- Get order and determine reporter role
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Determine reporter role
  IF v_order.buyer_id = p_reporter_id THEN
    v_reporter_role := 'buyer';
  ELSIF v_order.seller_id = p_reporter_id THEN
    v_reporter_role := 'seller';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Not authorized to report issues on this order');
  END IF;

  -- Check if there's already an open issue from this user
  IF EXISTS (
    SELECT 1 FROM order_issues
    WHERE order_id = p_order_id
      AND reporter_id = p_reporter_id
      AND status = 'open'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You already have an open issue for this order');
  END IF;

  -- Create issue
  INSERT INTO order_issues (
    order_id,
    reporter_id,
    reporter_role,
    issue_type,
    description,
    photo_urls
  ) VALUES (
    p_order_id,
    p_reporter_id,
    v_reporter_role,
    p_issue_type,
    p_description,
    p_photo_urls
  )
  RETURNING id INTO v_issue_id;

  RETURN json_build_object(
    'success', true,
    'issue_id', v_issue_id,
    'order_number', v_order.order_number
  );
END;
$$ LANGUAGE plpgsql;

-- Add tracking event (called by sync job)
CREATE OR REPLACE FUNCTION add_tracking_event(
  p_order_id UUID,
  p_event_type VARCHAR(50),
  p_state_type VARCHAR(50),
  p_state_text VARCHAR(255),
  p_location VARCHAR(255),
  p_description TEXT,
  p_event_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  INSERT INTO tracking_events (
    order_id,
    event_type,
    state_type,
    state_text,
    location,
    description,
    event_timestamp
  ) VALUES (
    p_order_id,
    p_event_type,
    p_state_type,
    p_state_text,
    p_location,
    p_description,
    p_event_timestamp
  )
  ON CONFLICT (order_id, event_type, event_timestamp) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Update order status based on tracking event
  IF v_inserted THEN
    CASE p_state_type
      WHEN 'PARCEL_RECEIVED' THEN
        UPDATE orders SET status = 'shipped', updated_at = NOW()
        WHERE id = p_order_id AND status = 'accepted';
      WHEN 'ON_THE_WAY' THEN
        UPDATE orders SET status = 'in_transit', updated_at = NOW()
        WHERE id = p_order_id AND status IN ('accepted', 'shipped');
      WHEN 'PARCEL_DELIVERED' THEN
        UPDATE orders SET status = 'delivered', updated_at = NOW()
        WHERE id = p_order_id AND status IN ('shipped', 'in_transit');
      ELSE
        -- No status change for other events
        NULL;
    END CASE;
  END IF;

  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql;

-- Get tracking timeline for an order
CREATE OR REPLACE FUNCTION get_order_tracking(p_order_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(json_build_object(
      'event_type', event_type,
      'state_type', state_type,
      'state_text', state_text,
      'location', location,
      'description', description,
      'timestamp', event_timestamp
    ) ORDER BY event_timestamp ASC)
    FROM tracking_events
    WHERE order_id = p_order_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- STEP 9: Comments
-- ============================================

COMMENT ON TABLE tracking_events IS 'Shipping tracking events synced from Unisend for T2T orders';
COMMENT ON TABLE order_issues IS 'User-reported issues/disputes on orders';
COMMENT ON COLUMN tracking_events.state_type IS 'Unisend state type: LABEL_CREATED, ON_THE_WAY, PARCEL_RECEIVED, PARCEL_DELIVERED, etc.';
COMMENT ON COLUMN order_issues.issue_type IS 'Type of issue: not_received, damaged, wrong_item, not_as_described, etc.';
COMMENT ON COLUMN order_issues.status IS 'Issue status: open, investigating, resolved, closed';
COMMENT ON FUNCTION report_order_issue IS 'Report an issue on an order (buyer or seller)';
COMMENT ON FUNCTION add_tracking_event IS 'Add tracking event from Unisend sync, updates order status';
COMMENT ON FUNCTION get_order_tracking IS 'Get tracking timeline for an order';
