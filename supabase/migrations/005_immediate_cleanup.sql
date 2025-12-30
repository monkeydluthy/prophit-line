-- Immediate cleanup script - Run this NOW to clean up and reclaim space
-- This deletes old data AND reclaims disk space with VACUUM

-- Step 1: Delete snapshots older than 20 days
DELETE FROM public.market_snapshots
WHERE recorded_at < NOW() - INTERVAL '20 days';

-- Step 2: Reclaim disk space (CRITICAL - without this, space isn't freed!)
-- VACUUM FULL locks the table but reclaims all space
VACUUM FULL public.market_snapshots;

-- Step 3: Update statistics
ANALYZE public.market_snapshots;

-- Step 4: Check the new size
SELECT
  pg_size_pretty(pg_total_relation_size('public.market_snapshots')) as total_size,
  pg_size_pretty(pg_relation_size('public.market_snapshots')) as table_size,
  pg_size_pretty(pg_total_relation_size('public.market_snapshots') - pg_relation_size('public.market_snapshots')) as indexes_size,
  COUNT(*) as snapshot_count
FROM public.market_snapshots;

-- Note: VACUUM FULL will lock the table briefly, but it's necessary to reclaim space.
-- Regular VACUUM doesn't reclaim space, only VACUUM FULL does.


