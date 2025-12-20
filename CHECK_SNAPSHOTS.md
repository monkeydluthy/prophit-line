# Quick Check: Is Multi-Outcome Recording Working?

## After the snapshot collector runs (manually or automatically):

### 1. Check Netlify Function Logs
- Go to: Netlify Dashboard → Functions → snapshot-collector → Logs
- Look for a message like:
  ```
  Inserted 750 snapshots for 150 markets (600 outcome-specific records)
  ```
- If you see outcome-specific records, it's working! ✅

### 2. Check Supabase Table
- Go to: Supabase Dashboard → Table Editor → market_snapshots
- Add filter: `outcome_index IS NOT NULL`
- You should see multiple rows per market (one per outcome)
- Example: Market "kalshi:EVENT-123" should have 4-5 rows with different `outcome_index` values

### 3. Check the Chart
- Go to a market detail page that has multiple outcomes
- The chart should show multiple colored lines (green, blue, orange, red, etc.)
- Each line represents a different outcome

## Troubleshooting

**If you see "column does not exist" error:**
- The migration might not have run successfully
- Re-run the migration SQL in Supabase

**If outcome-specific records count is 0:**
- The markets might not have multiple outcomes
- Or the snapshot collector code hasn't been deployed yet

**If charts still show one line:**
- Wait for multiple snapshots to accumulate (you need history points)
- Or check if the market actually has multiple outcomes in the API response









