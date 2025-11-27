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

    const payload = markets.map((market) => {
      const price = market.outcomes?.[0]?.price ?? null;
      const volumeValue =
        typeof market.volume === 'number'
          ? market.volume
          : parseVolume(market.volume ?? '0');

      const eventId = market.id.split(':').slice(1).join(':') || market.id;

      return {
        platform: market.platform,
        event_id: eventId,
        market_id: market.id,
        recorded_at: snapshotTime,
        price,
        volume: Number.isFinite(volumeValue) ? volumeValue : null,
        data: market,
      };
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
      throw new Error(`Supabase insert failed: ${response.status} ${text}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ inserted: payload.length }),
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

