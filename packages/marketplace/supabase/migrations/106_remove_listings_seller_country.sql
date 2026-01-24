-- ============================================================================
-- Migration: Remove Dead seller_country Column from Listings
-- Purpose: Clean up unused denormalized column
-- Created: 2026-01-24
--
-- Analysis (verified before removal):
-- 1. Column is NOT written during listing creation
--    - app/api/listings/route.ts INSERT does not include seller_country
-- 2. Column is NOT read directly from listings table
--    - All reads go through listings_with_details view or get_cart() function
--    - View uses: pp.country AS seller_country (from user_profiles JOIN)
--    - get_cart() uses: seller.country AS seller_country (from user_profiles JOIN)
-- 3. Column has NO indexes depending on it
-- 4. Column is completely redundant - seller country is always fetched via JOIN
--
-- Safe to remove: This column is dead code.
-- ============================================================================

ALTER TABLE listings DROP COLUMN IF EXISTS seller_country;

-- Verify: After running, confirm no errors in application
-- The listings_with_details view and get_cart() function will continue working
-- as they source seller_country from the user_profiles table via JOIN.
