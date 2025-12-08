import { MarketResult } from '@/types';
import { ArbitrageOpportunity } from './arbitrageService';

/**
 * Matchr API Service
 * 
 * NOTE: This uses Matchr's public API endpoint. However:
 * - This is NOT an official public API - it's their internal endpoint
 * - May be blocked/rate-limited at any time
 * - Legal/ToS concerns - using internal endpoints may violate terms
 * - Better approach: Build our own matching (which we're doing)
 * 
 * This is provided as a reference/fallback only.
 */

const MATCHR_API_BASE = 'https://www.matchr.xyz/api/v2';

export interface MatchrMarket {
  marketId: string;
  title: string;
  eventTitle: string;
  eventSlug: string;
  eventImage: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  volume24hr: number;
}

export interface MatchrMatch {
  matchId: number;
  similarityScore: number;
  confidenceTier: string;
  polymarket: MatchrMarket;
  kalshi: MatchrMarket;
  spread: number;
  spreadPercent: number;
  combinedVolume: number;
  combinedVolume24hr: number;
}

export interface MatchrResponse {
  success: boolean;
  data: {
    matches: MatchrMatch[];
    pagination: {
      offset: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
    stats: {
      totalMatches: number;
      avgSpread: number;
      maxSpread: number;
      matchesOver5Percent: number;
      matchesOver3Percent: number;
      totalVolume: number;
      totalVolume24hr: number;
    };
  };
  duration: number;
}

/**
 * Fetch arbitrage opportunities from Matchr's API
 * 
 * WARNING: This uses their internal endpoint. Not recommended for production.
 * Better to use our own matching system.
 */
export async function getMatchrOpportunities(
  limit: number = 20,
  minSpread: number = 0.5,
  minVolume: number = 5000,
  sort: 'spread' | 'volume' = 'spread'
): Promise<MatchrResponse> {
  try {
    const url = new URL(`${MATCHR_API_BASE}/matches/top-spreads`);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', '0');
    url.searchParams.set('sort', sort);
    url.searchParams.set('min_volume', minVolume.toString());
    // Note: Their API doesn't seem to have min_spread param based on actual response

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ProphitLine/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Matchr API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Matchr Service] Error fetching opportunities:', error);
    throw error;
  }
}

/**
 * Convert Matchr match format to our ArbitrageOpportunity format
 */
export function convertMatchrToOpportunity(match: MatchrMatch): ArbitrageOpportunity | null {
  // Determine which is best buy (lower yes price) and best sell (higher yes price)
  const polyPrice = match.polymarket.yesPrice;
  const kalshiPrice = match.kalshi.yesPrice;
  
  let bestBuy, bestSell;
  if (polyPrice < kalshiPrice) {
    // Buy on Polymarket (cheaper), sell on Kalshi (more expensive)
    bestBuy = {
      market: {
        id: match.polymarket.marketId,
        title: match.polymarket.title,
        platform: 'Polymarket' as MarketResult['platform'],
        link: `https://polymarket.com/event/${match.polymarket.eventSlug}`,
        date: 'N/A',
        volume: match.polymarket.volume.toString(),
        liquidity: '0',
        outcomes: [
          { name: 'Yes', price: polyPrice, percentage: polyPrice * 100 },
          { name: 'No', price: match.polymarket.noPrice, percentage: match.polymarket.noPrice * 100 },
        ],
      } as MarketResult,
      price: polyPrice,
      platform: 'Polymarket',
    };
    bestSell = {
      market: {
        id: match.kalshi.marketId,
        title: match.kalshi.title,
        platform: 'Kalshi' as MarketResult['platform'],
        link: `https://kalshi.com/trade-api/v2/events/${match.kalshi.eventSlug}`,
        date: 'N/A',
        volume: match.kalshi.volume.toString(),
        liquidity: '0',
        outcomes: [
          { name: 'Yes', price: kalshiPrice, percentage: kalshiPrice * 100 },
          { name: 'No', price: match.kalshi.noPrice, percentage: match.kalshi.noPrice * 100 },
        ],
      } as MarketResult,
      price: kalshiPrice,
      platform: 'Kalshi',
    };
  } else {
    // Buy on Kalshi (cheaper), sell on Polymarket (more expensive)
    bestBuy = {
      market: {
        id: match.kalshi.marketId,
        title: match.kalshi.title,
        platform: 'Kalshi' as MarketResult['platform'],
        link: `https://kalshi.com/trade-api/v2/events/${match.kalshi.eventSlug}`,
        date: 'N/A',
        volume: match.kalshi.volume.toString(),
        liquidity: '0',
        outcomes: [
          { name: 'Yes', price: kalshiPrice, percentage: kalshiPrice * 100 },
          { name: 'No', price: match.kalshi.noPrice, percentage: match.kalshi.noPrice * 100 },
        ],
      } as MarketResult,
      price: kalshiPrice,
      platform: 'Kalshi',
    };
    bestSell = {
      market: {
        id: match.polymarket.marketId,
        title: match.polymarket.title,
        platform: 'Polymarket' as MarketResult['platform'],
        link: `https://polymarket.com/event/${match.polymarket.eventSlug}`,
        date: 'N/A',
        volume: match.polymarket.volume.toString(),
        liquidity: '0',
        outcomes: [
          { name: 'Yes', price: polyPrice, percentage: polyPrice * 100 },
          { name: 'No', price: match.polymarket.noPrice, percentage: match.polymarket.noPrice * 100 },
        ],
      } as MarketResult,
      price: polyPrice,
      platform: 'Polymarket',
    };
  }

  return {
    id: `matchr-${match.matchId}`,
    title: match.polymarket.eventTitle || match.kalshi.eventTitle,
    spread: match.spread * 100, // Convert to cents
    maxSpread: match.spreadPercent,
    markets: [bestBuy.market, bestSell.market],
    bestBuy,
    bestSell,
    totalVolume: match.combinedVolume,
    avgLiquidity: 0, // Matchr doesn't provide liquidity
  };
}

