/**
 * Quick script to check if multi-outcome snapshots are being recorded
 * Run with: npx tsx scripts/check-snapshots.ts
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSnapshots() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  try {
    // Check if new columns exist
    console.log('Checking if outcome columns exist...\n');
    
    // Get a sample of recent snapshots
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=market_id,outcome_index,outcome_name,outcome_percentage,recorded_at&limit=20&order=recorded_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ Failed to fetch snapshots: ${response.status}`);
      const text = await response.text();
      console.error(text);
      
      if (response.status === 400 || response.status === 500) {
        console.error('\n⚠️  This might mean the database migration hasn\'t been run yet.');
        console.error('Please run the migration: supabase/migrations/002_add_outcome_fields.sql');
      }
      return;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('⚠️  No snapshots found. The collector may not have run yet.');
      return;
    }

    console.log(`✅ Found ${data.length} recent snapshots\n`);

    // Check if we have multi-outcome records
    const withOutcomes = data.filter((s: any) => s.outcome_index !== null && s.outcome_index !== undefined);
    const withoutOutcomes = data.filter((s: any) => s.outcome_index === null || s.outcome_index === undefined);

    console.log(`📊 Snapshot breakdown:`);
    console.log(`   - With outcome_index: ${withOutcomes.length}`);
    console.log(`   - Without outcome_index: ${withoutOutcomes.length}\n`);

    if (withOutcomes.length === 0) {
      console.log('⚠️  No multi-outcome snapshots found.');
      console.log('   This could mean:');
      console.log('   1. The migration hasn\'t been run');
      console.log('   2. The snapshot collector hasn\'t run since the code update');
      console.log('   3. Markets don\'t have multiple outcomes\n');
      
      // Check column names
      const sample = data[0];
      console.log('Sample snapshot keys:', Object.keys(sample));
      return;
    }

    // Group by market_id to see how many outcomes per market
    const byMarket: Record<string, any[]> = {};
    withOutcomes.forEach((s: any) => {
      if (!byMarket[s.market_id]) {
        byMarket[s.market_id] = [];
      }
      byMarket[s.market_id].push(s);
    });

    console.log(`📈 Markets with multi-outcome snapshots: ${Object.keys(byMarket).length}\n`);
    
    // Show sample
    const sampleMarketId = Object.keys(byMarket)[0];
    const sampleMarket = byMarket[sampleMarketId];
    
    console.log(`Sample market: ${sampleMarketId}`);
    console.log(`  Outcomes recorded: ${sampleMarket.length}`);
    sampleMarket.forEach((s: any) => {
      console.log(`    - Index ${s.outcome_index}: ${s.outcome_name || 'unnamed'} (${s.outcome_percentage}%)`);
    });

  } catch (error) {
    console.error('Error checking snapshots:', error);
  }
}

checkSnapshots();










