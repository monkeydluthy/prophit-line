# Database Cleanup Status

## Current Status
- **Current snapshot count**: ~236,472
- **Database size**: 3.763 GB (need to get under 0.5 GB)
- **Progress**: Deleted ~650,000+ snapshots so far

## What's Been Done
1. ✅ Created cleanup scripts
2. ✅ Deleted snapshots older than 3 days (initial cleanup)
3. ✅ Deleted snapshots older than 1 day (aggressive cleanup)
4. ⚠️ Still need to get under 500 MB limit

## Recommended Next Steps

Since the REST API approach is slow and hitting partial deletions, the **fastest way** to get under the limit is to run SQL directly in Supabase SQL Editor:

### Option 1: Keep Only Today (Most Aggressive)
```sql
-- Delete everything except today
DELETE FROM public.market_snapshots
WHERE recorded_at < CURRENT_DATE;

-- Reclaim space
VACUUM ANALYZE public.market_snapshots;
```

### Option 2: Keep Last 3 Days (Balanced)
```sql
-- Delete everything older than 3 days
DELETE FROM public.market_snapshots
WHERE recorded_at < NOW() - INTERVAL '3 days';

-- Reclaim space
VACUUM ANALYZE public.market_snapshots;
```

### Option 3: Reduce JSONB Data Size
If you still need to reduce more, you can reduce the JSONB `data` column size:
```sql
-- Keep only essential fields in JSONB
UPDATE public.market_snapshots
SET data = jsonb_build_object(
  'id', data->>'id',
  'platform', data->>'platform',
  'title', data->>'title'
)
WHERE data IS NOT NULL;

-- Then VACUUM
VACUUM ANALYZE public.market_snapshots;
```

## Check Database Size After Cleanup
Run this in Supabase SQL Editor to check the actual table size:
```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('public.market_snapshots')) as total_size,
  pg_size_pretty(pg_relation_size('public.market_snapshots')) as table_size,
  COUNT(*) as snapshot_count
FROM public.market_snapshots;
```

