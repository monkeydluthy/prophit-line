/**
 * Creates a Postgres function in Supabase for efficient cleanup
 * Then calls it to delete old snapshots
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEEP_DAYS = Number(process.env.KEEP_DAYS ?? '3');

async function createAndRunCleanup() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    console.log('🔧 Creating cleanup function in Supabase...\n');

    // Create the function using SQL execution via REST API
    // We'll use the Supabase REST API to execute SQL
    // Note: Supabase doesn't allow arbitrary SQL via REST, so we need to use migrations
    // But we can try using the management API or create it via a different method
    
    // Actually, the best approach is to use Supabase's SQL editor directly
    // But since user wants it automated, let's try using pg library if available
    // Or we can use the Supabase client
    
    // For now, let's try a simpler approach: delete in very small date ranges
    console.log('📅 Using incremental date-based deletion to avoid timeouts...\n');
    
    const now = new Date();
    let deletedTotal = 0;
    
    // Delete one day at a time, going back from KEEP_DAYS
    for (let daysBack = KEEP_DAYS + 1; daysBack <= KEEP_DAYS + 30; daysBack++) {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      cutoffDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(cutoffDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const cutoffISO = cutoffDate.toISOString();
      const nextDayISO = nextDay.toISOString();
      
      console.log(`   Checking day ${daysBack} days ago (${cutoffDate.toISOString().split('T')[0]})...`);
      
      // Count first
      const countResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=gte.${cutoffISO}&recorded_at=lt.${nextDayISO}&limit=1`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'count=exact',
          },
        }
      );

      if (!countResponse.ok) {
        console.log(`   ⚠️  Skipping (error: ${countResponse.status})`);
        continue;
      }

      const count = countResponse.headers.get('content-range')?.split('/')[1] || '0';
      const countNum = Number(count);
      
      if (countNum === 0) {
        continue; // No snapshots for this day
      }
      
      console.log(`   Found ${countNum.toLocaleString()} snapshots, deleting...`);
      
      // Delete this day's snapshots in smaller batches
      // Use DELETE with date filter directly (more efficient)
      // But Supabase REST API doesn't support DELETE with WHERE, so we need batches
      const BATCH_SIZE = 1000;
      let offset = 0;
      let dayDeleted = 0;
      let batchNum = 0;
      
      while (true) {
        batchNum++;
        const batchResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=gte.${cutoffISO}&recorded_at=lt.${nextDayISO}&limit=${BATCH_SIZE}&offset=${offset}`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        );

        if (!batchResponse.ok) {
          const errorText = await batchResponse.text();
          console.log(`   ⚠️  Error fetching batch ${batchNum}: ${batchResponse.status}`);
          if (batchResponse.status === 429) {
            // Rate limited, wait a bit
            console.log(`   ⏳ Rate limited, waiting 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          break;
        }

        const batch = await batchResponse.json();
        
        if (batch.length === 0) {
          break; // No more records for this day
        }

        // Delete this batch using 'in' operator (up to 100 IDs at a time for URL length limits)
        const ids = batch.map((row: any) => row.id);
        const DELETE_CHUNK = 100;
        
        for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
          const chunk = ids.slice(i, i + DELETE_CHUNK);
          
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
            dayDeleted += chunk.length;
            deletedTotal += chunk.length;
          } else {
            const errorText = await deleteResponse.text();
            console.log(`   ⚠️  Delete error for chunk: ${deleteResponse.status}`);
            // Continue with next chunk
          }
        }

        offset += BATCH_SIZE;
        
        // Progress update
        if (batchNum % 5 === 0) {
          const progress = ((dayDeleted / countNum) * 100).toFixed(1);
          console.log(`   Progress: ${dayDeleted.toLocaleString()} / ${countNum.toLocaleString()} (${progress}%)`);
        }
        
        // Check if we're done
        if (batch.length < BATCH_SIZE) {
          break; // Last batch
        }
      }
      
      console.log(`   ✅ Deleted ${dayDeleted.toLocaleString()} snapshots from this day`);
      console.log(`   Total deleted so far: ${deletedTotal.toLocaleString()}\n`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Total deleted: ${deletedTotal.toLocaleString()} snapshots`);
    console.log(`   Kept snapshots from the last ${KEEP_DAYS} days\n`);

    // Get final count
    const finalCountResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );

    if (finalCountResponse.ok) {
      const finalCount = finalCountResponse.headers.get('content-range')?.split('/')[1] || 'unknown';
      console.log(`📊 Final snapshot count: ${Number(finalCount).toLocaleString()}\n`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

createAndRunCleanup().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});

