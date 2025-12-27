/**
 * Aggressive cleanup - keeps only last 1 day to get under quota quickly
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function aggressiveCleanup() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔥 AGGRESSIVE CLEANUP - Keeping only last 1 day\n');

  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - 1);
  cutoffDate.setHours(0, 0, 0, 0);
  const cutoffISO = cutoffDate.toISOString();

  console.log(`📅 Deleting all snapshots before: ${cutoffISO}\n`);

  // Count total
  const totalResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );

  const totalCount = totalResponse.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`📊 Total snapshots: ${Number(totalCount).toLocaleString()}\n`);

  // Count to delete
  const toDeleteResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=lt.${cutoffISO}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );

  const toDeleteCount = toDeleteResponse.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`🗑️  Snapshots to delete: ${Number(toDeleteCount).toLocaleString()}\n`);

  if (Number(toDeleteCount) === 0) {
    console.log('✅ No old snapshots to delete!');
    return;
  }

  // Delete in batches by date ranges (one day at a time, going backwards)
  let deletedTotal = 0;
  const MAX_DAYS_BACK = 60; // Go back up to 60 days
  
  for (let daysBack = 1; daysBack <= MAX_DAYS_BACK; daysBack++) {
    const dayCutoff = new Date(now);
    dayCutoff.setDate(dayCutoff.getDate() - daysBack);
    dayCutoff.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(dayCutoff);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const dayCutoffISO = dayCutoff.toISOString();
    const nextDayISO = nextDay.toISOString();
    
    // Count for this day
    const dayCountResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=gte.${dayCutoffISO}&recorded_at=lt.${nextDayISO}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );

    if (!dayCountResponse.ok) continue;

    const dayCount = dayCountResponse.headers.get('content-range')?.split('/')[1] || '0';
    const dayCountNum = Number(dayCount);
    
    if (dayCountNum === 0) {
      continue;
    }
    
    console.log(`Day ${daysBack}: ${dayCountNum.toLocaleString()} snapshots...`);
    
    // Delete in batches
    const BATCH_SIZE = 1000;
    let offset = 0;
    let dayDeleted = 0;
    
    while (dayDeleted < dayCountNum) {
      const batchResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=gte.${dayCutoffISO}&recorded_at=lt.${nextDayISO}&limit=${BATCH_SIZE}&offset=${offset}`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      if (!batchResponse.ok) break;

      const batch = await batchResponse.json();
      if (batch.length === 0) break;

      const ids = batch.map((row: any) => row.id);
      
      // Delete in chunks of 100
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
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
        }
      }

      offset += BATCH_SIZE;
      
      if (batch.length < BATCH_SIZE) break;
    }
    
    console.log(`   ✅ Deleted ${dayDeleted.toLocaleString()} (Total: ${deletedTotal.toLocaleString()})\n`);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\n✅ Aggressive cleanup complete!`);
  console.log(`   Total deleted: ${deletedTotal.toLocaleString()} snapshots\n`);

  // Final count
  const finalResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    }
  );

  const finalCount = finalResponse.headers.get('content-range')?.split('/')[1] || 'unknown';
  console.log(`📊 Final snapshot count: ${Number(finalCount).toLocaleString()}`);
  console.log(`\n💡 Run VACUUM in Supabase SQL Editor to reclaim space:`);
  console.log(`   VACUUM ANALYZE public.market_snapshots;\n`);
}

aggressiveCleanup().catch(console.error);

