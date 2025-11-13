-- Fix RLS policy for conversations to support wanted listings
-- Run this in your Supabase SQL Editor

-- Drop the old policy
DROP POLICY IF EXISTS "Buyers can create conversations" ON conversations;

-- Create new policy that handles both cases:
-- 1. Regular listings: listing_id NOT NULL, check listing exists and is active
-- 2. Wanted listings: listing_id IS NULL, allow creation
CREATE POLICY "Buyers can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND buyer_id != seller_id
  AND (
    -- For wanted listings: listing_id is null, no listing check needed
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

-- Verify the policy
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'conversations'
  AND policyname = 'Buyers can create conversations';
