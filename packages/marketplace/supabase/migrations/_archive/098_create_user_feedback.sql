-- Create user feedback system for collecting feature requests, bug reports, and general feedback
-- Staff can view and manage all submissions via the Staff Dashboard

-- ============================================
-- Create user_feedback table
-- ============================================

CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submission content
  type TEXT NOT NULL CHECK (type IN ('feature_request', 'bug_report', 'other')),
  description TEXT NOT NULL,
  email TEXT,  -- For anonymous users or if they want a different contact

  -- Attachments
  screenshot_url TEXT,  -- Stored in Supabase Storage

  -- Auto-captured context
  page_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  viewport_size TEXT,  -- e.g., "1920x1080"
  locale TEXT,

  -- Staff management
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  internal_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Create indexes
-- ============================================

CREATE INDEX idx_feedback_status ON user_feedback(status);
CREATE INDEX idx_feedback_type ON user_feedback(type);
CREATE INDEX idx_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX idx_feedback_user ON user_feedback(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- Create updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_feedback_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (anon + authenticated)
CREATE POLICY "Anyone can submit feedback"
  ON user_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Staff can view all feedback (uses existing is_staff() function from migration 068)
CREATE POLICY "Staff can view all feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (is_staff());

-- Staff can update feedback
CREATE POLICY "Staff can update feedback"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- ============================================
-- Create feedback-screenshots storage bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS Policies
-- ============================================

-- Anyone can upload feedback screenshots
CREATE POLICY "Anyone can upload feedback screenshots"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback-screenshots');

-- Staff can view feedback screenshots
CREATE POLICY "Staff can view feedback screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND is_staff()
  );

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE user_feedback IS 'User feedback submissions including feature requests, bug reports, and general feedback';
COMMENT ON COLUMN user_feedback.type IS 'Type of feedback: feature_request, bug_report, or other';
COMMENT ON COLUMN user_feedback.status IS 'Workflow status: new, reviewed, in_progress, resolved, or closed';
COMMENT ON COLUMN user_feedback.internal_notes IS 'Staff-only notes not visible to submitters';
COMMENT ON COLUMN user_feedback.reviewed_by IS 'Staff member who reviewed/updated this feedback';
COMMENT ON COLUMN user_feedback.screenshot_url IS 'URL to screenshot in feedback-screenshots bucket';
