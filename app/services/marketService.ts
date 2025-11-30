import { ParsedPrediction, MarketResult } from '@/types';
import {
  searchManifoldMarkets,
  getManifoldMarket,
  getManifoldHistory,
  getManifoldTrendingMarkets,
} from './manifold';
import {
  searchPolymarket,
  getPolymarketEvent,
  getPolymarketHistory,
  getPolymarketTrending,
} from './polymarket';
import {
  searchPredictIt,
  getPredictItMarket,
  getPredictItHistory,
  getPredictItTrendingMarkets,
} from './predictit';
import {
  searchKalshi,
  getKalshiMarket,
  getKalshiHistory,
  getKalshiTrendingEvents,
} from './kalshi';

export async function searchMarkets(
  parsedPrediction: ParsedPrediction
): Promise<MarketResult[]> {
  // Construct a search query from the parsed prediction
  const query = parsedPrediction.event || '';

  // Search platforms in parallel
  const [manifoldResults, polymarketResults, predictItResults, kalshiResults] =
    await Promise.all([
      searchManifoldMarkets(query),
      searchPolymarket(query),
      searchPredictIt(query),
      searchKalshi(query),
    ]);

  // Combine results
  const allMarkets: MarketResult[] = [
    ...polymarketResults,
    ...kalshiResults,
    ...predictItResults,
    ...manifoldResults,
  ];

  const volumeSorted = [...allMarkets].sort(
    (a, b) => parseVolume(b.volume) - parseVolume(a.volume)
  );

  const lowerQuery = query.toLowerCase().trim();
  let finalResults = volumeSorted;

  if (lowerQuery.length > 0) {
    const scored = allMarkets
      .map((market) => ({
        market,
        score: computeRelevanceScore(lowerQuery, market),
      }))
      .filter((entry) => entry.score > 0);

    if (scored.length > 0) {
      const scoredSorted = scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (
          parseVolume(b.market.volume) - parseVolume(a.market.volume)
        );
      });

      const scoredMarkets = scoredSorted.map((entry) => entry.market);
      const seen = new Set(scoredMarkets.map((market) => market.id));
      const fillers = volumeSorted.filter((market) => !seen.has(market.id));

      finalResults = [...scoredMarkets, ...fillers];
    }
  }

  // Debug: Log top 5 volumes
  console.log(
    'Top 5 volumes:',
    finalResults
      .slice(0, 5)
      .map((m) => ({
        title: m.title.substring(0, 30),
        vol: m.volume,
        parsed: parseVolume(m.volume),
      }))
  );

  return finalResults;
}

export async function getFrontPageMarkets(
  perPlatformLimit: number = 150
): Promise<MarketResult[]> {
  const [
    polymarketTrending,
    kalshiTrending,
    predictItTrending,
    manifoldTrending,
  ] = await Promise.all([
    getPolymarketTrending(perPlatformLimit),
    getKalshiTrendingEvents(perPlatformLimit),
    getPredictItTrendingMarkets(perPlatformLimit),
    getManifoldTrendingMarkets(perPlatformLimit),
  ]);

  console.log('FrontPage counts', {
    polymarket: polymarketTrending.length,
    kalshi: kalshiTrending.length,
    predictIt: predictItTrending.length,
    manifold: manifoldTrending.length,
  });

  // Sort each platform's markets by volume separately
  const sortedByPlatform = {
    Polymarket: polymarketTrending.sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume)),
    Kalshi: kalshiTrending.sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume)),
    PredictIt: predictItTrending.sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume)),
    Manifold: manifoldTrending.sort((a, b) => parseVolume(b.volume) - parseVolume(a.volume)),
  };

  // Deduplicate within each platform
  const dedupedByPlatform = {
    Polymarket: deduplicateMarkets(sortedByPlatform.Polymarket),
    Kalshi: deduplicateMarkets(sortedByPlatform.Kalshi),
    PredictIt: deduplicateMarkets(sortedByPlatform.PredictIt),
    Manifold: deduplicateMarkets(sortedByPlatform.Manifold),
  };

  // Interleave platforms round-robin style
  const interleaved: MarketResult[] = [];
  const maxLength = Math.max(
    dedupedByPlatform.Polymarket.length,
    dedupedByPlatform.Kalshi.length,
    dedupedByPlatform.PredictIt.length,
    dedupedByPlatform.Manifold.length
  );

  for (let i = 0; i < maxLength; i++) {
    if (dedupedByPlatform.Polymarket[i]) interleaved.push(dedupedByPlatform.Polymarket[i]);
    if (dedupedByPlatform.Kalshi[i]) interleaved.push(dedupedByPlatform.Kalshi[i]);
    if (dedupedByPlatform.PredictIt[i]) interleaved.push(dedupedByPlatform.PredictIt[i]);
    if (dedupedByPlatform.Manifold[i]) interleaved.push(dedupedByPlatform.Manifold[i]);
  }

  return interleaved;
}

function deduplicateMarkets(markets: MarketResult[]): MarketResult[] {
  const uniqueMap = new Map<string, MarketResult>();
  markets.forEach((market) => {
    if (!uniqueMap.has(market.id)) {
      uniqueMap.set(market.id, market);
    }
  });
  return Array.from(uniqueMap.values());
}

export async function getMarket(id: string): Promise<MarketResult | null> {
  const parts = id.split(':');
  if (parts.length < 2) return null;

  const platform = parts[0];
  const realId = parts.slice(1).join(':');

  if (platform === 'polymarket') return getPolymarketEvent(realId);
  if (platform === 'manifold') return getManifoldMarket(realId);
  if (platform === 'predictit') return getPredictItMarket(realId);
  if (platform === 'kalshi') return getKalshiMarket(realId);

  return null;
}

export async function getMarketHistory(id: string): Promise<any[]> {
  const snapshotHistory = await getSnapshotHistory(id);
  if (snapshotHistory && snapshotHistory.length > 0) {
    return snapshotHistory;
  }

  const parts = id.split(':');
  if (parts.length < 2) return [];

  const platform = parts[0];
  const realId = parts.slice(1).join(':');

  if (platform === 'polymarket') return getPolymarketHistory(realId);
  if (platform === 'manifold') return getManifoldHistory(realId);
  if (platform === 'kalshi') return getKalshiHistory(realId);
  if (platform === 'predictit') return getPredictItHistory(realId);

  return [];
}

export async function getMarketHistoryMultiOutcome(id: string): Promise<{
  outcomes: Array<{
    index: number;
    name: string;
    data: Array<{ time: number; value: number }>;
  }>;
}> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { outcomes: [] };
  }

  // Fetch outcome-specific snapshots
  const query = new URLSearchParams({
    select: 'recorded_at,outcome_index,outcome_name,outcome_percentage,outcome_price',
    market_id: `eq.${id}`,
    outcome_index: `not.is.null`,
    order: 'recorded_at.asc,outcome_index.asc',
    limit: '2500',
  });

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/market_snapshots?${query.toString()}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.warn('Multi-outcome snapshot fetch failed', response.status);
      return { outcomes: [] };
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { outcomes: [] };
    }

    // Group data by outcome_index
    const outcomeMap = new Map<number, {
      index: number;
      name: string;
      data: Array<{ time: number; value: number }>;
    }>();

    data.forEach((row: any) => {
      if (row.outcome_index === null || row.outcome_index === undefined) return;
      
      const ts = Date.parse(row.recorded_at);
      let value = row.outcome_percentage;
      if (value === null || value === undefined) {
        value = row.outcome_price !== null ? Number(row.outcome_price) * 100 : null;
      }
      if (!Number.isFinite(ts) || !Number.isFinite(value)) return;

      if (!outcomeMap.has(row.outcome_index)) {
        outcomeMap.set(row.outcome_index, {
          index: row.outcome_index,
          name: row.outcome_name || `Outcome ${row.outcome_index + 1}`,
          data: [],
        });
      }

      outcomeMap.get(row.outcome_index)!.data.push({
        time: ts,
        value: Number(value),
      });
    });

    // Sort by index and return as array
    const outcomes = Array.from(outcomeMap.values())
      .sort((a, b) => a.index - b.index)
      .map(outcome => ({
        ...outcome,
        data: outcome.data.sort((a, b) => a.time - b.time),
      }));

    return { outcomes };
  } catch (error) {
    console.error('Multi-outcome history error', error);
    return { outcomes: [] };
  }
}

export function parseVolume(volStr: string | number): number {
  if (typeof volStr === 'number') return volStr;
  if (!volStr || volStr === 'N/A') return 0;

  const str = volStr.toString().trim();

  // Handle formats like "$35 vol", "$1.2M", "M$ 500K", "300K Shares", etc.
  // Extract number and suffix (K, M, B)
  const match = str.match(/([\d.]+)\s*([KMB]?)/i);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;

  const suffix = match[2].toUpperCase();
  let multiplier = 1;
  if (suffix === 'B') multiplier = 1e9;
  else if (suffix === 'M') multiplier = 1e6;
  else if (suffix === 'K') multiplier = 1e3;

  return num * multiplier;
}

function computeRelevanceScore(
  query: string,
  market: MarketResult
): number {
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const title = (market.title || '').toLowerCase();
  const platform = (market.platform || '').toLowerCase();
  const outcomes = market.outcomes || [];

  let score = 0;

  tokens.forEach((token) => {
    if (title.startsWith(token)) score += 5;
    if (title.includes(token)) score += 3;
    if (platform.includes(token)) score += 1;
    if (
      outcomes.some((outcome) =>
        outcome.name.toLowerCase().includes(token)
      )
    ) {
      score += 2;
    }
  });

  return score;
}

async function getSnapshotHistory(
  marketId: string
): Promise<{ time: number; value: number }[] | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  // Fetch outcome-specific snapshots
  const query = new URLSearchParams({
    select: 'recorded_at,outcome_index,outcome_name,outcome_percentage,outcome_price,price',
    market_id: `eq.${marketId}`,
    outcome_index: `not.is.null`, // Only get outcome-specific records
    order: 'recorded_at.asc,outcome_index.asc',
    limit: '2500', // Allow for multiple outcomes (500 * 5 outcomes)
  });

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/market_snapshots?${query.toString()}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.warn('Snapshot history fetch failed', response.status);
      // Fallback to old format (single price)
      return getSnapshotHistoryFallback(marketId, supabaseUrl, supabaseKey);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      // Fallback to old format
      return getSnapshotHistoryFallback(marketId, supabaseUrl, supabaseKey);
    }

    // Group data by outcome_index and convert to chart format
    const outcomeGroups = new Map<number, { time: number; value: number }[]>();
    
    data.forEach((row: any) => {
      if (row.outcome_index === null || row.outcome_index === undefined) return;
      
      const ts = Date.parse(row.recorded_at);
      // Use outcome_percentage if available, otherwise calculate from price
      let value = row.outcome_percentage;
      if (value === null || value === undefined) {
        value = row.outcome_price !== null ? Number(row.outcome_price) * 100 : null;
      }
      if (!Number.isFinite(ts) || !Number.isFinite(value)) return;
      
      if (!outcomeGroups.has(row.outcome_index)) {
        outcomeGroups.set(row.outcome_index, []);
      }
      outcomeGroups.get(row.outcome_index)!.push({ time: ts, value: Number(value) });
    });

    // Return as array of arrays (one per outcome) - frontend will handle rendering
    // For backward compatibility, return the first outcome's data as main array
    const outcomes = Array.from(outcomeGroups.entries())
      .sort(([a], [b]) => a - b) // Sort by outcome_index
      .map(([_, points]) => points);

    // Return first outcome's data for backward compatibility
    // The frontend will be updated to handle multi-outcome data
    return outcomes.length > 0 ? outcomes[0] : null;
  } catch (error) {
    console.error('Snapshot history error', error);
    return getSnapshotHistoryFallback(marketId, supabaseUrl, supabaseKey);
  }
}

async function getSnapshotHistoryFallback(
  marketId: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ time: number; value: number }[] | null> {
  const query = new URLSearchParams({
    select: 'recorded_at,price',
    market_id: `eq.${marketId}`,
    order: 'recorded_at.asc',
    limit: '500',
  });

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/market_snapshots?${query.toString()}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    return data
      .map((row: any) => {
        const ts = Date.parse(row.recorded_at);
        const value = Number(row.price);
        if (!Number.isFinite(ts) || !Number.isFinite(value)) return null;
        return { time: ts, value: value > 1 ? value : value * 100 };
      })
      .filter(Boolean) as { time: number; value: number }[];
  } catch (error) {
    return null;
  }
}
