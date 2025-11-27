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

  const combined = [
    ...polymarketTrending,
    ...kalshiTrending,
    ...predictItTrending,
    ...manifoldTrending,
  ];

  const uniqueMap = new Map<string, MarketResult>();
  combined.forEach((market) => {
    if (!uniqueMap.has(market.id)) {
      uniqueMap.set(market.id, market);
    }
  });

  const sorted = Array.from(uniqueMap.values()).sort(
    (a, b) => parseVolume(b.volume) - parseVolume(a.volume)
  );

  return sorted;
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
