/**
 * Netlify Scheduled Function to automatically clean up old market snapshots
 * Runs daily to keep only the last 20 days of snapshots
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DAYS_TO_KEEP = 20; // Keep last 20 days

export const handler = async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase credentials' }),
      };
    }

    console.log(`[Cleanup] Starting automatic cleanup (keeping last ${DAYS_TO_KEEP} days)...`);

    // Call the cleanup function via Supabase RPC
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
      console.error(`[Cleanup] Failed: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Cleanup function not found. Please run migration: supabase/migrations/004_auto_cleanup_function.sql',
          }),
        };
      }
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Cleanup failed: ${errorText}` }),
      };
    }

    const result = await response.json();
    const cleanupResult = Array.isArray(result) ? result[0] : result;

    console.log(`[Cleanup] Success! Deleted ${cleanupResult.deleted_count} snapshots`);
    console.log(`[Cleanup] Remaining: ${cleanupResult.remaining_count} snapshots`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Cleaned up ${cleanupResult.deleted_count} old snapshots`,
        deleted_count: cleanupResult.deleted_count,
        remaining_count: cleanupResult.remaining_count,
        cutoff_date: cleanupResult.cleanup_date,
        days_kept: DAYS_TO_KEEP,
      }),
    };
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

