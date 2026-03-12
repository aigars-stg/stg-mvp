-- ============================================================================
-- Task 1.8: Add SECURITY DEFINER to escalate_expired_disputes()
-- Consistency fix: all other cron-callable functions are SECURITY DEFINER
-- Function body unchanged from 20260305_dispute_engine.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION escalate_expired_disputes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE orders SET
    dispute_status = 'under_review',
    updated_at = NOW()
  WHERE dispute_status = 'awaiting_seller'
    AND dispute_seller_deadline < NOW()
    AND dispute_seller_responded_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$function$;

COMMENT ON FUNCTION escalate_expired_disputes IS 'Cron job: escalate disputes to under_review when seller deadline passes';
