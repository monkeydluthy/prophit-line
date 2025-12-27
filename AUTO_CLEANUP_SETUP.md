# Automatic Cleanup Setup - COMPLETE GUIDE

## ✅ What's Been Set Up

1. **Database cleanup function** (`supabase/migrations/004_auto_cleanup_function.sql`)
   - Automatically deletes snapshots older than 20 days
   - Can be called via API

2. **API endpoint** (`app/api/cleanup-snapshots/route.ts`)
   - Can be called by cron jobs or manually
   - Returns cleanup results

3. **Netlify scheduled function** (`netlify/functions/cleanup-snapshots.ts`)
   - Runs automatically daily at 2 AM UTC
   - Configured in `netlify.toml`

4. **Manual test script** (`scripts/run-cleanup-now.ts`)
   - Run cleanup immediately for testing

## 🚀 Setup Steps

### Step 1: Create the Cleanup Function in Supabase

**Run this SQL in Supabase SQL Editor:**

```sql
-- Create automatic cleanup function for market_snapshots
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
  cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
  
  DELETE FROM public.market_snapshots
  WHERE recorded_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  SELECT COUNT(*) INTO remaining_count FROM public.market_snapshots;
  
  RETURN QUERY SELECT deleted_count, remaining_count, cutoff_date;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_market_snapshots(INTEGER) TO service_role;
```

### Step 2: Test the Cleanup (Optional)

```bash
# Test cleanup function manually
npx tsx scripts/run-cleanup-now.ts
```

### Step 3: Deploy to Netlify

The Netlify scheduled function is already configured in `netlify.toml`:
- Runs daily at 2 AM UTC
- Automatically calls the cleanup function
- Keeps only the last 20 days of snapshots

Just deploy your app to Netlify and it will run automatically!

### Step 4: Verify It's Working

After deployment, check Netlify function logs to see the cleanup running daily.

## 📊 How It Works

1. **Daily at 2 AM UTC**: Netlify triggers the `cleanup-snapshots` function
2. **Function calls**: Supabase RPC function `cleanup_old_market_snapshots(20)`
3. **Database cleanup**: Deletes all snapshots older than 20 days
4. **Results logged**: Number of deleted/remaining snapshots

## 🔧 Manual Cleanup

You can also trigger cleanup manually:

```bash
# Via script
npx tsx scripts/run-cleanup-now.ts

# Via API (if deployed)
curl https://your-domain.com/api/cleanup-snapshots
```

## 📈 Monitoring

To check how many snapshots you have:

```sql
SELECT COUNT(*) FROM public.market_snapshots;
```

To see the date range:

```sql
SELECT 
  MIN(recorded_at) as oldest,
  MAX(recorded_at) as newest,
  COUNT(*) as total
FROM public.market_snapshots;
```

## ⚙️ Configuration

To change the retention period (default: 20 days):

1. Update `DAYS_TO_KEEP` in:
   - `netlify/functions/cleanup-snapshots.ts`
   - `scripts/run-cleanup-now.ts`

2. Or pass custom days to the API:
   ```
   GET /api/cleanup-snapshots?days=15
   ```

## ✅ That's It!

Once you:
1. Run the SQL migration in Supabase
2. Deploy to Netlify

The cleanup will run automatically every day, keeping your database under the 500 MB limit!

