/**
 * Alternative cleanup approach - creates SQL that can be run directly
 * Since REST API is timing out, this generates SQL you can run in Supabase SQL Editor
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const KEEP_DAYS = Number(process.env.KEEP_DAYS ?? '3');

async function generateCleanupSQL() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - KEEP_DAYS);
  const cutoffISO = cutoffDate.toISOString();

  console.log('📝 SQL Cleanup Script for Supabase SQL Editor\n');
  console.log('=' .repeat(60));
  console.log('\nCopy and paste this into Supabase SQL Editor:\n');
  console.log('-- Step 1: Check how many will be deleted');
  console.log(`SELECT COUNT(*) as snapshots_to_delete`);
  console.log(`FROM public.market_snapshots`);
  console.log(`WHERE recorded_at < '${cutoffISO}';\n`);
  
  console.log('-- Step 2: Delete old snapshots (this may take a while)');
  console.log(`DELETE FROM public.market_snapshots`);
  console.log(`WHERE recorded_at < '${cutoffISO}';\n`);
  
  console.log('-- Step 3: Reclaim disk space (run after deletion)');
  console.log(`VACUUM ANALYZE public.market_snapshots;\n`);
  
  console.log('-- Step 4: Check new table size');
  console.log(`SELECT`);
  console.log(`  pg_size_pretty(pg_total_relation_size('public.market_snapshots')) as total_size,`);
  console.log(`  pg_size_pretty(pg_relation_size('public.market_snapshots')) as table_size,`);
  console.log(`  COUNT(*) as snapshot_count`);
  console.log(`FROM public.market_snapshots;\n`);
  
  console.log('=' .repeat(60));
  console.log(`\n💡 This will delete snapshots older than ${KEEP_DAYS} days`);
  console.log(`   Cutoff date: ${cutoffISO}\n`);
  
  // Also try to create a function approach
  console.log('\n📝 Alternative: Create a cleanup function (run once, then call it):\n');
  console.log('-- Create the function:');
  console.log(`CREATE OR REPLACE FUNCTION cleanup_old_snapshots(days_to_keep INTEGER DEFAULT ${KEEP_DAYS})`);
  console.log(`RETURNS TABLE(deleted_count BIGINT)`);
  console.log(`LANGUAGE plpgsql`);
  console.log(`SECURITY DEFINER`);
  console.log(`AS $$`);
  console.log(`DECLARE`);
  console.log(`  deleted_count BIGINT;`);
  console.log(`BEGIN`);
  console.log(`  DELETE FROM public.market_snapshots`);
  console.log(`  WHERE recorded_at < NOW() - (days_to_keep || ' days')::INTERVAL;`);
  console.log(`  GET DIAGNOSTICS deleted_count = ROW_COUNT;`);
  console.log(`  RETURN QUERY SELECT deleted_count;`);
  console.log(`END;`);
  console.log(`$$;\n`);
  
  console.log('-- Then call it:');
  console.log(`SELECT * FROM cleanup_old_snapshots(${KEEP_DAYS});\n`);
  
  console.log('-- And reclaim space:');
  console.log(`VACUUM ANALYZE public.market_snapshots;\n`);
}

generateCleanupSQL();


