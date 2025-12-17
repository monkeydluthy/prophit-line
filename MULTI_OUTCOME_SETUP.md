# Multi-Outcome Snapshot Setup Guide

## Steps to Enable Multi-Outcome Chart Recording

### 1. Run Database Migration

**IMPORTANT:** You must run the database migration first before the snapshot collector can record multiple outcomes.

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/002_add_outcome_fields.sql`
5. Click **Run**

The migration adds these columns:
- `outcome_name` - Name of the outcome (e.g., "Ohio St.", "Indiana")
- `outcome_index` - Index of the outcome (0, 1, 2, 3, 4)
- `outcome_price` - Price of the outcome
- `outcome_percentage` - Percentage probability of the outcome

### 2. Verify Migration

After running the migration, you can verify it worked by:

1. Go to **Table Editor** in Supabase
2. Select the `market_snapshots` table
3. Check if the new columns appear: `outcome_name`, `outcome_index`, `outcome_price`, `outcome_percentage`

### 3. Wait for Next Snapshot Collection

The snapshot collector runs automatically every **15 minutes** (configured in `netlify.toml`).

After the migration is run, the next scheduled run will start recording multiple outcomes per market.

### 4. Manual Snapshot Trigger (Optional)

If you want to trigger a snapshot immediately instead of waiting 15 minutes:

1. Go to your Netlify dashboard
2. Navigate to **Functions**
3. Find the `snapshot-collector` function
4. Click **Invoke** to run it manually

### 5. Verify Multi-Outcome Data

Once snapshots have been collected, you can check if multiple outcomes are being recorded:

1. Go to Supabase **Table Editor**
2. Select `market_snapshots` table
3. Filter by `outcome_index` IS NOT NULL
4. You should see multiple records per market (one for each outcome)

### Troubleshooting

**Issue: Still only seeing one line on charts**

Possible causes:
1. ✅ Migration not run - Run the migration first (Step 1)
2. ✅ Snapshot collector hasn't run yet - Wait 15 minutes or trigger manually
3. ✅ Market doesn't have multiple outcomes - Check if the market actually has multiple outcomes in the API response
4. ✅ Old data - Clear old snapshots or wait for new ones to accumulate

**Issue: Snapshot collector failing**

Check Netlify function logs:
1. Go to Netlify dashboard → Functions → snapshot-collector
2. Check the logs for error messages
3. Common errors:
   - "column does not exist" → Migration not run
   - "insert failed" → Check Supabase connection and keys

**Check Migration Status:**

You can verify if the migration worked by checking the table structure in Supabase or running a test query:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'market_snapshots' 
  AND column_name IN ('outcome_name', 'outcome_index', 'outcome_price', 'outcome_percentage');
```

If this returns 4 rows, the migration was successful!






