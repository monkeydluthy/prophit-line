import { getFrontPageMarkets, parseVolume } from '../../app/services/marketService';

const SNAPSHOT_LIMIT = Number(process.env.SNAPSHOT_LIMIT ?? '150');

const handler = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const markets = await getFrontPageMarkets(SNAPSHOT_LIMIT);
    const snapshotTime = new Date().toISOString();

    if (!markets.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No markets fetched to snapshot' }),
      };
    }

    // Create snapshots for each outcome (top 4-5 outcomes per market)
    const payload: any[] = [];
    
    markets.forEach((market) => {
      const volumeValue =
        typeof market.volume === 'number'
          ? market.volume
          : parseVolume(market.volume ?? '0');

      const eventId = market.id.split(':').slice(1).join(':') || market.id;
      
      // Get top 3 outcomes sorted by percentage (reduced from 5 to save Supabase writes)
      const topOutcomes = (market.outcomes || [])
        .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
        .slice(0, 3);

      // Create a snapshot record for each outcome
      topOutcomes.forEach((outcome, idx) => {
        payload.push({
          platform: market.platform,
          event_id: eventId,
          market_id: market.id,
          recorded_at: snapshotTime,
          price: outcome.price ?? null,
          volume: Number.isFinite(volumeValue) ? volumeValue : null,
          outcome_name: outcome.name || null,
          outcome_index: idx,
          outcome_price: outcome.price ?? null,
          outcome_percentage: outcome.percentage ?? null,
          data: market,
        });
      });
      
      // Also keep a record for backward compatibility (first outcome as main price)
      if (topOutcomes.length > 0) {
        payload.push({
          platform: market.platform,
          event_id: eventId,
          market_id: market.id,
          recorded_at: snapshotTime,
          price: topOutcomes[0].price ?? null,
          volume: Number.isFinite(volumeValue) ? volumeValue : null,
          outcome_name: null,
          outcome_index: null,
          outcome_price: null,
          outcome_percentage: null,
          data: market,
        });
      }
    });

    const response = await fetch(`${supabaseUrl}/rest/v1/market_snapshots`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Supabase insert failed: ${response.status}`);
      console.error('Error response:', text);
      console.error('Sample payload record:', JSON.stringify(payload[0], null, 2));
      
      // Check if it's a column error
      if (text.includes('column') || text.includes('does not exist')) {
        throw new Error(`Database columns missing. Please run migration: supabase/migrations/002_add_outcome_fields.sql. Error: ${text}`);
      }
      
      throw new Error(`Supabase insert failed: ${response.status} ${text}`);
    }

    const insertedCount = payload.length;
    const outcomesCount = payload.filter((p: any) => p.outcome_index !== null && p.outcome_index !== undefined).length;
    const marketsCount = new Set(payload.map((p: any) => p.market_id)).size;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        inserted: insertedCount,
        markets: marketsCount,
        outcomes: outcomesCount,
        message: `Inserted ${insertedCount} snapshots for ${marketsCount} markets (${outcomesCount} outcome-specific records)`,
      }),
    };
  } catch (error) {
    console.error('Snapshot collector error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Snapshot collector failed' }),
    };
  }
};

export { handler };

