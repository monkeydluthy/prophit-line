/**
 * Script to check database size and snapshot statistics
 * Run with: npx tsx scripts/check-db-size.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkDatabaseSize() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  try {
    console.log('📊 Checking database statistics...\n');

    // Get total snapshot count
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

    const totalCount = countResponse.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`Total snapshots: ${Number(totalCount).toLocaleString()}\n`);

    // Get date range
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
        const oldestDate = new Date(oldest[0].recorded_at);
        const newestDate = new Date(newest[0].recorded_at);
        const daysDiff = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`Date range:`);
        console.log(`  Oldest: ${oldestDate.toISOString()}`);
        console.log(`  Newest: ${newestDate.toISOString()}`);
        console.log(`  Span: ${daysDiff} days\n`);
      }
    }

    // Count by platform
    const platforms = ['Polymarket', 'Kalshi', 'PredictIt'];
    console.log('Snapshots by platform:');
    for (const platform of platforms) {
      const platformResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&platform=eq.${platform}&limit=1`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'count=exact',
          },
        }
      );
      const platformCount = platformResponse.headers.get('content-range')?.split('/')[1] || '0';
      console.log(`  ${platform}: ${Number(platformCount).toLocaleString()}`);
    }

    // Count snapshots older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oldResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=lt.${sevenDaysAgo.toISOString()}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact',
        },
      }
    );
    const oldCount = oldResponse.headers.get('content-range')?.split('/')[1] || '0';
    console.log(`\nSnapshots older than 7 days: ${Number(oldCount).toLocaleString()}`);
    console.log(`  (These can be safely deleted)\n`);

    // Estimate size (rough calculation)
    // Average snapshot size is hard to estimate via REST API
    // But we can check if data field is large
    const sampleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=data&limit=10`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (sampleResponse.ok) {
      const samples = await sampleResponse.json();
      if (samples.length > 0) {
        const avgDataSize = samples.reduce((sum: number, s: any) => {
          return sum + (s.data ? JSON.stringify(s.data).length : 0);
        }, 0) / samples.length;
        
        const estimatedTotalSize = (avgDataSize * Number(totalCount)) / (1024 * 1024); // MB
        console.log(`Estimated data size: ~${estimatedTotalSize.toFixed(2)} MB`);
        console.log(`  (Based on average JSONB data size)\n`);
      }
    }

    console.log('💡 To reduce database size:');
    console.log('   1. Run: supabase/migrations/003_cleanup_old_snapshots.sql in Supabase SQL Editor');
    console.log('   2. Or use: npx tsx scripts/cleanup-old-snapshots.ts');
    console.log('   3. Consider reducing KEEP_DAYS if you need more space\n');

  } catch (error) {
    console.error('Error checking database:', error);
    throw error;
  }
}

checkDatabaseSize().catch((error) => {
  console.error('Check failed:', error);
  process.exit(1);
});

