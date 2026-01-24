-- Migration: Add DAC7 tax information fields
-- Description: Adds fields required for DAC7 EU tax reporting compliance
-- These fields store seller identity and address information collected when
-- sellers approach the reporting thresholds (30+ transactions OR €2000+ sales)

-- ============================================================================
-- STEP 1: Add new DAC7 tax information columns to seller_profiles
-- ============================================================================

ALTER TABLE seller_profiles
  -- Identity information (as required by DAC7)
  ADD COLUMN dac7_full_legal_name TEXT,
  ADD COLUMN dac7_date_of_birth DATE,

  -- Address information (as required by DAC7)
  ADD COLUMN dac7_address_street TEXT,
  ADD COLUMN dac7_address_city TEXT,
  ADD COLUMN dac7_address_postal_code TEXT,
  ADD COLUMN dac7_address_country TEXT,

  -- Tax residency (which country to report to)
  ADD COLUMN dac7_tax_residency_country TEXT,

  -- Tracking fields
  ADD COLUMN dac7_info_submitted_at TIMESTAMPTZ,
  ADD COLUMN dac7_info_verified BOOLEAN DEFAULT FALSE,

  -- Compliance status for tracking workflow
  ADD COLUMN dac7_compliance_status TEXT DEFAULT 'exempt'
    CHECK (dac7_compliance_status IN ('exempt', 'approaching', 'required', 'compliant', 'blocked'));

-- ============================================================================
-- STEP 2: Add indexes for common queries
-- ============================================================================

-- Index for filtering by compliance status (used by staff dashboard)
CREATE INDEX idx_seller_profiles_dac7_status
  ON seller_profiles(dac7_compliance_status)
  WHERE dac7_compliance_status != 'exempt';

-- Index for finding sellers needing action
CREATE INDEX idx_seller_profiles_dac7_needs_info
  ON seller_profiles(dac7_compliance_status)
  WHERE dac7_compliance_status IN ('approaching', 'required', 'blocked');

-- ============================================================================
-- STEP 3: Create function to update compliance status automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dac7_compliance_status()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold_count INTEGER := 30;
  v_threshold_sales DECIMAL := 2000.00;
  v_warning_count INTEGER := 24;  -- 80% of 30
  v_warning_sales DECIMAL := 1600.00;  -- 80% of 2000
  v_new_status TEXT;
BEGIN
  -- Determine new status based on thresholds and tax info
  IF NEW.dac7_annual_transaction_count >= v_threshold_count
     OR NEW.dac7_annual_sales_total >= v_threshold_sales THEN
    -- At or above threshold
    IF NEW.dac7_info_submitted_at IS NOT NULL THEN
      v_new_status := 'compliant';
    ELSIF NEW.dac7_compliance_status = 'blocked' THEN
      -- Stay blocked until info submitted
      v_new_status := 'blocked';
    ELSE
      v_new_status := 'required';
    END IF;
  ELSIF NEW.dac7_annual_transaction_count >= v_warning_count
        OR NEW.dac7_annual_sales_total >= v_warning_sales THEN
    -- Approaching threshold (80%+)
    IF NEW.dac7_info_submitted_at IS NOT NULL THEN
      v_new_status := 'compliant';
    ELSE
      v_new_status := 'approaching';
    END IF;
  ELSE
    -- Below warning threshold
    v_new_status := 'exempt';
  END IF;

  -- Only update if status actually changed
  IF NEW.dac7_compliance_status IS DISTINCT FROM v_new_status THEN
    NEW.dac7_compliance_status := v_new_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create trigger to auto-update compliance status
-- ============================================================================

CREATE TRIGGER trigger_update_dac7_compliance_status
  BEFORE INSERT OR UPDATE OF dac7_annual_transaction_count, dac7_annual_sales_total, dac7_info_submitted_at
  ON seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_dac7_compliance_status();

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN seller_profiles.dac7_full_legal_name IS 'Full legal name as on official documents (required for DAC7 reporting)';
COMMENT ON COLUMN seller_profiles.dac7_date_of_birth IS 'Date of birth (required for DAC7 reporting)';
COMMENT ON COLUMN seller_profiles.dac7_address_street IS 'Street address (required for DAC7 reporting)';
COMMENT ON COLUMN seller_profiles.dac7_address_city IS 'City (required for DAC7 reporting)';
COMMENT ON COLUMN seller_profiles.dac7_address_postal_code IS 'Postal code (required for DAC7 reporting)';
COMMENT ON COLUMN seller_profiles.dac7_address_country IS 'Country code: LV, LT, EE (required for DAC7 reporting)';
COMMENT ON COLUMN seller_profiles.dac7_tax_residency_country IS 'Country of tax residency - determines which tax authority receives the report';
COMMENT ON COLUMN seller_profiles.dac7_info_submitted_at IS 'When the seller submitted their tax information';
COMMENT ON COLUMN seller_profiles.dac7_info_verified IS 'Whether the tax information has been verified by staff';
COMMENT ON COLUMN seller_profiles.dac7_compliance_status IS 'DAC7 compliance status: exempt (below 80%), approaching (80-99%), required (100%+ no info), compliant (100%+ with info), blocked (100%+ no info, blocked from selling)';

-- ============================================================================
-- STEP 6: Update existing sellers to set initial compliance status
-- ============================================================================

-- Run the compliance status calculation for all existing sellers
UPDATE seller_profiles SET updated_at = NOW();
