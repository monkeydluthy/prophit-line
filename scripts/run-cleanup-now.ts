/**
 * Run cleanup immediately (for testing or manual execution)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DAYS_TO_KEEP = 20;

async function runCleanupNow() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`🧹 Running cleanup now (keeping last ${DAYS_TO_KEEP} days)...\n`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/cleanup_old_market_snapshots`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ days_to_keep: DAYS_TO_KEEP }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Cleanup failed: ${response.status}`);
      console.error(errorText);
      
      if (response.status === 404) {
        console.error('\n⚠️  The cleanup function does not exist yet.');
        console.error('   Please run the SQL migration in Supabase SQL Editor:');
        console.error('   supabase/migrations/004_auto_cleanup_function.sql\n');
      }
      process.exit(1);
    }

    const result = await response.json();
    const cleanupResult = Array.isArray(result) ? result[0] : result;

    console.log('✅ Cleanup completed successfully!\n');
    console.log(`   Deleted: ${cleanupResult.deleted_count?.toLocaleString() || 0} snapshots`);
    console.log(`   Remaining: ${cleanupResult.remaining_count?.toLocaleString() || 0} snapshots`);
    console.log(`   Cutoff date: ${cleanupResult.cleanup_date || 'N/A'}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runCleanupNow();

