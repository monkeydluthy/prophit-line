/**
 * Setup script to configure automatic daily cleanup
 * This will:
 * 1. Create the cleanup function in Supabase
 * 2. Set up a scheduled job (if possible)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupAutomaticCleanup() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔧 Setting up automatic cleanup...\n');

  // Read the SQL migration file
  const sqlPath = resolve(process.cwd(), 'supabase/migrations/004_auto_cleanup_function.sql');
  let sqlContent: string;
  
  try {
    sqlContent = readFileSync(sqlPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Could not read SQL file: ${sqlPath}`);
    console.error('Please ensure the migration file exists.');
    process.exit(1);
  }

  console.log('📝 SQL Migration Content:\n');
  console.log('=' .repeat(70));
  console.log(sqlContent);
  console.log('=' .repeat(70));
  console.log('\n');

  console.log('⚠️  NOTE: Supabase REST API does not support executing arbitrary SQL.');
  console.log('    You need to run this SQL manually in Supabase SQL Editor.\n');
  
  console.log('📋 Instructions:');
  console.log('1. Go to your Supabase Dashboard → SQL Editor');
  console.log('2. Copy the SQL above and paste it into the editor');
  console.log('3. Click "Run" to execute\n');

  console.log('✅ After running the SQL, the cleanup function will be created.\n');

  // Test if the function exists
  console.log('🧪 Testing if cleanup function exists...\n');
  
  try {
    const testResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/cleanup_old_market_snapshots`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ days_to_keep: 20 }),
      }
    );

    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Cleanup function already exists and is working!');
      console.log(`   Test result:`, result);
      console.log('\n');
    } else if (testResponse.status === 404) {
      console.log('❌ Cleanup function does not exist yet.');
      console.log('   Please run the SQL above in Supabase SQL Editor.\n');
    } else {
      const errorText = await testResponse.text();
      console.log(`⚠️  Function test returned: ${testResponse.status}`);
      console.log(`   ${errorText}\n`);
    }
  } catch (error) {
    console.log('⚠️  Could not test function (this is normal if it doesn\'t exist yet)');
    console.log(`   Error: ${error instanceof Error ? error.message : error}\n`);
  }

  // Show scheduling options
  console.log('📅 Scheduling Options:\n');
  console.log('The cleanup function will run automatically when called. Choose one:');
  console.log('\n1. Vercel Cron (if deployed on Vercel):');
  console.log('   - Already configured in vercel.json');
  console.log('   - Runs daily at 2 AM UTC');
  console.log('   - Deploy your app to activate\n');
  
  console.log('2. External Cron Service (e.g., cron-job.org):');
  console.log('   - URL: https://your-domain.com/api/cleanup-snapshots');
  console.log('   - Schedule: Daily at 2 AM UTC (or your preferred time)');
  console.log('   - Method: GET or POST\n');
  
  console.log('3. Manual Test (to verify it works):');
  console.log('   curl https://your-domain.com/api/cleanup-snapshots\n');

  console.log('💡 The cleanup will keep the last 20 days of snapshots automatically.\n');
}

setupAutomaticCleanup().catch(console.error);


