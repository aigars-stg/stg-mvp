-- ============================================================================
-- SECOND TURN GAMES - CONSOLIDATED DATABASE SCHEMA
-- ============================================================================
-- This file contains the complete database schema for Second Turn Games,
-- a peer-to-peer board game marketplace for the Baltic region.
--
-- Generated: 2026-01-24
-- Source: Production database (ettbijaifahenypkmsts)
--
-- WARNING: This migration is for DOCUMENTATION and NEW ENVIRONMENT SETUP only.
-- DO NOT apply to existing production database - objects already exist.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- Enable pg_trgm for fuzzy text search (game name autocomplete)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Enable pg_cron for scheduled jobs (cart cleanup, order processing)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net for HTTP calls to Edge Functions from cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions for extensions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- SECTION 2: SEQUENCES
-- ============================================================================

-- Order number sequence for generating ORD-YYYY-NNNNNN format
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- ============================================================================
-- SECTION 3: TABLES
-- ============================================================================

-- ============================================================================
-- TABLE: games
-- PURPOSE: BoardGameGeek game catalog with on-demand metadata caching
-- FEATURES: Fuzzy search, expansion filtering, rating sorting
-- SOURCE: BGG API, cached locally for performance
-- ============================================================================
CREATE TABLE games (
  id INTEGER PRIMARY KEY,                    -- BGG game ID (not auto-generated)
  name TEXT NOT NULL,                        -- Primary game title
  yearpublished INTEGER,                     -- Year of first publication
  is_expansion BOOLEAN DEFAULT FALSE,        -- True if this is an expansion
  thumbnail TEXT,                            -- BGG thumbnail URL
  image TEXT,                                -- BGG full image URL
  alternate_names JSONB,                     -- Array of alternate titles
  versions JSONB,                            -- Array of published versions
  bayesaverage DECIMAL(5,2),                 -- BGG Bayesian average rating
  player_count TEXT,                         -- e.g., "2-4"
  min_age INTEGER,                           -- Minimum recommended age
  playing_time TEXT,                         -- e.g., "60-90"
  description TEXT,                          -- Full game description
  designers JSONB,                           -- Array of designer names
  metadata_fetched_at TIMESTAMP,             -- When metadata was last fetched
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABLE: user_profiles
-- PURPOSE: Core user data, created automatically on auth signup
-- FEATURES: GDPR soft-delete, locale preferences, staff flag
-- RELATIONSHIPS: auth.users (1:1)
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  country TEXT CHECK (country IN ('LV', 'EE', 'LT', 'OTHER')),
  preferred_locale TEXT DEFAULT 'en' CHECK (preferred_locale IN ('en', 'lv')),
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  auth_providers TEXT[] DEFAULT '{}',        -- OAuth providers used (google, etc)
  -- GDPR soft delete support
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT,
  recovery_deadline TIMESTAMPTZ,
  original_email TEXT,                       -- Preserved for account recovery
  -- Onboarding tracking
  seller_terms_accepted_at TIMESTAMPTZ,
  seller_terms_version VARCHAR(10) DEFAULT '1.0',
  profile_banner_dismissed_until TIMESTAMPTZ,
  onboarding_email_step INTEGER DEFAULT 0,   -- 0=welcome, 1=engagement, 2=seller_nudge
  last_onboarding_email_at TIMESTAMPTZ,
  -- 2FA recovery codes
  recovery_codes TEXT[],
  recovery_codes_generated_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: seller_profiles
-- PURPOSE: Seller-specific data separated for performance
-- FEATURES: Stripe Connect integration, DAC7 tax compliance, trust metrics
-- RELATIONSHIPS: user_profiles (1:1)
-- ============================================================================
CREATE TABLE seller_profiles (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (seller_status IN ('not_started', 'onboarding', 'active', 'suspended')),
  seller_terms_accepted_at TIMESTAMPTZ,
  seller_terms_version TEXT DEFAULT '1.0',
  -- Stripe Connect
  stripe_connect_account_id TEXT,
  stripe_connect_onboarding_completed BOOLEAN DEFAULT FALSE,
  stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
  stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE,
  stripe_connect_details_submitted BOOLEAN DEFAULT FALSE,
  stripe_connect_updated_at TIMESTAMPTZ,
  stripe_requirements JSONB DEFAULT '{}',
  stripe_capabilities JSONB DEFAULT '{}',
  -- Bank account info (from Stripe)
  has_bank_account BOOLEAN DEFAULT FALSE,
  bank_account_last4 TEXT,
  bank_account_bank_name TEXT,
  -- Trust metrics (updated by triggers)
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1) DEFAULT 0.0,
  positive_rating_percent INTEGER DEFAULT 100,
  total_completed_sales INTEGER DEFAULT 0,
  member_since TIMESTAMPTZ DEFAULT NOW(),
  -- DAC7 EU tax reporting (30+ transactions OR 2000+ EUR/year)
  dac7_annual_transaction_count INTEGER DEFAULT 0,
  dac7_annual_sales_total DECIMAL(10,2) DEFAULT 0.00,
  dac7_reporting_year INTEGER,
  dac7_tax_id TEXT,
  dac7_tax_id_type TEXT,
  dac7_full_legal_name TEXT,
  dac7_date_of_birth DATE,
  dac7_address_street TEXT,
  dac7_address_city TEXT,
  dac7_address_postal_code TEXT,
  dac7_address_country TEXT,
  dac7_tax_residency_country TEXT,
  dac7_info_submitted_at TIMESTAMPTZ,
  dac7_info_verified BOOLEAN DEFAULT FALSE,
  dac7_compliance_status TEXT DEFAULT 'exempt'
    CHECK (dac7_compliance_status IN ('exempt', 'approaching', 'required', 'compliant', 'blocked')),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: listings
-- PURPOSE: For-sale items posted by sellers
-- FEATURES: Fixed-price and auction pricing, cart reservations, version tracking
-- RELATIONSHIPS: games, user_profiles, wanted_listings
-- ============================================================================
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Game reference
  bgg_game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  game_name TEXT NOT NULL,
  game_year INTEGER,
  -- Version details (from BGG or manual)
  version_source TEXT NOT NULL CHECK (version_source IN ('bgg', 'manual')),
  bgg_version_id INTEGER,
  version_name TEXT,
  publisher TEXT,
  language TEXT,
  edition_year INTEGER,
  -- Photos (array of storage URLs)
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  -- Condition
  condition TEXT NOT NULL CHECK (condition IN ('likeNew', 'veryGood', 'good', 'acceptable')),
  condition_notes TEXT,
  all_components_present BOOLEAN DEFAULT TRUE,
  missing_components TEXT,
  -- Included expansions
  included_expansions JSONB DEFAULT '[]',
  -- Pricing
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  previous_price DECIMAL(10,2),              -- For price drop notifications
  -- Transaction type (2D model: method + format)
  transaction_method TEXT NOT NULL DEFAULT 'contact_seller'
    CHECK (transaction_method IN ('contact_seller', 'instant_buy')),
  pricing_format TEXT NOT NULL DEFAULT 'fixed_price'
    CHECK (pricing_format IN ('fixed_price', 'auction')),
  listing_type TEXT NOT NULL DEFAULT 'instant_buy'
    CHECK (listing_type IN ('instant_buy', 'contact_seller', 'auction')),
  -- Auction fields (required when pricing_format = 'auction')
  auction_start_price DECIMAL(10,2),
  auction_current_bid DECIMAL(10,2),
  auction_bid_count INTEGER DEFAULT 0,
  auction_ends_at TIMESTAMPTZ,
  auction_duration_days INTEGER CHECK (auction_duration_days IN (1, 3, 5, 7)),
  auction_winner_id UUID REFERENCES auth.users(id),
  auction_winner_notified_at TIMESTAMPTZ,
  auction_payment_deadline TIMESTAMPTZ,
  auction_anti_snipe_extended BOOLEAN DEFAULT FALSE,
  -- Shipping options
  shipping_local_pickup BOOLEAN DEFAULT FALSE,
  shipping_parcel_locker BOOLEAN DEFAULT FALSE,
  shipping_notes TEXT,
  -- Seller reference
  seller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_country VARCHAR(2),
  -- Cart reservation (30-minute hold)
  reserved_by UUID REFERENCES auth.users(id),
  reserved_until TIMESTAMPTZ,
  -- Wanted listing link (if created in response to ISO)
  source_wanted_listing_id UUID REFERENCES wanted_listings(id) ON DELETE SET NULL,
  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'removed')),
  sold_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  CONSTRAINT auction_fields_required CHECK (
    pricing_format != 'auction' OR (
      auction_start_price IS NOT NULL AND
      auction_start_price > 0 AND
      auction_ends_at IS NOT NULL AND
      auction_duration_days IN (1, 3, 5, 7)
    )
  )
);

-- ============================================================================
-- TABLE: saved_listings
-- PURPOSE: User wishlist/favorites for listings
-- RELATIONSHIPS: auth.users, listings
-- ============================================================================
CREATE TABLE saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT saved_listings_user_id_listing_id_key UNIQUE (user_id, listing_id)
);

-- ============================================================================
-- TABLE: wanted_listings
-- PURPOSE: ISO (In Search Of) listings where buyers post games they want
-- FEATURES: Budget range, condition preferences, 30-day expiration
-- RELATIONSHIPS: games, user_profiles
-- ============================================================================
CREATE TABLE wanted_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Game reference
  bgg_game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  game_name TEXT NOT NULL,
  game_year INTEGER,
  -- Version preferences (optional)
  version_source TEXT DEFAULT 'bgg',
  bgg_version_id INTEGER,
  version_name TEXT,
  publisher TEXT,
  language TEXT,
  edition_year INTEGER,
  version_thumbnail TEXT,
  version_image TEXT,
  -- Expansion preference
  expansion_preference TEXT DEFAULT 'base_only'
    CHECK (expansion_preference IN ('base_only', 'expansions_welcome')),
  -- Budget
  min_price DECIMAL(10,2) CHECK (min_price IS NULL OR min_price > 0),
  max_price DECIMAL(10,2) NOT NULL CHECK (max_price > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  -- Condition preferences
  acceptable_conditions TEXT[] NOT NULL DEFAULT ARRAY['likeNew', 'veryGood', 'good', 'acceptable'],
  preferred_language TEXT,
  location_preferences TEXT,
  notes TEXT,
  -- Buyer
  buyer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  -- Status and responses
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'fulfilled', 'cancelled')),
  response_count INTEGER NOT NULL DEFAULT 0 CHECK (response_count >= 0 AND response_count <= 10),
  expires_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  CONSTRAINT min_less_than_max CHECK (min_price IS NULL OR min_price < max_price),
  CONSTRAINT valid_conditions CHECK (
    acceptable_conditions <@ ARRAY['likeNew', 'veryGood', 'good', 'acceptable'] AND
    array_length(acceptable_conditions, 1) > 0
  )
);

-- ============================================================================
-- TABLE: wanted_listing_responses
-- PURPOSE: Seller responses to wanted listings (max 10 per listing)
-- RELATIONSHIPS: wanted_listings, user_profiles, conversations
-- ============================================================================
CREATE TABLE wanted_listing_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wanted_listing_id UUID NOT NULL REFERENCES wanted_listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  offered_price DECIMAL(10,2) NOT NULL CHECK (offered_price > 0),
  offered_condition TEXT NOT NULL CHECK (offered_condition IN ('likeNew', 'veryGood', 'good', 'acceptable')),
  response_notes TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_quick_response BOOLEAN DEFAULT FALSE,  -- Within 2 hours
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_seller_response UNIQUE (wanted_listing_id, seller_id)
);

-- ============================================================================
-- TABLE: listing_questions
-- PURPOSE: Public Q&A on listings (threaded, max 2 levels)
-- RELATIONSHIPS: listings, user_profiles
-- ============================================================================
CREATE TABLE listing_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES listing_questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,                    -- Soft delete
  CONSTRAINT content_max_length CHECK (char_length(content) <= 2000),
  CONSTRAINT content_not_empty CHECK (char_length(TRIM(content)) > 0)
);

-- ============================================================================
-- TABLE: bids
-- PURPOSE: Auction bid history with anti-snipe protection
-- RELATIONSHIPS: listings, auth.users
-- ============================================================================
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  is_winning BOOLEAN DEFAULT FALSE,
  triggered_extension BOOLEAN DEFAULT FALSE,
  extension_minutes INTEGER CHECK (extension_minutes IS NULL OR (extension_minutes >= 2 AND extension_minutes <= 5)),
  -- Audit fields
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: notifications
-- PURPOSE: User notification inbox (outbid, auction won, etc)
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'outbid', 'auction_won', 'auction_expired', 'second_chance',
    'payment_reminder', 'auction_ending', 'wanted_match'
  )),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,                       -- NULL = unread
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: conversations
-- PURPOSE: Buyer-seller message threads
-- FEATURES: Per-user archiving, transaction conversations
-- RELATIONSHIPS: listings, user_profiles, orders
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  buyer_archived_at TIMESTAMPTZ,
  seller_archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (buyer_id != seller_id),
  CONSTRAINT unique_conversation UNIQUE NULLS NOT DISTINCT (listing_id, buyer_id, seller_id)
);

-- ============================================================================
-- TABLE: messages
-- PURPOSE: Individual messages in conversations
-- FEATURES: System messages, soft delete, photo attachments
-- RELATIONSHIPS: conversations, user_profiles
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_system_message BOOLEAN DEFAULT FALSE,
  system_message_type VARCHAR(50),
  photo_urls TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ,                    -- Soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_length CHECK (char_length(content) <= 5000),
  CONSTRAINT no_empty_content CHECK (char_length(TRIM(content)) > 0),
  CONSTRAINT messages_sender_or_system CHECK (sender_id IS NOT NULL OR is_system_message = TRUE)
);

-- ============================================================================
-- TABLE: message_read_status
-- PURPOSE: Tracks per-user read position in conversations
-- RELATIONSHIPS: auth.users, conversations, messages
-- ============================================================================
CREATE TABLE message_read_status (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, conversation_id)
);

-- ============================================================================
-- TABLE: blocked_users
-- PURPOSE: User blocking for safety/privacy
-- RELATIONSHIPS: user_profiles
-- ============================================================================
CREATE TABLE blocked_users (
  blocker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- ============================================================================
-- TABLE: login_activity
-- PURPOSE: Authentication audit trail for security
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: security_audit_log
-- PURPOSE: Security events for PCI DSS compliance (1-year retention)
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,                  -- login, logout, failed_login, etc
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TABLE: baskets
-- PURPOSE: Shopping cart grouped by seller (multi-seller support)
-- FEATURES: One basket per buyer-seller pair
-- RELATIONSHIPS: auth.users
-- ============================================================================
-- ARCHITECTURE NOTE: baskets and basket_items tables
-- These tables are accessed ONLY via RPC functions:
--   - get_cart(buyer_id) - Retrieve cart contents
--   - add_to_cart(buyer_id, listing_id) - Add item with 30-min reservation
--   - remove_from_cart(buyer_id, listing_id) - Remove item and release reservation
-- Direct table access via .from('baskets') or .from('basket_items') is NOT exposed.
-- This ensures:
--   1. Atomic operations for cart modifications
--   2. Proper listing reservation handling
--   3. Race condition prevention via SELECT FOR UPDATE
--   4. Consistent cart state management
-- DO NOT add direct table queries in application code.
-- ============================================================================
CREATE TABLE baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT baskets_buyer_id_seller_id_key UNIQUE (buyer_id, seller_id),
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- ============================================================================
-- TABLE: basket_items
-- PURPOSE: Items in cart with 30-minute reservations
-- RELATIONSHIPS: baskets, listings
-- ============================================================================
CREATE TABLE basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price_at_add DECIMAL(10,2) NOT NULL,
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT basket_items_listing_id_key UNIQUE (listing_id)
);

-- ============================================================================
-- TABLE: orders
-- PURPOSE: Completed purchases with full lifecycle tracking
-- FEATURES: Stripe payments, Unisend shipping, seller deadlines
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) NOT NULL UNIQUE,  -- ORD-YYYY-NNNNNN
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- Shipping method
  shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('t2t', 'local_pickup')),
  -- Terminal-to-terminal (Unisend) shipping
  destination_country VARCHAR(2),
  destination_terminal_id VARCHAR(20),
  destination_terminal_name VARCHAR(255),
  destination_terminal_address TEXT,
  sender_country VARCHAR(2),
  -- Local pickup
  pickup_city TEXT,
  pickup_notes TEXT,
  -- Receiver info
  receiver_name VARCHAR(255),
  receiver_phone VARCHAR(20),
  receiver_email VARCHAR(255),
  -- Pricing (6% + EUR 0.50 service fee)
  items_total DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'lv')),
  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  stripe_transfer_amount DECIMAL(10,2),
  paid_at TIMESTAMPTZ,
  transferred_to_seller_at TIMESTAMPTZ,
  payout_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed', 'on_hold')),
  -- Seller response (24-hour deadline)
  seller_response_deadline TIMESTAMPTZ,
  seller_responded_at TIMESTAMPTZ,
  seller_decline_reason TEXT,
  parcel_size VARCHAR(2) CHECK (parcel_size IN ('XS', 'S', 'M', 'L')),
  -- Unisend parcel
  unisend_parcel_id BIGINT,
  unisend_request_id VARCHAR(255),
  barcode VARCHAR(50),
  tracking_url TEXT,
  label_url TEXT,
  label_generated_at TIMESTAMPTZ,
  label_error TEXT,
  -- Status lifecycle
  status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'pending_seller', 'accepted', 'shipped',
      'in_transit', 'delivered', 'completed', 'cancelled', 'disputed'
    )),
  -- Cancellation/refund
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id),
  CONSTRAINT total_amount_valid CHECK (total_amount = items_total + shipping_cost + service_fee),
  CONSTRAINT t2t_has_shipping_info CHECK (
    shipping_method != 't2t' OR (
      destination_country IS NOT NULL AND
      destination_terminal_id IS NOT NULL AND
      receiver_name IS NOT NULL AND
      receiver_phone IS NOT NULL
    )
  ),
  CONSTRAINT local_pickup_has_city CHECK (
    shipping_method != 'local_pickup' OR pickup_city IS NOT NULL
  )
);

-- ============================================================================
-- TABLE: order_items
-- PURPOSE: Snapshot of purchased listings (preserves data if listing deleted)
-- RELATIONSHIPS: orders, listings
-- ============================================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  game_name TEXT NOT NULL,
  bgg_game_id INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  condition TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: order_issues
-- PURPOSE: Dispute/issue tracking for buyer protection
-- RELATIONSHIPS: orders, auth.users
-- ============================================================================
CREATE TABLE order_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_role VARCHAR(10) NOT NULL CHECK (reporter_role IN ('buyer', 'seller')),
  issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN (
    'not_received', 'damaged', 'wrong_item', 'not_as_described',
    'shipping_delay', 'seller_unresponsive', 'buyer_unresponsive',
    'payment_issue', 'other'
  )),
  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: tracking_events
-- PURPOSE: Unisend parcel tracking events
-- RELATIONSHIPS: orders
-- ============================================================================
CREATE TABLE tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  state_type VARCHAR(50) NOT NULL,
  state_text VARCHAR(255),
  location VARCHAR(255),
  description TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tracking_events_order_id_event_type_event_timestamp_key
    UNIQUE (order_id, event_type, event_timestamp)
);

-- ============================================================================
-- TABLE: payout_transactions
-- PURPOSE: Platform-to-seller Stripe transfers
-- RELATIONSHIPS: orders, auth.users
-- ============================================================================
CREATE TABLE payout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_transfer_id VARCHAR(255),
  stripe_connect_account_id VARCHAR(255) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reversed')),
  error_code VARCHAR(100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: seller_payouts
-- PURPOSE: Seller bank withdrawals (from Stripe to bank account)
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_payout_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_connect_account_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'eur',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  bank_account_last4 VARCHAR(4),
  bank_name VARCHAR(100),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  arrival_date DATE,
  paid_at TIMESTAMPTZ,
  failure_code VARCHAR(100),
  failure_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: seller_reviews
-- PURPOSE: Buyer reviews of sellers (1-5 stars, one per order)
-- FEATURES: Seller response, trust metric updates
-- RELATIONSHIPS: orders, auth.users
-- ============================================================================
CREATE TABLE seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT CHECK (char_length(review_text) <= 500),
  seller_response TEXT CHECK (char_length(seller_response) <= 500),
  seller_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_order_review UNIQUE (order_id),
  CONSTRAINT buyer_not_seller CHECK (buyer_id != seller_id)
);

-- ============================================================================
-- TABLE: external_pricing_cache
-- PURPOSE: External price comparison data (e.g., from BGG marketplace)
-- RELATIONSHIPS: games
-- ============================================================================
CREATE TABLE external_pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bgg_game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour 5 minutes',
  raw_response JSONB NOT NULL,
  lowest_price DECIMAL(10,2),
  lowest_price_url TEXT,
  offer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_bgg_game_cache UNIQUE (bgg_game_id)
);

-- ============================================================================
-- TABLE: user_feedback
-- PURPOSE: User bug reports and feature requests
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('feature_request', 'bug_report', 'other')),
  description TEXT NOT NULL,
  email TEXT,
  screenshot_url TEXT,
  page_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  viewport_size TEXT,
  locale TEXT,
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  internal_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: newsletter_subscribers
-- PURPOSE: Email newsletter signups with double opt-in support
-- RELATIONSHIPS: auth.users
-- ============================================================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,               -- Soft unsubscribe
  source TEXT DEFAULT 'footer' CHECK (source IN ('footer', 'registration', 'settings')),
  locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'lv')),
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: INDEXES
-- ============================================================================

-- Games indexes
CREATE INDEX idx_games_name_lower ON games (lower(name));
CREATE INDEX idx_games_name_trgm ON games USING gin (name gin_trgm_ops);
CREATE INDEX idx_games_base_games ON games (id) WHERE is_expansion = FALSE;
CREATE INDEX idx_games_year ON games (yearpublished DESC);
CREATE INDEX idx_games_id ON games (id);

-- User profiles indexes
CREATE INDEX idx_user_profiles_email ON user_profiles (email);
CREATE INDEX idx_user_profiles_deleted_at ON user_profiles (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_recovery ON user_profiles (recovery_deadline) WHERE recovery_deadline IS NOT NULL;
CREATE INDEX idx_user_profiles_is_staff ON user_profiles (is_staff) WHERE is_staff = TRUE;
CREATE INDEX idx_user_profiles_auth_providers ON user_profiles USING gin (auth_providers);
CREATE INDEX idx_user_profiles_preferred_locale ON user_profiles (preferred_locale);
CREATE INDEX idx_user_profiles_onboarding_email ON user_profiles (onboarding_email_step, last_onboarding_email_at) WHERE deleted_at IS NULL;

-- Seller profiles indexes
CREATE INDEX idx_seller_profiles_status ON seller_profiles (seller_status);
CREATE INDEX idx_seller_profiles_stripe_account ON seller_profiles (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
CREATE INDEX idx_seller_profiles_dac7_year ON seller_profiles (dac7_reporting_year) WHERE dac7_reporting_year IS NOT NULL;
CREATE INDEX idx_seller_profiles_dac7_status ON seller_profiles (dac7_compliance_status) WHERE dac7_compliance_status != 'exempt';
CREATE INDEX idx_seller_profiles_dac7_needs_info ON seller_profiles (dac7_compliance_status) WHERE dac7_compliance_status IN ('approaching', 'required', 'blocked');

-- Listings indexes
CREATE INDEX idx_listings_bgg_game_id ON listings (bgg_game_id);
CREATE INDEX idx_listings_seller_id ON listings (seller_id);
CREATE INDEX idx_listings_status_active ON listings (status) WHERE status = 'active';
CREATE INDEX idx_listings_created_at_desc ON listings (created_at DESC);
CREATE INDEX idx_listings_seller_active ON listings (seller_id, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_listings_reserved_by ON listings (reserved_by) WHERE reserved_by IS NOT NULL;
CREATE INDEX idx_listings_type ON listings (listing_type);
CREATE INDEX idx_listings_status_type ON listings (status, listing_type);
CREATE INDEX idx_listings_transaction_method ON listings (transaction_method);
CREATE INDEX idx_listings_pricing_format ON listings (pricing_format);
CREATE INDEX idx_listings_transaction_pricing ON listings (transaction_method, pricing_format);
CREATE INDEX idx_listings_has_expansions ON listings ((jsonb_array_length(included_expansions) > 0)) WHERE jsonb_array_length(included_expansions) > 0;
CREATE INDEX idx_listings_auction_ends_at ON listings (auction_ends_at) WHERE pricing_format = 'auction' AND status = 'active';
CREATE INDEX idx_listings_auction_winner ON listings (auction_winner_id) WHERE auction_winner_id IS NOT NULL;
CREATE INDEX idx_listings_auction_payment_deadline ON listings (auction_payment_deadline) WHERE auction_payment_deadline IS NOT NULL AND status = 'active';
CREATE INDEX idx_listings_source_wanted ON listings (source_wanted_listing_id) WHERE source_wanted_listing_id IS NOT NULL;

-- Saved listings indexes
CREATE INDEX idx_saved_listings_user_id ON saved_listings (user_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings (listing_id);

-- Wanted listings indexes
CREATE INDEX idx_wanted_listings_game ON wanted_listings (bgg_game_id);
CREATE INDEX idx_wanted_listings_buyer ON wanted_listings (buyer_id);
CREATE INDEX idx_wanted_listings_status ON wanted_listings (status) WHERE status = 'active';
CREATE INDEX idx_wanted_listings_created_at ON wanted_listings (created_at DESC);
CREATE INDEX idx_wanted_listings_expires_at ON wanted_listings (expires_at) WHERE status = 'active';
CREATE INDEX idx_wanted_listings_expansion_preference ON wanted_listings (expansion_preference) WHERE status = 'active';
CREATE INDEX idx_wanted_active_recent ON wanted_listings (status, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_wanted_expiring ON wanted_listings (expires_at, status) WHERE status = 'active';

-- Wanted listing responses indexes
CREATE INDEX idx_responses_wanted_listing ON wanted_listing_responses (wanted_listing_id, responded_at DESC);
CREATE INDEX idx_responses_seller ON wanted_listing_responses (seller_id);
CREATE INDEX idx_responses_conversation ON wanted_listing_responses (conversation_id);
CREATE INDEX idx_responses_quick ON wanted_listing_responses (is_quick_response) WHERE is_quick_response = TRUE;

-- Listing questions indexes
CREATE INDEX idx_listing_questions_listing ON listing_questions (listing_id, created_at DESC);
CREATE INDEX idx_listing_questions_user ON listing_questions (user_id, created_at DESC);
CREATE INDEX idx_listing_questions_parent ON listing_questions (parent_id) WHERE parent_id IS NOT NULL;

-- Bids indexes
CREATE INDEX idx_bids_listing ON bids (listing_id, created_at DESC);
CREATE INDEX idx_bids_bidder ON bids (bidder_id, created_at DESC);
CREATE INDEX idx_bids_winning ON bids (listing_id) WHERE is_winning = TRUE;
CREATE INDEX idx_bids_amount ON bids (listing_id, amount DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications (type);

-- Conversations indexes
CREATE INDEX idx_conversations_buyer ON conversations (buyer_id, last_message_at DESC);
CREATE INDEX idx_conversations_seller ON conversations (seller_id, last_message_at DESC);
CREATE INDEX idx_conversations_listing ON conversations (listing_id);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);
CREATE INDEX idx_conversations_order_id ON conversations (order_id);
CREATE UNIQUE INDEX idx_conversations_order_unique ON conversations (order_id) WHERE order_id IS NOT NULL;

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);
CREATE INDEX idx_messages_created_at ON messages (created_at DESC);

-- Message read status indexes
CREATE INDEX idx_read_status_user ON message_read_status (user_id);
CREATE INDEX idx_read_status_conversation ON message_read_status (conversation_id);
CREATE INDEX idx_message_read_status_last_read_message ON message_read_status (last_read_message_id) WHERE last_read_message_id IS NOT NULL;

-- Blocked users indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users (blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users (blocked_id);

-- Login activity indexes
CREATE INDEX idx_login_activity_user_id ON login_activity (user_id);
CREATE INDEX idx_login_activity_created_at ON login_activity (created_at DESC);

-- Security audit log indexes
CREATE INDEX idx_security_audit_log_user_id ON security_audit_log (user_id);
CREATE INDEX idx_security_audit_log_event_type ON security_audit_log (event_type);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log (created_at DESC);
CREATE INDEX idx_security_audit_log_user_time ON security_audit_log (user_id, created_at DESC);

-- Baskets indexes
CREATE INDEX idx_baskets_buyer ON baskets (buyer_id);
CREATE INDEX idx_baskets_seller ON baskets (seller_id);

-- Basket items indexes
CREATE INDEX idx_basket_items_basket ON basket_items (basket_id);
CREATE INDEX idx_basket_items_listing ON basket_items (listing_id);
CREATE INDEX idx_basket_items_expires ON basket_items (expires_at);

-- Orders indexes
CREATE INDEX idx_orders_buyer ON orders (buyer_id);
CREATE INDEX idx_orders_seller ON orders (seller_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_seller_status ON orders (seller_id, status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);
CREATE INDEX idx_orders_order_number ON orders (order_number);
CREATE INDEX idx_orders_barcode ON orders (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_orders_seller_deadline ON orders (seller_response_deadline) WHERE status = 'pending_seller';
CREATE INDEX idx_orders_payout_status ON orders (payout_status) WHERE payout_status = 'pending';
CREATE INDEX idx_orders_stripe_transfer ON orders (stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;
CREATE INDEX idx_orders_cancelled_by ON orders (cancelled_by) WHERE cancelled_by IS NOT NULL;
CREATE INDEX idx_orders_locale ON orders (locale);

-- Order items indexes
CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_listing ON order_items (listing_id);

-- Order issues indexes
CREATE INDEX idx_order_issues_order ON order_issues (order_id);
CREATE INDEX idx_order_issues_reporter ON order_issues (reporter_id);
CREATE INDEX idx_order_issues_status ON order_issues (status) WHERE status = 'open';
CREATE INDEX idx_order_issues_created ON order_issues (created_at DESC);
CREATE INDEX idx_order_issues_resolved_by ON order_issues (resolved_by) WHERE resolved_by IS NOT NULL;

-- Tracking events indexes
CREATE INDEX idx_tracking_events_order ON tracking_events (order_id);
CREATE INDEX idx_tracking_events_state ON tracking_events (state_type);
CREATE INDEX idx_tracking_events_timestamp ON tracking_events (event_timestamp DESC);

-- Payout transactions indexes
CREATE INDEX idx_payout_transactions_order ON payout_transactions (order_id);
CREATE INDEX idx_payout_transactions_seller ON payout_transactions (seller_id);
CREATE INDEX idx_payout_transactions_seller_status ON payout_transactions (seller_id, status);
CREATE INDEX idx_payout_transactions_status ON payout_transactions (status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_payout_transactions_created ON payout_transactions (created_at DESC);

-- Seller payouts indexes
CREATE INDEX idx_seller_payouts_user_id ON seller_payouts (user_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts (status) WHERE status IN ('pending', 'in_transit');
CREATE INDEX idx_seller_payouts_created ON seller_payouts (created_at DESC);

-- Seller reviews indexes
CREATE INDEX idx_seller_reviews_seller ON seller_reviews (seller_id, created_at DESC);
CREATE INDEX idx_seller_reviews_buyer ON seller_reviews (buyer_id, created_at DESC);
CREATE INDEX idx_seller_reviews_order ON seller_reviews (order_id);
CREATE INDEX idx_seller_reviews_rating ON seller_reviews (seller_id, rating);

-- External pricing cache indexes
CREATE INDEX idx_external_pricing_bgg_id ON external_pricing_cache (bgg_game_id);
CREATE INDEX idx_external_pricing_expires ON external_pricing_cache (expires_at);

-- User feedback indexes
CREATE INDEX idx_feedback_status ON user_feedback (status);
CREATE INDEX idx_feedback_type ON user_feedback (type);
CREATE INDEX idx_feedback_created ON user_feedback (created_at DESC);
CREATE INDEX idx_feedback_user ON user_feedback (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_user_feedback_reviewed_by ON user_feedback (reviewed_by);

-- Newsletter subscribers indexes
CREATE INDEX idx_newsletter_email ON newsletter_subscribers (email);
CREATE INDEX idx_newsletter_user_id ON newsletter_subscribers (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_newsletter_active ON newsletter_subscribers (subscribed_at) WHERE unsubscribed_at IS NULL;
CREATE INDEX idx_newsletter_unsubscribe_token ON newsletter_subscribers (unsubscribe_token);

-- ============================================================================
-- SECTION 5: VIEWS
-- ============================================================================

-- Public profiles (limited fields for anonymous access)
CREATE OR REPLACE VIEW public_profiles WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, country, created_at
FROM user_profiles;

-- Public seller profiles with trust metrics and badge tier
CREATE OR REPLACE VIEW public_seller_profiles WITH (security_invoker = true) AS
SELECT
  user_id,
  seller_status,
  created_at,
  total_reviews,
  average_rating,
  positive_rating_percent,
  total_completed_sales,
  member_since,
  CASE
    WHEN total_completed_sales >= 25 AND average_rating >= 4.8 THEN 'top_seller'
    WHEN total_completed_sales >= 5 AND average_rating >= 4.5 THEN 'trusted_seller'
    ELSE 'new_seller'
  END AS badge_tier
FROM seller_profiles
WHERE seller_status = 'active';

-- Backward-compatible joined view of user_profiles + seller_profiles
CREATE OR REPLACE VIEW user_profiles_full WITH (security_invoker = true) AS
SELECT
  u.id,
  u.full_name,
  u.email,
  u.phone,
  u.avatar_url,
  u.country,
  u.created_at,
  u.updated_at,
  u.deleted_at,
  u.deletion_reason,
  u.recovery_deadline,
  u.original_email,
  u.is_staff,
  COALESCE(s.seller_status, 'not_started') AS seller_status,
  s.seller_terms_accepted_at,
  COALESCE(s.seller_terms_version, '1.0') AS seller_terms_version,
  s.stripe_connect_account_id,
  COALESCE(s.stripe_connect_onboarding_completed, FALSE) AS stripe_connect_onboarding_completed,
  COALESCE(s.stripe_connect_charges_enabled, FALSE) AS stripe_connect_charges_enabled,
  COALESCE(s.stripe_connect_payouts_enabled, FALSE) AS stripe_connect_payouts_enabled,
  COALESCE(s.stripe_connect_details_submitted, FALSE) AS stripe_connect_details_submitted,
  s.stripe_connect_updated_at,
  COALESCE(s.stripe_requirements, '{}') AS stripe_requirements,
  COALESCE(s.stripe_capabilities, '{}') AS stripe_capabilities,
  COALESCE(s.dac7_annual_transaction_count, 0) AS dac7_annual_transaction_count,
  COALESCE(s.dac7_annual_sales_total, 0.00) AS dac7_annual_sales_total,
  s.dac7_reporting_year,
  s.dac7_tax_id,
  s.dac7_tax_id_type,
  COALESCE(s.has_bank_account, FALSE) AS has_bank_account,
  s.bank_account_last4,
  s.bank_account_bank_name
FROM user_profiles u
LEFT JOIN seller_profiles s ON u.id = s.user_id;

-- Denormalized listing view with game and seller data
CREATE OR REPLACE VIEW listings_with_details WITH (security_invoker = true) AS
SELECT
  l.id,
  l.bgg_game_id,
  l.game_name,
  l.game_year,
  l.version_source,
  l.bgg_version_id,
  l.version_name,
  l.publisher,
  l.language,
  l.edition_year,
  l.photo_urls,
  l.condition,
  l.condition_notes,
  l.all_components_present,
  l.missing_components,
  l.price,
  l.previous_price,
  l.shipping_local_pickup,
  l.shipping_parcel_locker,
  l.shipping_notes,
  l.seller_id,
  l.status,
  l.transaction_method,
  l.pricing_format,
  l.listing_type,
  l.reserved_by,
  l.reserved_until,
  l.included_expansions,
  l.created_at,
  l.updated_at,
  l.auction_start_price,
  l.auction_current_bid,
  l.auction_bid_count,
  l.auction_ends_at,
  l.auction_duration_days,
  l.auction_winner_id,
  l.auction_payment_deadline,
  l.auction_anti_snipe_extended,
  g.thumbnail AS game_thumbnail,
  g.image AS game_image,
  g.player_count AS game_player_count,
  g.min_age AS game_min_age,
  g.playing_time AS game_playing_time,
  g.is_expansion AS game_is_expansion,
  g.versions AS game_versions,
  pp.full_name AS seller_name,
  pp.avatar_url AS seller_avatar_url,
  pp.country AS seller_country,
  COALESCE(psp.total_reviews, 0) AS seller_total_reviews,
  COALESCE(psp.average_rating, 0) AS seller_average_rating,
  COALESCE(psp.positive_rating_percent, 0) AS seller_positive_rating_percent,
  COALESCE(psp.total_completed_sales, 0) AS seller_total_completed_sales,
  psp.member_since AS seller_member_since,
  COALESCE(psp.badge_tier, 'new_seller') AS seller_badge_tier
FROM listings l
LEFT JOIN games g ON l.bgg_game_id = g.id
LEFT JOIN public_profiles pp ON l.seller_id = pp.id
LEFT JOIN public_seller_profiles psp ON l.seller_id = psp.user_id;

-- Listing questions with author info
CREATE OR REPLACE VIEW listing_questions_with_author WITH (security_invoker = true) AS
SELECT
  lq.id,
  lq.listing_id,
  lq.user_id,
  lq.content,
  lq.parent_id,
  lq.created_at,
  lq.updated_at,
  lq.deleted_at,
  up.full_name AS author_name,
  up.avatar_url AS author_avatar,
  lq.user_id = l.seller_id AS is_seller
FROM listing_questions lq
JOIN user_profiles up ON lq.user_id = up.id
JOIN listings l ON lq.listing_id = l.id
WHERE lq.deleted_at IS NULL;

-- Seller reviews with buyer info
CREATE OR REPLACE VIEW seller_reviews_with_buyer WITH (security_invoker = true) AS
SELECT
  sr.id,
  sr.order_id,
  sr.seller_id,
  sr.buyer_id,
  sr.rating,
  sr.review_text,
  sr.seller_response,
  sr.seller_responded_at,
  sr.created_at,
  sr.updated_at,
  up.full_name AS buyer_name,
  up.avatar_url AS buyer_avatar,
  up.country AS buyer_country,
  o.order_number,
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = sr.order_id LIMIT 1) AS game_name
FROM seller_reviews sr
JOIN user_profiles up ON sr.buyer_id = up.id
JOIN orders o ON sr.order_id = o.id;

-- Aggregated seller earnings
CREATE OR REPLACE VIEW seller_earnings_summary WITH (security_invoker = true) AS
SELECT
  seller_id AS user_id,
  COUNT(DISTINCT id) AS total_sales_count,
  COALESCE(SUM(items_total), 0) AS total_gross,
  COALESCE(SUM(service_fee), 0) AS total_platform_fees,
  COALESCE(SUM(items_total), 0) AS total_net,
  COUNT(DISTINCT id) FILTER (WHERE payout_status = 'completed') AS completed_payouts_count,
  COUNT(DISTINCT id) FILTER (WHERE payout_status = 'pending') AS pending_payouts_count,
  COUNT(DISTINCT id) FILTER (WHERE updated_at >= NOW() - INTERVAL '30 days') AS sales_last_30_days,
  COALESCE(SUM(items_total) FILTER (WHERE updated_at >= NOW() - INTERVAL '30 days'), 0) AS earnings_last_30_days
FROM orders o
WHERE status IN ('delivered', 'completed')
GROUP BY seller_id;

-- Unified sales + payouts transaction history
CREATE OR REPLACE VIEW seller_transaction_history WITH (security_invoker = true) AS
SELECT
  o.id,
  o.seller_id AS user_id,
  'sale' AS transaction_type,
  o.order_number AS reference,
  o.status,
  o.payout_status,
  o.items_total AS gross_amount,
  o.service_fee AS platform_fee,
  o.items_total AS net_amount,
  (SELECT oi.game_name FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) AS description,
  o.created_at,
  o.updated_at AS completed_at
FROM orders o
WHERE o.status NOT IN ('pending_payment', 'cancelled')
UNION ALL
SELECT
  sp.id,
  sp.user_id,
  'payout' AS transaction_type,
  sp.stripe_payout_id AS reference,
  sp.status,
  sp.status AS payout_status,
  -sp.amount AS gross_amount,
  0 AS platform_fee,
  -sp.amount AS net_amount,
  CONCAT('Payout to ****', sp.bank_account_last4) AS description,
  sp.created_at,
  sp.paid_at AS completed_at
FROM seller_payouts sp;

-- Grant access to views
GRANT SELECT ON public_profiles TO public, anon, authenticated;
GRANT SELECT ON public_seller_profiles TO public, anon, authenticated;
GRANT SELECT ON listings_with_details TO public, anon, authenticated;
GRANT SELECT ON listing_questions_with_author TO public, anon, authenticated;

-- ============================================================================
-- SECTION 6: FUNCTIONS
-- ============================================================================
-- Note: Function definitions are extracted from production. Full implementations
-- are in the archived migration files for reference.
-- ============================================================================

-- Reusable timestamp updater
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Staff check function
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_staff = TRUE
  );
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, preferred_locale)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_locale', 'en')
  );
  PERFORM link_newsletter_to_user(NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Generate order number (ORD-YYYY-NNNNNN)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  v_year := to_char(NOW(), 'YYYY');
  v_seq := nextval('order_number_seq');
  RETURN 'ORD-' || v_year || '-' || lpad(v_seq::text, 6, '0');
END;
$$;

-- Add item to cart (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION add_to_cart(p_buyer_id UUID, p_listing_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_listing RECORD;
  v_basket_id UUID;
  v_item_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT id, seller_id, price, status, reserved_until INTO v_listing
  FROM listings WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Listing not found');
  END IF;

  IF v_listing.seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot buy your own listing');
  END IF;

  IF v_listing.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Listing is not active');
  END IF;

  IF v_listing.reserved_until IS NOT NULL AND v_listing.reserved_until > NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Listing is already reserved');
  END IF;

  SELECT b.id INTO v_basket_id
  FROM baskets b WHERE b.buyer_id = p_buyer_id AND b.seller_id = v_listing.seller_id;

  IF FOUND AND (SELECT COUNT(*) FROM basket_items WHERE basket_id = v_basket_id) >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'Maximum 10 items per seller');
  END IF;

  v_expires_at := NOW() + INTERVAL '30 minutes';

  INSERT INTO baskets (buyer_id, seller_id)
  VALUES (p_buyer_id, v_listing.seller_id)
  ON CONFLICT (buyer_id, seller_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_basket_id;

  UPDATE listings
  SET reserved_by = p_buyer_id, reserved_until = v_expires_at, updated_at = NOW()
  WHERE id = p_listing_id AND status = 'active' AND (reserved_until IS NULL OR reserved_until < NOW());

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Could not reserve listing');
  END IF;

  INSERT INTO basket_items (basket_id, listing_id, price_at_add, expires_at)
  VALUES (v_basket_id, p_listing_id, v_listing.price, v_expires_at)
  ON CONFLICT (listing_id) DO NOTHING
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    UPDATE listings SET reserved_by = NULL, reserved_until = NULL WHERE id = p_listing_id;
    RETURN json_build_object('success', false, 'error', 'Item already in a cart');
  END IF;

  RETURN json_build_object('success', true, 'basket_id', v_basket_id, 'item_id', v_item_id, 'expires_at', v_expires_at);
END;
$$;

-- Remove item from cart
CREATE OR REPLACE FUNCTION remove_from_cart(p_buyer_id UUID, p_listing_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_basket_id UUID;
BEGIN
  SELECT bi.basket_id INTO v_basket_id
  FROM basket_items bi
  JOIN baskets b ON bi.basket_id = b.id
  WHERE bi.listing_id = p_listing_id AND b.buyer_id = p_buyer_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Item not in cart');
  END IF;

  UPDATE listings SET reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE id = p_listing_id AND reserved_by = p_buyer_id;

  DELETE FROM basket_items WHERE listing_id = p_listing_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Get cart contents
CREATE OR REPLACE FUNCTION get_cart(p_buyer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN (
    SELECT json_agg(basket_data)
    FROM (
      SELECT json_build_object(
        'basket_id', b.id,
        'seller_id', b.seller_id,
        'seller_name', up.full_name,
        'seller_country', up.country,
        'items', (
          SELECT json_agg(json_build_object(
            'item_id', bi.id,
            'listing_id', bi.listing_id,
            'bgg_game_id', l.bgg_game_id,
            'game_name', l.game_name,
            'price', l.price,
            'photo_url', l.photo_urls[1],
            'condition', l.condition,
            'expires_at', bi.expires_at,
            'is_expired', bi.expires_at < NOW()
          ) ORDER BY bi.created_at)
          FROM basket_items bi
          JOIN listings l ON bi.listing_id = l.id
          WHERE bi.basket_id = b.id
        ),
        'item_count', (SELECT COUNT(*) FROM basket_items WHERE basket_id = b.id),
        'subtotal', (
          SELECT SUM(l.price)
          FROM basket_items bi JOIN listings l ON bi.listing_id = l.id
          WHERE bi.basket_id = b.id
        )
      ) AS basket_data
      FROM baskets b
      JOIN user_profiles up ON b.seller_id = up.id
      WHERE b.buyer_id = p_buyer_id
      ORDER BY b.updated_at DESC
    ) AS baskets_query
  );
END;
$$;

-- Cleanup expired cart items (cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_cart_items()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cleaned INTEGER := 0;
  v_expired_item RECORD;
BEGIN
  FOR v_expired_item IN
    SELECT bi.id, bi.listing_id FROM basket_items bi WHERE bi.expires_at < NOW()
  LOOP
    UPDATE listings SET reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
    WHERE id = v_expired_item.listing_id;
    DELETE FROM basket_items WHERE id = v_expired_item.id;
    v_cleaned := v_cleaned + 1;
  END LOOP;
  RETURN v_cleaned;
END;
$$;

-- Create order from basket (post-payment)
CREATE OR REPLACE FUNCTION create_order_from_basket(
  p_basket_id UUID,
  p_shipping_method VARCHAR,
  p_destination_country VARCHAR DEFAULT NULL,
  p_destination_terminal_id VARCHAR DEFAULT NULL,
  p_destination_terminal_name VARCHAR DEFAULT NULL,
  p_destination_terminal_address TEXT DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_pickup_notes TEXT DEFAULT NULL,
  p_receiver_name VARCHAR DEFAULT NULL,
  p_receiver_phone VARCHAR DEFAULT NULL,
  p_receiver_email VARCHAR DEFAULT NULL,
  p_shipping_cost DECIMAL DEFAULT 0,
  p_service_fee DECIMAL DEFAULT 0,
  p_stripe_payment_intent_id VARCHAR DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_basket RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_items_total DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
  v_seller_country VARCHAR(2);
BEGIN
  SELECT b.*, up.country as seller_country INTO v_basket
  FROM baskets b JOIN user_profiles up ON b.seller_id = up.id
  WHERE b.id = p_basket_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Basket not found');
  END IF;

  v_seller_country := v_basket.seller_country;

  SELECT COALESCE(SUM(l.price), 0) INTO v_items_total
  FROM basket_items bi JOIN listings l ON bi.listing_id = l.id
  WHERE bi.basket_id = p_basket_id;

  IF v_items_total = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Basket is empty');
  END IF;

  v_total_amount := v_items_total + p_shipping_cost + p_service_fee;
  v_order_number := generate_order_number();

  INSERT INTO orders (
    order_number, buyer_id, seller_id, shipping_method,
    destination_country, destination_terminal_id, destination_terminal_name, destination_terminal_address,
    sender_country, pickup_city, pickup_notes,
    receiver_name, receiver_phone, receiver_email,
    items_total, shipping_cost, service_fee, total_amount,
    stripe_payment_intent_id, paid_at, seller_response_deadline, status
  ) VALUES (
    v_order_number, v_basket.buyer_id, v_basket.seller_id, p_shipping_method,
    p_destination_country, p_destination_terminal_id, p_destination_terminal_name, p_destination_terminal_address,
    v_seller_country, p_pickup_city, p_pickup_notes,
    p_receiver_name, p_receiver_phone, p_receiver_email,
    v_items_total, p_shipping_cost, p_service_fee, v_total_amount,
    p_stripe_payment_intent_id, NOW(), NOW() + INTERVAL '24 hours', 'pending_seller'
  ) RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, listing_id, game_name, bgg_game_id, price, condition, photo_url)
  SELECT v_order_id, l.id, l.game_name, l.bgg_game_id, l.price, l.condition, l.photo_urls[1]
  FROM basket_items bi JOIN listings l ON bi.listing_id = l.id
  WHERE bi.basket_id = p_basket_id;

  UPDATE listings SET status = 'sold', sold_at = NOW(), reserved_by = NULL, reserved_until = NULL, updated_at = NOW()
  WHERE id IN (SELECT listing_id FROM basket_items WHERE basket_id = p_basket_id);

  DELETE FROM baskets WHERE id = p_basket_id;

  RETURN json_build_object('success', true, 'order_id', v_order_id, 'order_number', v_order_number, 'total_amount', v_total_amount);
END;
$$;

-- Complete delivered orders after 3-day inspection period
CREATE OR REPLACE FUNCTION complete_delivered_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE orders
  SET status = 'completed', updated_at = NOW()
  WHERE status = 'delivered'
    AND updated_at < NOW() - INTERVAL '3 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Expire wanted listings
CREATE OR REPLACE FUNCTION expire_wanted_listings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE wanted_listings
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Create notification helper
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification TO authenticated, service_role;

-- Get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM conversations c
  WHERE (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.conversation_id = c.id
        AND m.created_at > COALESCE(
          (SELECT last_read_at FROM message_read_status
           WHERE user_id = auth.uid() AND conversation_id = c.id),
          '1970-01-01'
        )
        AND m.sender_id != auth.uid()
    );
  RETURN v_count;
END;
$$;

-- Check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_user_id UUID, p_other_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = p_user_id AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = p_user_id)
  );
END;
$$;

-- Update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE conversations SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Update listing status timestamps
CREATE OR REPLACE FUNCTION update_listing_status_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
    NEW.sold_at := NOW();
  END IF;
  IF NEW.status = 'removed' AND OLD.status != 'removed' THEN
    NEW.removed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Update listings updated_at
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Delete empty basket after last item removed
CREATE OR REPLACE FUNCTION delete_empty_basket()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  DELETE FROM baskets
  WHERE id = OLD.basket_id
    AND NOT EXISTS (SELECT 1 FROM basket_items WHERE basket_id = OLD.basket_id);
  RETURN OLD;
END;
$$;

-- Update basket timestamp
CREATE OR REPLACE FUNCTION update_basket_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE baskets SET updated_at = NOW()
  WHERE id = COALESCE(NEW.basket_id, OLD.basket_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Check question depth (max 2 levels)
CREATE OR REPLACE FUNCTION check_question_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM listing_questions WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Cannot reply to a reply - maximum nesting depth is 2';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Get listing question count
CREATE OR REPLACE FUNCTION get_listing_question_count(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM listing_questions WHERE listing_id = p_listing_id AND parent_id IS NULL AND deleted_at IS NULL);
END;
$$;

-- Check if can respond to wanted listing
CREATE OR REPLACE FUNCTION can_respond_to_wanted_listing(p_wanted_listing_id UUID, p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM wanted_listings
    WHERE id = p_wanted_listing_id
      AND status = 'active'
      AND buyer_id != p_seller_id
      AND response_count < 10
      AND NOT EXISTS (
        SELECT 1 FROM wanted_listing_responses
        WHERE wanted_listing_id = p_wanted_listing_id AND seller_id = p_seller_id
      )
  );
END;
$$;

-- Increment/decrement response count triggers
CREATE OR REPLACE FUNCTION increment_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE wanted_listings SET response_count = response_count + 1 WHERE id = NEW.wanted_listing_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_response_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE wanted_listings SET response_count = GREATEST(0, response_count - 1) WHERE id = OLD.wanted_listing_id;
  RETURN OLD;
END;
$$;

-- Update seller DAC7 metrics on order completion
CREATE OR REPLACE FUNCTION update_seller_dac7_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_current_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  IF NEW.status IN ('delivered', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('delivered', 'completed')) THEN
    INSERT INTO seller_profiles (user_id, dac7_annual_transaction_count, dac7_annual_sales_total, dac7_reporting_year)
    VALUES (NEW.seller_id, 1, NEW.items_total, v_current_year)
    ON CONFLICT (user_id) DO UPDATE SET
      dac7_annual_transaction_count = CASE
        WHEN seller_profiles.dac7_reporting_year != v_current_year THEN 1
        ELSE seller_profiles.dac7_annual_transaction_count + 1
      END,
      dac7_annual_sales_total = CASE
        WHEN seller_profiles.dac7_reporting_year != v_current_year THEN NEW.items_total
        ELSE seller_profiles.dac7_annual_sales_total + NEW.items_total
      END,
      dac7_reporting_year = v_current_year,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Update DAC7 compliance status
CREATE OR REPLACE FUNCTION update_dac7_compliance_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.dac7_info_submitted_at IS NOT NULL THEN
    NEW.dac7_compliance_status := 'compliant';
  ELSIF NEW.dac7_annual_transaction_count >= 30 OR NEW.dac7_annual_sales_total >= 2000 THEN
    NEW.dac7_compliance_status := 'required';
  ELSIF NEW.dac7_annual_transaction_count >= 24 OR NEW.dac7_annual_sales_total >= 1600 THEN
    NEW.dac7_compliance_status := 'approaching';
  ELSE
    NEW.dac7_compliance_status := 'exempt';
  END IF;
  RETURN NEW;
END;
$$;

-- Update seller review stats
CREATE OR REPLACE FUNCTION update_seller_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_seller_id UUID;
  v_total INTEGER;
  v_avg DECIMAL(2,1);
  v_positive_pct INTEGER;
BEGIN
  v_seller_id := COALESCE(NEW.seller_id, OLD.seller_id);

  SELECT COUNT(*), ROUND(AVG(rating), 1), ROUND(100.0 * COUNT(*) FILTER (WHERE rating >= 4) / NULLIF(COUNT(*), 0))
  INTO v_total, v_avg, v_positive_pct
  FROM seller_reviews WHERE seller_id = v_seller_id;

  UPDATE seller_profiles SET
    total_reviews = COALESCE(v_total, 0),
    average_rating = COALESCE(v_avg, 0),
    positive_rating_percent = COALESCE(v_positive_pct, 100),
    updated_at = NOW()
  WHERE user_id = v_seller_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update seller completed sales count
CREATE OR REPLACE FUNCTION update_seller_completed_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE seller_profiles SET
      total_completed_sales = total_completed_sales + 1,
      updated_at = NOW()
    WHERE user_id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Mark order disputed on issue creation
CREATE OR REPLACE FUNCTION mark_order_disputed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE orders SET status = 'disputed', updated_at = NOW()
  WHERE id = NEW.order_id AND status NOT IN ('cancelled', 'completed');
  RETURN NEW;
END;
$$;

-- Cleanup old security audit logs (1-year retention)
CREATE OR REPLACE FUNCTION cleanup_old_security_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM security_audit_log WHERE created_at < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Call Edge Function helper (for cron jobs)
CREATE OR REPLACE FUNCTION call_edge_function(function_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_service_role_key TEXT;
  v_request_id BIGINT;
BEGIN
  SELECT decrypted_secret INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  SELECT net.http_post(
    url := 'https://ettbijaifahenypkmsts.supabase.co/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'Content-Type', 'application/json'
    ),
    body := '{}'
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Link newsletter subscription to user after registration
CREATE OR REPLACE FUNCTION link_newsletter_to_user(p_user_id UUID, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE newsletter_subscribers SET user_id = p_user_id, updated_at = NOW()
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email)) AND user_id IS NULL;
END;
$$;

-- Timestamp update functions for specific tables
CREATE OR REPLACE FUNCTION update_listing_question_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_newsletter_subscribers_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_order_issues_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_orders_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_payout_transactions_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_saved_listings_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_seller_payouts_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- Set pricing cache expiry
CREATE OR REPLACE FUNCTION set_pricing_cache_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.expires_at := NOW() + INTERVAL '1 hour 5 minutes';
  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

-- Auth trigger (on auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON seller_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_listings_updated_at();
CREATE TRIGGER update_listing_status_timestamps BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_listing_status_timestamps();
CREATE TRIGGER update_saved_listings_updated_at BEFORE UPDATE ON saved_listings FOR EACH ROW EXECUTE FUNCTION update_saved_listings_updated_at();
CREATE TRIGGER update_wanted_listings_updated_at BEFORE UPDATE ON wanted_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wanted_listing_responses_updated_at BEFORE UPDATE ON wanted_listing_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_listing_questions_updated_at BEFORE UPDATE ON listing_questions FOR EACH ROW EXECUTE FUNCTION update_listing_question_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_read_status_updated_at BEFORE UPDATE ON message_read_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();
CREATE TRIGGER update_order_issues_updated_at BEFORE UPDATE ON order_issues FOR EACH ROW EXECUTE FUNCTION update_order_issues_updated_at();
CREATE TRIGGER update_payout_transactions_updated_at BEFORE UPDATE ON payout_transactions FOR EACH ROW EXECUTE FUNCTION update_payout_transactions_updated_at();
CREATE TRIGGER update_seller_payouts_updated_at BEFORE UPDATE ON seller_payouts FOR EACH ROW EXECUTE FUNCTION update_seller_payouts_updated_at();
CREATE TRIGGER trigger_user_feedback_updated_at BEFORE UPDATE ON user_feedback FOR EACH ROW EXECUTE FUNCTION update_user_feedback_updated_at();
CREATE TRIGGER trigger_newsletter_subscribers_updated_at BEFORE UPDATE ON newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION update_newsletter_subscribers_updated_at();

-- Business logic triggers
CREATE TRIGGER on_new_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
CREATE TRIGGER trigger_check_question_depth BEFORE INSERT ON listing_questions FOR EACH ROW EXECUTE FUNCTION check_question_depth();
CREATE TRIGGER on_new_response_increment_count AFTER INSERT ON wanted_listing_responses FOR EACH ROW EXECUTE FUNCTION increment_response_count();
CREATE TRIGGER on_response_delete_decrement_count AFTER DELETE ON wanted_listing_responses FOR EACH ROW EXECUTE FUNCTION decrement_response_count();
CREATE TRIGGER update_basket_on_item_change AFTER INSERT OR DELETE ON basket_items FOR EACH ROW EXECUTE FUNCTION update_basket_timestamp();
CREATE TRIGGER delete_empty_basket_on_item_remove AFTER DELETE ON basket_items FOR EACH ROW EXECUTE FUNCTION delete_empty_basket();
CREATE TRIGGER track_dac7_metrics_on_order_completion AFTER INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_seller_dac7_metrics();
CREATE TRIGGER trigger_update_seller_completed_sales AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_seller_completed_sales();
CREATE TRIGGER mark_order_disputed_on_issue AFTER INSERT ON order_issues FOR EACH ROW EXECUTE FUNCTION mark_order_disputed();
CREATE TRIGGER trigger_update_seller_review_stats AFTER INSERT OR UPDATE OR DELETE ON seller_reviews FOR EACH ROW EXECUTE FUNCTION update_seller_review_stats();
CREATE TRIGGER trigger_update_dac7_compliance_status BEFORE INSERT OR UPDATE ON seller_profiles FOR EACH ROW EXECUTE FUNCTION update_dac7_compliance_status();
CREATE TRIGGER trigger_set_pricing_cache_expiry BEFORE INSERT OR UPDATE ON external_pricing_cache FOR EACH ROW EXECUTE FUNCTION set_pricing_cache_expiry();

-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wanted_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wanted_listing_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_pricing_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Games: Public read
CREATE POLICY "Games are publicly readable" ON games FOR SELECT TO public USING (TRUE);

-- User profiles
CREATE POLICY "Allow public read of basic profile info" ON user_profiles FOR SELECT TO anon USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can view profiles" ON user_profiles FOR SELECT TO authenticated USING (is_staff() OR id = (SELECT auth.uid()) OR deleted_at IS NULL);
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

-- Seller profiles
CREATE POLICY "Users can view their own seller profile" ON seller_profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own seller profile" ON seller_profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their own seller profile" ON seller_profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Listings
CREATE POLICY "Users can view listings" ON listings FOR SELECT TO public USING (status = 'active' OR (SELECT auth.uid()) = seller_id OR (SELECT auth.uid()) = reserved_by);
CREATE POLICY "Authenticated users can create listings" ON listings FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) = seller_id AND status IN ('draft', 'active'));
CREATE POLICY "Sellers can update their own listings" ON listings FOR UPDATE TO public USING ((SELECT auth.uid()) = seller_id) WITH CHECK ((SELECT auth.uid()) = seller_id);
CREATE POLICY "Sellers can delete their own listings" ON listings FOR DELETE TO public USING ((SELECT auth.uid()) = seller_id);

-- Saved listings
CREATE POLICY "Users can view their own saved listings" ON saved_listings FOR SELECT TO public USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can save listings" ON saved_listings FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update their saved listings" ON saved_listings FOR UPDATE TO public USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their saved listings" ON saved_listings FOR DELETE TO public USING ((SELECT auth.uid()) = user_id);

-- Wanted listings
CREATE POLICY "Users can view wanted listings" ON wanted_listings FOR SELECT TO public USING (status = 'active' OR (SELECT auth.uid()) = buyer_id);
CREATE POLICY "Authenticated users can create wanted listings" ON wanted_listings FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) = buyer_id AND status = 'active' AND expires_at > NOW());
CREATE POLICY "Buyers can update their own wanted listings" ON wanted_listings FOR UPDATE TO public USING ((SELECT auth.uid()) = buyer_id) WITH CHECK ((SELECT auth.uid()) = buyer_id);
CREATE POLICY "Buyers can delete their own wanted listings" ON wanted_listings FOR DELETE TO public USING ((SELECT auth.uid()) = buyer_id);

-- Wanted listing responses
CREATE POLICY "Users can view wanted listing responses" ON wanted_listing_responses FOR SELECT TO public USING ((SELECT auth.uid()) = seller_id OR EXISTS (SELECT 1 FROM wanted_listings WHERE id = wanted_listing_id AND buyer_id = (SELECT auth.uid())));
CREATE POLICY "Authenticated users can create responses" ON wanted_listing_responses FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) = seller_id AND can_respond_to_wanted_listing(wanted_listing_id, seller_id));
CREATE POLICY "Sellers can update their own responses" ON wanted_listing_responses FOR UPDATE TO public USING ((SELECT auth.uid()) = seller_id) WITH CHECK ((SELECT auth.uid()) = seller_id);
CREATE POLICY "Sellers can delete their own responses" ON wanted_listing_responses FOR DELETE TO public USING ((SELECT auth.uid()) = seller_id);

-- Listing questions
CREATE POLICY "Questions are publicly readable" ON listing_questions FOR SELECT TO public USING (deleted_at IS NULL);
CREATE POLICY "Authenticated users can post questions on others' listings" ON listing_questions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_id AND l.status = 'active' AND l.seller_id != (SELECT auth.uid())));
CREATE POLICY "Users can update their own questions" ON listing_questions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete their own questions" ON listing_questions FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Bids
CREATE POLICY "Anon can view bids on active auctions" ON bids FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND listing_type = 'auction' AND status = 'active'));
CREATE POLICY "Authenticated users can view relevant bids" ON bids FOR SELECT TO authenticated USING (bidder_id = (SELECT auth.uid()) OR EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND seller_id = (SELECT auth.uid())));
CREATE POLICY "Authenticated users can place bids" ON bids FOR INSERT TO authenticated WITH CHECK (bidder_id = (SELECT auth.uid()));

-- Notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Authenticated can insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Service role can insert notifications" ON notifications FOR INSERT TO service_role WITH CHECK (TRUE);

-- Conversations
CREATE POLICY "Users can view their own conversations" ON conversations FOR SELECT TO authenticated USING (is_staff() OR (SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id OR (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid())))));
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = buyer_id AND buyer_id != seller_id AND ((order_id IS NOT NULL AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid())))) OR listing_id IS NULL OR EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'active')) AND NOT EXISTS (SELECT 1 FROM blocked_users WHERE (blocker_id = seller_id AND blocked_id = buyer_id) OR (blocker_id = buyer_id AND blocked_id = seller_id)));
CREATE POLICY "Participants can update conversations" ON conversations FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id OR (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid()))))) WITH CHECK ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id OR (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid())))));

-- Messages
CREATE POLICY "Participants can view messages" ON messages FOR SELECT TO authenticated USING (is_staff() OR (deleted_at IS NULL AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.buyer_id = (SELECT auth.uid()) OR c.seller_id = (SELECT auth.uid()) OR (c.order_id IS NOT NULL AND EXISTS (SELECT 1 FROM orders o WHERE o.id = c.order_id AND (o.buyer_id = (SELECT auth.uid()) OR o.seller_id = (SELECT auth.uid()))))))));
CREATE POLICY "Participants can send messages" ON messages FOR INSERT TO authenticated WITH CHECK ((is_system_message = TRUE AND sender_id IS NULL) OR (sender_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.buyer_id = (SELECT auth.uid()) OR c.seller_id = (SELECT auth.uid()) OR (c.order_id IS NOT NULL AND EXISTS (SELECT 1 FROM orders o WHERE o.id = c.order_id AND (o.buyer_id = (SELECT auth.uid()) OR o.seller_id = (SELECT auth.uid())))))) AND NOT EXISTS (SELECT 1 FROM blocked_users bu JOIN conversations c ON c.id = conversation_id WHERE (bu.blocker_id = c.buyer_id AND bu.blocked_id = c.seller_id) OR (bu.blocker_id = c.seller_id AND bu.blocked_id = c.buyer_id)) AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL OR array_length(photo_urls, 1) <= 5)));
CREATE POLICY "Senders can delete their messages" ON messages FOR UPDATE TO authenticated USING (sender_id = (SELECT auth.uid())) WITH CHECK (sender_id = (SELECT auth.uid()) AND deleted_at IS NOT NULL);

-- Message read status
CREATE POLICY "Users can view their own read status" ON message_read_status FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert their own read status" ON message_read_status FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid()))));
CREATE POLICY "Users can update their own read status" ON message_read_status FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Blocked users
CREATE POLICY "Users can view their blocks" ON blocked_users FOR SELECT TO authenticated USING (blocker_id = (SELECT auth.uid()));
CREATE POLICY "Users can block others" ON blocked_users FOR INSERT TO authenticated WITH CHECK (blocker_id = (SELECT auth.uid()) AND blocker_id != blocked_id);
CREATE POLICY "Users can unblock" ON blocked_users FOR DELETE TO authenticated USING (blocker_id = (SELECT auth.uid()));

-- Login activity
CREATE POLICY "Users can view their own login activity" ON login_activity FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert their own login activity" ON login_activity FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete their own login activity" ON login_activity FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Security audit log
CREATE POLICY "Users can read own security events" ON security_audit_log FOR SELECT TO authenticated USING (is_staff() OR (SELECT auth.uid()) = user_id);

-- Baskets
CREATE POLICY "Users can view their baskets" ON baskets FOR SELECT TO public USING ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id);
CREATE POLICY "Buyers can create baskets" ON baskets FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) = buyer_id);
CREATE POLICY "Buyers can delete their baskets" ON baskets FOR DELETE TO public USING ((SELECT auth.uid()) = buyer_id);

-- Basket items
CREATE POLICY "Buyers can view their basket items" ON basket_items FOR SELECT TO public USING (basket_id IN (SELECT id FROM baskets WHERE buyer_id = (SELECT auth.uid())));
CREATE POLICY "Buyers can add basket items" ON basket_items FOR INSERT TO public WITH CHECK (basket_id IN (SELECT id FROM baskets WHERE buyer_id = (SELECT auth.uid())));
CREATE POLICY "Buyers can remove basket items" ON basket_items FOR DELETE TO public USING (basket_id IN (SELECT id FROM baskets WHERE buyer_id = (SELECT auth.uid())));

-- Orders
CREATE POLICY "Users can view their orders" ON orders FOR SELECT TO authenticated USING (is_staff() OR buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid()));
CREATE POLICY "Sellers can respond to orders" ON orders FOR UPDATE TO public USING ((SELECT auth.uid()) = seller_id AND status = 'pending_seller') WITH CHECK ((SELECT auth.uid()) = seller_id);

-- Order items
CREATE POLICY "Order participants can view items" ON order_items FOR SELECT TO public USING (order_id IN (SELECT id FROM orders WHERE buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid())));

-- Order issues
CREATE POLICY "Order participants can view issues" ON order_issues FOR SELECT TO authenticated USING (is_staff() OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = (SELECT auth.uid()) OR o.seller_id = (SELECT auth.uid()))));
CREATE POLICY "Order participants can report issues" ON order_issues FOR INSERT TO public WITH CHECK ((SELECT auth.uid()) = reporter_id AND order_id IN (SELECT id FROM orders WHERE buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid())));
CREATE POLICY "Reporters can update their issues" ON order_issues FOR UPDATE TO authenticated USING (is_staff() OR reporter_id = (SELECT auth.uid())) WITH CHECK (is_staff() OR reporter_id = (SELECT auth.uid()));

-- Tracking events
CREATE POLICY "Order participants can view tracking" ON tracking_events FOR SELECT TO authenticated USING (is_staff() OR EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.buyer_id = (SELECT auth.uid()) OR o.seller_id = (SELECT auth.uid()))));

-- Payout transactions
CREATE POLICY "Sellers can view their payouts" ON payout_transactions FOR SELECT TO public USING ((SELECT auth.uid()) = seller_id);

-- Seller payouts
CREATE POLICY "Users can view own payouts" ON seller_payouts FOR SELECT TO public USING ((SELECT auth.uid()) = user_id);

-- Seller reviews
CREATE POLICY "Reviews are publicly readable" ON seller_reviews FOR SELECT TO public USING (TRUE);
CREATE POLICY "Buyers can create reviews for their orders" ON seller_reviews FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = buyer_id AND EXISTS (SELECT 1 FROM orders WHERE id = order_id AND buyer_id = (SELECT auth.uid()) AND status IN ('delivered', 'completed')));
CREATE POLICY "Participants can update reviews" ON seller_reviews FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id) WITH CHECK ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id);

-- External pricing cache
CREATE POLICY "External pricing cache is publicly readable" ON external_pricing_cache FOR SELECT TO public USING (TRUE);

-- User feedback
CREATE POLICY "Anyone can submit feedback" ON user_feedback FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Users can view their feedback or staff can view all" ON user_feedback FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_staff());
CREATE POLICY "Staff can update feedback" ON user_feedback FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff());

-- Newsletter subscribers
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Users can view own subscription" ON newsletter_subscribers FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))::text);
CREATE POLICY "Users can update own subscription" ON newsletter_subscribers FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))::text) WITH CHECK (user_id = (SELECT auth.uid()) OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))::text);

-- ============================================================================
-- SECTION 9: STORAGE BUCKETS
-- ============================================================================

-- Listing photos bucket (public, 5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('listing-photos', 'listing-photos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO NOTHING;

-- Order documents bucket (public, 10MB limit for shipping labels)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-documents', 'order-documents', TRUE, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Transaction photos bucket (public, 5MB limit for proof of shipment)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('transaction-photos', 'transaction-photos', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Feedback screenshots bucket (private, 5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feedback-screenshots', 'feedback-screenshots', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public assets bucket (public, no restrictions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 10: CRON JOBS
-- ============================================================================
-- Note: These require pg_cron extension and should be scheduled after deployment

-- Every minute: Cleanup expired cart reservations
SELECT cron.schedule('expire-reservations', '* * * * *', 'SELECT cleanup_expired_cart_items()');

-- Daily 3:00 AM UTC: Expire old wanted listings
SELECT cron.schedule('expire-wanted-listings', '0 3 * * *', 'SELECT expire_wanted_listings()');

-- Daily 1:00 AM UTC: Complete orders after 3-day inspection period
SELECT cron.schedule('complete-delivered-orders', '0 1 * * *', 'SELECT complete_delivered_orders()');

-- Every 5 minutes: Expire orders without seller response (Edge Function)
SELECT cron.schedule('expire-seller-deadlines', '*/5 * * * *', $$SELECT call_edge_function('cron-expire-seller-deadlines')$$);

-- Every 30 minutes: Sync Unisend tracking (Edge Function)
SELECT cron.schedule('sync-tracking', '*/30 * * * *', $$SELECT call_edge_function('cron-sync-tracking')$$);

-- Daily 4:00 AM UTC: Process seller payouts (Edge Function)
SELECT cron.schedule('process-payouts', '0 4 * * *', $$SELECT call_edge_function('cron-process-payouts')$$);

-- Daily 2:00 AM UTC: Cleanup GDPR-deleted accounts (Edge Function)
SELECT cron.schedule('cleanup-deleted-accounts', '0 2 * * *', $$SELECT call_edge_function('cron-cleanup-accounts')$$);

-- Weekly Sunday 3:00 AM UTC: Cleanup old security audit logs
SELECT cron.schedule('cleanup-security-audit-logs', '0 3 * * 0', 'SELECT cleanup_old_security_audit_logs()');

-- Hourly: Refresh game pricing stats
SELECT cron.schedule('refresh-game-pricing-stats', '5 * * * *', 'SELECT refresh_game_pricing_stats()');

-- ============================================================================
-- END OF CONSOLIDATED SCHEMA
-- ============================================================================
-- Total: 28 tables, 8 views, ~70 functions, ~35 triggers, ~80 RLS policies
-- Total: 5 storage buckets, 9 cron jobs
-- ============================================================================
