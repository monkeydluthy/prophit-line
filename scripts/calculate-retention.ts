/**
 * Calculate how many days of data can be kept under the 0.5 GB limit
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function calculateRetention() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('📊 Calculating optimal retention period...\n');

  try {
    // Get total count
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
    const totalNum = Number(totalCount);

    console.log(`Total snapshots: ${totalNum.toLocaleString()}\n`);

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

    if (!oldestResponse.ok || !newestResponse.ok) {
      console.error('Failed to get date range');
      return;
    }

    const oldest = await oldestResponse.json();
    const newest = await newestResponse.json();

    if (oldest.length === 0 || newest.length === 0) {
      console.log('No snapshots found');
      return;
    }

    const oldestDate = new Date(oldest[0].recorded_at);
    const newestDate = new Date(newest[0].recorded_at);
    const daysSpan = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Date range: ${oldestDate.toISOString().split('T')[0]} to ${newestDate.toISOString().split('T')[0]}`);
    console.log(`Span: ${daysSpan} days\n`);

    // Calculate snapshots per day (average)
    const snapshotsPerDay = totalNum / daysSpan;
    console.log(`Average snapshots per day: ${Math.round(snapshotsPerDay).toLocaleString()}\n`);

    // Estimate size per snapshot
    // Sample a few snapshots to estimate average size
    const sampleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/market_snapshots?select=data,id&limit=100`,
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
        const totalSize = samples.reduce((sum: number, s: any) => {
          // Estimate JSONB size (rough: JSON string length * 1.2 for overhead)
          const jsonSize = s.data ? JSON.stringify(s.data).length : 0;
          // Add overhead for other columns (id, platform, timestamps, etc.) ~200 bytes
          return sum + (jsonSize * 1.2 + 200);
        }, 0);

        const avgSizeBytes = totalSize / samples.length;
        const avgSizeKB = avgSizeBytes / 1024;
        const avgSizeMB = avgSizeKB / 1024;

        console.log(`Estimated average snapshot size: ${avgSizeKB.toFixed(2)} KB (${avgSizeMB.toFixed(4)} MB)\n`);

        // Current total estimated size
        const currentTotalMB = (avgSizeBytes * totalNum) / (1024 * 1024);
        const currentTotalGB = currentTotalMB / 1024;

        console.log(`Current estimated total size: ${currentTotalGB.toFixed(2)} GB (${currentTotalMB.toFixed(2)} MB)\n`);

        // Target: 0.5 GB = 512 MB
        const targetMB = 450; // Use 450 MB to leave some headroom (0.5 GB = 512 MB, but leave buffer)
        const targetBytes = targetMB * 1024 * 1024;

        // Calculate how many snapshots fit in target
        const maxSnapshots = Math.floor(targetBytes / avgSizeBytes);

        // Calculate how many days that represents
        const maxDays = Math.floor(maxSnapshots / snapshotsPerDay);

        console.log('=' .repeat(60));
        console.log('📈 RETENTION CALCULATION');
        console.log('=' .repeat(60));
        console.log(`\nTarget limit: 0.5 GB (450 MB buffer)\n`);
        console.log(`Max snapshots that fit: ${maxSnapshots.toLocaleString()}`);
        console.log(`Max days to keep: ~${maxDays} days\n`);

        // Show breakdown for different retention periods
        console.log('📅 Data size by retention period:\n');
        
        const retentionOptions = [1, 3, 7, 14, 30, maxDays];
        
        for (const days of retentionOptions) {
          if (days > daysSpan) continue;
          
          const snapshotsForDays = Math.floor(snapshotsPerDay * days);
          const sizeMB = (avgSizeBytes * snapshotsForDays) / (1024 * 1024);
          const sizeGB = sizeMB / 1024;
          const fitsInLimit = sizeMB < targetMB;
          
          console.log(`  ${days} day${days !== 1 ? 's' : ''}: ${snapshotsForDays.toLocaleString()} snapshots = ${sizeGB.toFixed(2)} GB (${sizeMB.toFixed(0)} MB) ${fitsInLimit ? '✅' : '❌'}`);
        }

        console.log('\n' + '=' .repeat(60));
        console.log(`💡 RECOMMENDATION: Keep ${Math.min(maxDays, 7)}-${maxDays} days of data`);
        console.log(`   This gives you ~${maxSnapshots.toLocaleString()} snapshots while staying under 0.5 GB`);
        console.log('=' .repeat(60) + '\n');

        // Calculate current snapshot distribution by day
        console.log('📊 Recent days snapshot counts:\n');
        const now = new Date();
        for (let daysBack = 0; daysBack < Math.min(7, daysSpan); daysBack++) {
          const dayStart = new Date(now);
          dayStart.setDate(dayStart.getDate() - daysBack);
          dayStart.setHours(0, 0, 0, 0);
          
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          
          const dayCountResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/market_snapshots?select=id&recorded_at=gte.${dayStart.toISOString()}&recorded_at=lt.${dayEnd.toISOString()}&limit=1`,
            {
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact',
              },
            }
          );

          if (dayCountResponse.ok) {
            const dayCount = dayCountResponse.headers.get('content-range')?.split('/')[1] || '0';
            const dayCountNum = Number(dayCount);
            const dayLabel = daysBack === 0 ? 'Today' : `${daysBack} day${daysBack !== 1 ? 's' : ''} ago`;
            console.log(`  ${dayLabel} (${dayStart.toISOString().split('T')[0]}): ${dayCountNum.toLocaleString()} snapshots`);
          }
        }

        console.log('\n');

      }
    }

  } catch (error) {
    console.error('Error calculating retention:', error);
  }
}

calculateRetention().catch(console.error);


