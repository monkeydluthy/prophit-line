import { ParsedPrediction, MarketResult } from '@/types';
import {
  searchPolymarket,
  getPolymarketEvent,
  getPolymarketHistory,
  getPolymarketTrending,
} from './polymarket';
import {
  searchKalshi,
  getKalshiMarket,
  getKalshiHistory,
  getKalshiTrendingEvents,
} from './kalshi';
import {
  searchPredictIt,
  getPredictItTrendingMarkets,
  getPredictItMarket,
} from './predictit';

export async function searchMarkets(
  parsedPrediction: ParsedPrediction
): Promise<MarketResult[]> {
  // Construct a search query from the parsed prediction
  const query = parsedPrediction.event || '';

  // Search platforms in parallel
  const [polymarketResults, kalshiResults, predictitResults] =
    await Promise.all([
      searchPolymarket(query),
      searchKalshi(query),
      searchPredictIt(query),
    ]);

  // Combine results
  const allMarkets: MarketResult[] = [
    ...polymarketResults,
    ...kalshiResults,
    ...predictitResults,
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
        return parseVolume(b.market.volume) - parseVolume(a.market.volume);
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
    finalResults.slice(0, 5).map((m) => ({
      title: m.title.substring(0, 30),
      vol: m.volume,
      parsed: parseVolume(m.volume),
    }))
  );

  return finalResults;
}

export async function getFrontPageMarkets(
  perPlatformLimit: number = 300
): Promise<MarketResult[]> {
  // For arbitrage, we need more markets to find matches
  // Kalshi supports up to 500, but Polymarket pagination can go higher
  // Use higher limits when requested limit is high (arbitrage use case)
  const isArbitrageFetch = perPlatformLimit >= 1000;
  const kalshiLimit = isArbitrageFetch ? 500 : Math.min(perPlatformLimit, 500);
  const polyLimit = isArbitrageFetch ? Math.min(perPlatformLimit, 2000) : Math.min(perPlatformLimit, 500);
  const predictitLimit = Math.min(perPlatformLimit, 50);

  const [polymarketTrending, kalshiTrending, predictitTrending] =
    await Promise.all([
      getPolymarketTrending(polyLimit),
      getKalshiTrendingEvents(kalshiLimit),
      getPredictItTrendingMarkets(predictitLimit),
    ]);

  console.log('FrontPage counts', {
    polymarket: polymarketTrending.length,
    kalshi: kalshiTrending.length,
    predictit: predictitTrending.length,
  });

  // Sort each platform's markets by volume separately
  const sortedByPlatform = {
    Polymarket: polymarketTrending.sort(
      (a, b) => parseVolume(b.volume) - parseVolume(a.volume)
    ),
    Kalshi: kalshiTrending.sort(
      (a, b) => parseVolume(b.volume) - parseVolume(a.volume)
    ),
    PredictIt: predictitTrending.sort(
      (a, b) => parseVolume(b.volume) - parseVolume(a.volume)
    ),
  };

  // Deduplicate within each platform
  const dedupedByPlatform = {
    Polymarket: deduplicateMarkets(sortedByPlatform.Polymarket),
    Kalshi: deduplicateMarkets(sortedByPlatform.Kalshi),
    PredictIt: deduplicateMarkets(sortedByPlatform.PredictIt),
  };

  // Combine all markets and shuffle for true randomization
  const allMarkets: MarketResult[] = [
    ...dedupedByPlatform.Polymarket,
    ...dedupedByPlatform.Kalshi,
    ...dedupedByPlatform.PredictIt,
  ];

  if (allMarkets.length === 0) return [];

  // Use a weighted shuffle to ensure good platform distribution
  // This ensures platforms are evenly distributed throughout the list
  const shuffled: MarketResult[] = [];

  const totalMarkets = allMarkets.length;
  let polyIndex = 0;
  let kalshiIndex = 0;
  let predictitIndex = 0;

  // Calculate target distribution (how often each platform should appear)
  const polyTarget = dedupedByPlatform.Polymarket.length / totalMarkets;
  const kalshiTarget = dedupedByPlatform.Kalshi.length / totalMarkets;
  const predictitTarget = dedupedByPlatform.PredictIt.length / totalMarkets;

  // Track how many of each platform we've added so far
  let polyAdded = 0;
  let kalshiAdded = 0;
  let predictitAdded = 0;

  // Shuffle with weighted selection to maintain distribution
  while (shuffled.length < totalMarkets) {
    const currentIndex = shuffled.length;
    const polyRatio = polyAdded / (currentIndex + 1);
    const kalshiRatio = kalshiAdded / (currentIndex + 1);
    const predictitRatio = predictitAdded / (currentIndex + 1);

    // Calculate which platform is most "behind" its target
    const polyDeficit = polyTarget - polyRatio;
    const kalshiDeficit = kalshiTarget - kalshiRatio;
    const predictitDeficit = predictitTarget - predictitRatio;

    // Build candidates array with weights
    const candidates: Array<{ platform: string; weight: number }> = [];

    if (polyIndex < dedupedByPlatform.Polymarket.length) {
      candidates.push({
        platform: 'Polymarket',
        weight: Math.max(0, polyDeficit) + 0.1,
      });
    }
    if (kalshiIndex < dedupedByPlatform.Kalshi.length) {
      candidates.push({
        platform: 'Kalshi',
        weight: Math.max(0, kalshiDeficit) + 0.1,
      });
    }
    if (predictitIndex < dedupedByPlatform.PredictIt.length) {
      candidates.push({
        platform: 'PredictIt',
        weight: Math.max(0, predictitDeficit) + 0.1,
      });
    }

    // Select platform based on weighted random choice
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedPlatform = candidates[0].platform;

    for (const candidate of candidates) {
      random -= candidate.weight;
      if (random <= 0) {
        selectedPlatform = candidate.platform;
        break;
      }
    }

    // Add market from selected platform
    if (
      selectedPlatform === 'Polymarket' &&
      polyIndex < dedupedByPlatform.Polymarket.length
    ) {
      shuffled.push(dedupedByPlatform.Polymarket[polyIndex]);
      polyIndex++;
      polyAdded++;
    } else if (
      selectedPlatform === 'Kalshi' &&
      kalshiIndex < dedupedByPlatform.Kalshi.length
    ) {
      shuffled.push(dedupedByPlatform.Kalshi[kalshiIndex]);
      kalshiIndex++;
      kalshiAdded++;
    } else if (
      selectedPlatform === 'PredictIt' &&
      predictitIndex < dedupedByPlatform.PredictIt.length
    ) {
      shuffled.push(dedupedByPlatform.PredictIt[predictitIndex]);
      predictitIndex++;
      predictitAdded++;
    }
  }

  // Final pass: do a few random swaps to break any remaining patterns
  for (let i = 0; i < Math.min(100, shuffled.length / 2); i++) {
    const idx1 = Math.floor(Math.random() * shuffled.length);
    const idx2 = Math.floor(Math.random() * shuffled.length);
    if (idx1 !== idx2) {
      [shuffled[idx1], shuffled[idx2]] = [shuffled[idx2], shuffled[idx1]];
    }
  }

  console.log('FrontPage mixing:', {
    total: shuffled.length,
    poly: dedupedByPlatform.Polymarket.length,
    kalshi: dedupedByPlatform.Kalshi.length,
    predictit: dedupedByPlatform.PredictIt.length,
    first20Platforms: shuffled.slice(0, 20).map((m) => m.platform),
    platformDistribution: {
      poly: shuffled.filter((m) => m.platform === 'Polymarket').length,
      kalshi: shuffled.filter((m) => m.platform === 'Kalshi').length,
      predictit: shuffled.filter((m) => m.platform === 'PredictIt').length,
    },
  });

  return shuffled;
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
  if (platform === 'kalshi') return getKalshiMarket(realId);
  if (platform === 'predictit') return getPredictItMarket(realId);

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
  if (platform === 'kalshi') return getKalshiHistory(realId);
  // PredictIt doesn't have history endpoints in the current implementation
  // Can be added later if needed

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
    select:
      'recorded_at,outcome_index,outcome_name,outcome_percentage,outcome_price',
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
    const outcomeMap = new Map<
      number,
      {
        index: number;
        name: string;
        data: Array<{ time: number; value: number }>;
      }
    >();

    data.forEach((row: any) => {
      if (row.outcome_index === null || row.outcome_index === undefined) return;

      const ts = Date.parse(row.recorded_at);
      let value = row.outcome_percentage;
      if (value === null || value === undefined) {
        value =
          row.outcome_price !== null ? Number(row.outcome_price) * 100 : null;
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
      .map((outcome) => ({
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

function computeRelevanceScore(query: string, market: MarketResult): number {
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
      outcomes.some((outcome) => outcome.name.toLowerCase().includes(token))
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
    select:
      'recorded_at,outcome_index,outcome_name,outcome_percentage,outcome_price,price',
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
        value =
          row.outcome_price !== null ? Number(row.outcome_price) * 100 : null;
      }
      if (!Number.isFinite(ts) || !Number.isFinite(value)) return;

      if (!outcomeGroups.has(row.outcome_index)) {
        outcomeGroups.set(row.outcome_index, []);
      }
      outcomeGroups
        .get(row.outcome_index)!
        .push({ time: ts, value: Number(value) });
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
