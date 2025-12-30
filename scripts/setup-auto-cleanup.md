# Automatic Cleanup Setup Guide

## Step 1: Create the Cleanup Function

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy the contents of: supabase/migrations/004_auto_cleanup_function.sql
```

Or run the migration file directly.

## Step 2: Test the Function

You can test it manually:

```sql
-- Test with default 20 days
SELECT * FROM auto_cleanup_snapshots();

-- Or test with custom days
SELECT * FROM cleanup_old_market_snapshots(20);
```

## Step 3: Set Up Automatic Scheduling

You have several options:

### Option A: Supabase Edge Functions + Cron (Recommended)

1. Create a Supabase Edge Function that calls the cleanup
2. Set up a cron trigger in Supabase Dashboard
3. Or use an external cron service

### Option B: External Cron Service (Easiest)

Use a service like:
- **cron-job.org** (free)
- **EasyCron** (free tier)
- **GitHub Actions** (if you use GitHub)

Set it to call: `https://your-domain.com/api/cleanup-snapshots`

Schedule: Daily at 2 AM UTC (or your preferred time)

### Option C: Vercel Cron (If deployed on Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cleanup-snapshots",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Option D: Netlify Scheduled Functions

If using Netlify, create a scheduled function.

## Step 4: Verify It's Working

After setup, check the logs to ensure cleanup runs:
- Check Supabase logs for function execution
- Check your API logs for cleanup calls
- Monitor database size in Supabase dashboard

## Manual Trigger

You can also trigger cleanup manually:

```bash
# Via API
curl https://your-domain.com/api/cleanup-snapshots

# Or with custom days
curl https://your-domain.com/api/cleanup-snapshots?days=20
```

## Monitoring

Check cleanup results:
```sql
-- See recent cleanup activity (if you add logging)
SELECT * FROM cleanup_old_market_snapshots(20);
```

## Notes

- The function deletes snapshots older than the specified days
- Default is 20 days (configurable)
- Runs with SECURITY DEFINER so it has proper permissions
- Safe to run multiple times (idempotent)


