-- Cleanup script to reduce database size
-- Run this in Supabase SQL Editor to delete old snapshots

-- Option 1: Delete snapshots older than 7 days (recommended)
-- Adjust the interval as needed (e.g., '30 days', '14 days', '7 days')
DELETE FROM public.market_snapshots
WHERE recorded_at < NOW() - INTERVAL '7 days';

-- Option 2: Keep only the most recent N snapshots per market
-- This keeps the latest snapshot for each market_id
-- Uncomment and adjust as needed:
/*
WITH ranked_snapshots AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY market_id ORDER BY recorded_at DESC) as rn
  FROM public.market_snapshots
)
DELETE FROM public.market_snapshots
WHERE id IN (
  SELECT id FROM ranked_snapshots WHERE rn > 1
);
*/

-- Option 3: Reduce JSONB data size by removing unnecessary fields
-- This keeps only essential data in the JSONB 'data' field
-- Uncomment if you want to reduce JSONB size:
/*
UPDATE public.market_snapshots
SET data = jsonb_build_object(
  'id', data->>'id',
  'platform', data->>'platform',
  'title', data->>'title',
  'outcomes', data->'outcomes'
)
WHERE data IS NOT NULL;
*/

-- After cleanup, run VACUUM to reclaim space:
-- VACUUM ANALYZE public.market_snapshots;

-- Check table size before and after:
-- SELECT 
--   pg_size_pretty(pg_total_relation_size('public.market_snapshots')) as total_size,
--   pg_size_pretty(pg_relation_size('public.market_snapshots')) as table_size,
--   pg_size_pretty(pg_total_relation_size('public.market_snapshots') - pg_relation_size('public.market_snapshots')) as indexes_size;


