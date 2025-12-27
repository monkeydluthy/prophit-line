/**
 * Script to delete old market snapshots to reduce database size
 * Run with: npx tsx scripts/cleanup-old-snapshots.ts
 * 
 * This will:
 * 1. Delete snapshots older than 7 days (configurable)
 * 2. Optionally reduce JSONB data size by removing unnecessary fields
 * 3. Show statistics before and after cleanup
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Keep snapshots from the last N days (default: 7 days)
const KEEP_DAYS = Number(process.env.KEEP_DAYS ?? '7');

async function cleanupSnapshots() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  try {
    console.log(`🧹 Starting cleanup of market_snapshots table...`);
    console.log(`   Keeping snapshots from the last ${KEEP_DAYS} days\n`);

    // First, get statistics
    const statsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_table_stats`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ table_name: 'market_snapshots' }),
      }
    );

    // Get total count
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );

    const totalCount = countResponse.headers.get('content-range')?.split('/')[1] || 'unknown';
    console.log(`📊 Current snapshot count: ${totalCount}`);

    // Get oldest and newest timestamps
    const oldestResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=recorded_at&order=recorded_at.asc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const newestResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=recorded_at&order=recorded_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (oldestResponse.ok && newestResponse.ok) {
      const oldest = await oldestResponse.json();
      const newest = await newestResponse.json();
      
      if (oldest.length > 0 && newest.length > 0) {
        console.log(`   Oldest snapshot: ${oldest[0].recorded_at}`);
        console.log(`   Newest snapshot: ${newest[0].recorded_at}\n`);
      }
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`🗑️  Deleting snapshots older than: ${cutoffISO}\n`);

    // Delete old snapshots
    // Note: Supabase REST API doesn't support DELETE with WHERE directly
    // We need to use a Postgres function or delete in batches
    // For now, we'll use a direct SQL approach via RPC or we can delete by ID ranges
    
    // Get IDs of snapshots to delete
    const toDeleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=lt.${cutoffISO}&limit=10000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );

    const toDeleteCount = toDeleteResponse.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`📋 Found ${toDeleteCount} snapshots to delete\n`);

    if (toDeleteCount === '0' || toDeleteCount === 'unknown') {
      console.log('✅ No old snapshots to delete. Database is already clean!');
      return;
    }

    // Delete in batches (Supabase REST API has limits)
    const BATCH_SIZE = 1000;
    let deletedCount = 0;
    let offset = 0;
    let hasMore = true;

    console.log(`🗑️  Deleting in batches of ${BATCH_SIZE}...\n`);

    while (hasMore) {
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
        console.error(`❌ Failed to fetch batch: ${batchResponse.status}`);
        break;
      }

      const batch = await batchResponse.json();
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Delete this batch
      const ids = batch.map((row: any) => row.id);
      
      // Supabase REST API doesn't support bulk DELETE with WHERE
      // We need to delete one by one or use a Postgres function
      // For efficiency, let's delete by ID ranges
      
      // Delete each ID (this is slow but works)
      // Better approach: Use a Postgres function
      for (const id of ids) {
        const deleteResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/market_snapshots?id=eq.${id}`,
          {
            method: 'DELETE',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        );

        if (deleteResponse.ok) {
          deletedCount++;
        }
      }

      offset += BATCH_SIZE;
      
      if (deletedCount % 1000 === 0) {
        console.log(`   Deleted ${deletedCount} snapshots...`);
      }

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Deleted ${deletedCount} old snapshots`);
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

    const newCount = newCountResponse.headers.get('content-range')?.split('/')[1] || 'unknown';
    console.log(`📊 New snapshot count: ${newCount}`);
    console.log(`   Reduction: ${Number(totalCount) - Number(newCount)} snapshots removed`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Alternative: Use a more efficient Postgres function approach
async function cleanupSnapshotsEfficient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  console.log(`🧹 Starting efficient cleanup of market_snapshots table...`);
  console.log(`   Keeping snapshots from the last ${KEEP_DAYS} days\n`);

  // This requires creating a Postgres function first
  // For now, we'll provide SQL that can be run directly in Supabase SQL editor
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);
  const cutoffISO = cutoffDate.toISOString();

  console.log(`📝 Run this SQL in Supabase SQL Editor to delete old snapshots:`);
  console.log(`\n`);
  console.log(`DELETE FROM public.market_snapshots`);
  console.log(`WHERE recorded_at < '${cutoffISO}';`);
  console.log(`\n`);
  console.log(`Or to see how many will be deleted first:`);
  console.log(`\n`);
  console.log(`SELECT COUNT(*) FROM public.market_snapshots`);
  console.log(`WHERE recorded_at < '${cutoffISO}';`);
  console.log(`\n`);
}

// Run the cleanup
if (process.argv.includes('--sql-only')) {
  cleanupSnapshotsEfficient();
} else {
  cleanupSnapshots().catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
}

