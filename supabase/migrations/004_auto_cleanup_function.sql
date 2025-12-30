-- Create automatic cleanup function for market_snapshots
-- This function deletes snapshots older than the specified number of days

CREATE OR REPLACE FUNCTION cleanup_old_market_snapshots(days_to_keep INTEGER DEFAULT 20)
RETURNS TABLE(
  deleted_count BIGINT,
  remaining_count BIGINT,
  cleanup_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count BIGINT;
  remaining_count BIGINT;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  -- Delete old snapshots
  DELETE FROM public.market_snapshots
  WHERE recorded_at < cutoff_date;
  
  -- Get count of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Get remaining count
  SELECT COUNT(*) INTO remaining_count FROM public.market_snapshots;
  
  -- Return results
  RETURN QUERY SELECT deleted_count, remaining_count, cutoff_date;
END;
$$;

-- Grant execute permission to service role (for API calls)
GRANT EXECUTE ON FUNCTION cleanup_old_market_snapshots(INTEGER) TO service_role;

-- Create a simpler version that can be called without parameters (uses default 20 days)
CREATE OR REPLACE FUNCTION auto_cleanup_snapshots()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result RECORD;
  result_json JSONB;
BEGIN
  -- Call the cleanup function with default 20 days
  SELECT * INTO result FROM cleanup_old_market_snapshots(20);
  
  -- Build result JSON
  result_json := jsonb_build_object(
    'deleted_count', result.deleted_count,
    'remaining_count', result.remaining_count,
    'cutoff_date', result.cleanup_date,
    'cleanup_time', NOW()
  );
  
  RETURN result_json;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_cleanup_snapshots() TO service_role;

-- Optional: Set up pg_cron job (if pg_cron extension is enabled)
-- Uncomment if you have pg_cron available:
/*
SELECT cron.schedule(
  'cleanup-old-snapshots',           -- job name
  '0 2 * * *',                       -- run daily at 2 AM UTC
  $$SELECT cleanup_old_market_snapshots(20);$$
);
*/


