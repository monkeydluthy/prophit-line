/**
 * Force cleanup with VACUUM to reclaim disk space
 * This will delete old snapshots AND reclaim the disk space immediately
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

async function forceCleanupWithVacuum() {
  if (!SUPABASE_DB_URL) {
    console.error('❌ Missing SUPABASE_DB_URL in .env.local');
    console.error('   This is needed to run VACUUM directly.');
    console.error('   Format: postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres\n');
    process.exit(1);
  }

  console.log('🔧 Force cleanup with VACUUM...\n');
  console.log('⚠️  This requires direct database access.\n');

  // We can't run VACUUM via REST API, so we need to provide SQL
  console.log('📝 Run this SQL in Supabase SQL Editor to clean up and reclaim space:\n');
  console.log('=' .repeat(70));

  const daysToKeep = 20;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffISO = cutoffDate.toISOString();

  console.log(`-- Step 1: Delete snapshots older than ${daysToKeep} days (before ${cutoffISO.split('T')[0]})`);
  console.log(`DELETE FROM public.market_snapshots`);
  console.log(`WHERE recorded_at < NOW() - INTERVAL '${daysToKeep} days';`);
  console.log('\n');
  console.log('-- Step 2: Reclaim disk space (VERY IMPORTANT!)');
  console.log('VACUUM FULL public.market_snapshots;');
  console.log('\n');
  console.log('-- Step 3: Analyze the table');
  console.log('ANALYZE public.market_snapshots;');
  console.log('\n');
  console.log('-- Step 4: Check new size');
  console.log('SELECT');
  console.log('  pg_size_pretty(pg_total_relation_size(\'public.market_snapshots\')) as total_size,');
  console.log('  pg_size_pretty(pg_relation_size(\'public.market_snapshots\')) as table_size,');
  console.log('  COUNT(*) as snapshot_count');
  console.log('FROM public.market_snapshots;');

  console.log('=' .repeat(70));
  console.log('\n');

  // Also try via REST API to delete
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🗑️  Attempting to delete old snapshots via API...\n');
    
    try {
      const deleteResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/market_snapshots?recorded_at=lt.${cutoffISO}`,
        {
          method: 'DELETE',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal',
          },
        }
      );

      if (deleteResponse.ok) {
        const countHeader = deleteResponse.headers.get('content-range');
        console.log('✅ Delete request sent');
        console.log('   Note: You still need to run VACUUM to reclaim space!\n');
      } else {
        const errorText = await deleteResponse.text();
        console.log(`⚠️  Delete via REST API failed: ${deleteResponse.status}`);
        console.log(`   ${errorText}\n`);
        console.log('   You can delete using the SQL above instead.\n');
      }
    } catch (error) {
      console.log('⚠️  Could not delete via API (this is OK, use SQL instead)');
    }
  }

  console.log('💡 IMPORTANT:');
  console.log('   1. VACUUM FULL will lock the table briefly (usually seconds)');
  console.log('   2. This WILL reclaim the disk space');
  console.log('   3. After VACUUM, your database size should drop significantly\n');
}

forceCleanupWithVacuum().catch(console.error);


