/**
 * Direct cleanup script - deletes old snapshots via Supabase REST API
 * This uses a more efficient approach with Postgres functions
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Keep snapshots from the last N days (default: 3 days for aggressive cleanup)
// Set KEEP_DAYS=1 for very aggressive cleanup to get under quota quickly
const KEEP_DAYS = Number(process.env.KEEP_DAYS ?? '3');

async function cleanupSnapshotsDirect() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Please set these in your .env.local file');
    process.exit(1);
  }

  try {
    console.log(`🧹 Starting cleanup of market_snapshots table...`);
    console.log(`   Keeping snapshots from the last ${KEEP_DAYS} days\n`);

    // First, check how many will be deleted
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`📅 Cutoff date: ${cutoffISO}\n`);

    // Count snapshots to delete
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=lt.${cutoffISO}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );

    if (!countResponse.ok) {
      const errorText = await countResponse.text();
      console.error(`❌ Failed to count snapshots: ${countResponse.status}`);
      console.error(errorText);
      process.exit(1);
    }

    const toDeleteCount = countResponse.headers.get('content-range')?.split('/')[1] || '0';
    const countNum = Number(toDeleteCount);

    if (countNum === 0) {
      console.log('✅ No old snapshots to delete. Database is already clean!');
      return;
    }

    console.log(`📋 Found ${countNum.toLocaleString()} snapshots to delete\n`);

    // Use Postgres function approach via RPC (more efficient)
    // First, we need to create the function if it doesn't exist
    // For now, we'll use a direct DELETE via REST API with a workaround
    
    // Since Supabase REST API doesn't support DELETE with WHERE directly,
    // we'll use the PostgREST approach with a filter
    // But we need to delete in batches due to API limits
    
    console.log(`🗑️  Deleting old snapshots...\n`);

    // Method: Use a stored procedure/function approach
    // We'll call a SQL function via RPC endpoint
    // First check if cleanup function exists, if not create it
    
    // Create cleanup function via SQL
    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION cleanup_old_snapshots(days_to_keep INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.market_snapshots
  WHERE recorded_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Run VACUUM to reclaim space
  VACUUM ANALYZE public.market_snapshots;
  
  RETURN deleted_count;
END;
$$;
    `.trim();

    // Try to create the function via SQL endpoint
    // Supabase doesn't expose direct SQL execution via REST, so we'll use a different approach
    
    // Alternative: Delete in batches using the REST API
    // This is slower but works without needing to create functions
    
    const BATCH_SIZE = 1000;
    let deletedCount = 0;
    let offset = 0;
    let hasMore = true;
    let batchNum = 0;

    console.log(`   Using batch deletion (${BATCH_SIZE} per batch)...\n`);

    while (hasMore && deletedCount < countNum) {
      batchNum++;
      
      // Get batch of IDs to delete
      const batchResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=lt.${cutoffISO}&limit=${BATCH_SIZE}&offset=${offset}`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        console.error(`❌ Failed to fetch batch ${batchNum}: ${batchResponse.status}`);
        console.error(errorText);
        break;
      }

      const batch = await batchResponse.json();
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Delete this batch using Supabase's bulk delete
      // We'll delete by ID using the 'in' filter
      const ids = batch.map((row: any) => row.id);
      
      // Supabase REST API supports deleting with 'in' filter
      // Format: id=in.(id1,id2,id3,...)
      // But there's a limit on URL length, so we'll do smaller chunks
      const DELETE_CHUNK_SIZE = 100;
      
      for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE);
        const idsFilter = chunk.map(id => `"${id}"`).join(',');
        
        // Use the 'in' operator for bulk delete
        const deleteResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/market_snapshots?id=in.(${chunk.join(',')})`,
          {
            method: 'DELETE',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Prefer': 'return=minimal',
            },
          }
        );

        if (deleteResponse.ok) {
          deletedCount += chunk.length;
        } else {
          const errorText = await deleteResponse.text();
          console.error(`⚠️  Failed to delete chunk: ${deleteResponse.status}`);
          console.error(errorText);
        }
      }

      offset += BATCH_SIZE;
      
      if (batchNum % 10 === 0 || deletedCount >= countNum) {
        const progress = ((deletedCount / countNum) * 100).toFixed(1);
        console.log(`   Progress: ${deletedCount.toLocaleString()} / ${countNum.toLocaleString()} (${progress}%)`);
      }

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted ${deletedCount.toLocaleString()} old snapshots`);
    console.log(`   Kept snapshots from the last ${KEEP_DAYS} days\n`);

    // Get new count
    const newCountResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );

    if (newCountResponse.ok) {
      const newCount = newCountResponse.headers.get('content-range')?.split('/')[1] || 'unknown';
      console.log(`📊 New snapshot count: ${Number(newCount).toLocaleString()}`);
      console.log(`   Reduction: ${(countNum).toLocaleString()} snapshots removed\n`);
    }

    console.log('💡 Note: Run VACUUM in Supabase SQL Editor to fully reclaim disk space:');
    console.log('   VACUUM ANALYZE public.market_snapshots;\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupSnapshotsDirect().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});

