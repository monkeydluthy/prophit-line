import { MarketResult } from '@/types';

const API_URL = 'https://api.manifold.markets/v0';

export async function searchManifoldMarkets(
  query: string
): Promise<MarketResult[]> {
  try {
    // Manifold Markets Public API
    // https://docs.manifold.markets/api#get-v0search-markets
    const response = await fetch(
      `${API_URL}/search-markets?term=${encodeURIComponent(query)}&limit=20`
    );

    if (!response.ok) {
      console.error('Manifold API error:', response.statusText);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((market: any) => mapManifoldMarket(market));
  } catch (error) {
    console.error('Manifold search error:', error);
    return [];
  }
}

export async function getManifoldTopMarkets(
  limit: number = 60
): Promise<MarketResult[]> {
  try {
    const response = await fetch(
      `${API_URL}/markets?limit=${limit}&sort=24hr_vol`
    );

    if (!response.ok) {
      console.error('Manifold top API error:', response.statusText);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((market: any) => mapManifoldMarket(market));
  } catch (error) {
    console.error('Manifold top error:', error);
    return [];
  }
}

export async function getManifoldTrendingMarkets(
  limit: number = 200
): Promise<MarketResult[]> {
  try {
    const cappedLimit = Math.min(limit, 200);
    const response = await fetch(`${API_URL}/markets?limit=${cappedLimit}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Manifold trending API error:', response.statusText);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    data.sort(
      (a: any, b: any) =>
        (b.volume24Hours || b.volume || 0) - (a.volume24Hours || a.volume || 0)
    );

    return data.map((market: any) => mapManifoldMarket(market));
  } catch (error) {
    console.error('Manifold trending fetch error:', error);
    return [];
  }
}

export async function getManifoldMarket(
  id: string
): Promise<MarketResult | null> {
  try {
    const response = await fetch(`${API_URL}/market/${id}`);
    if (!response.ok) return null;
    const market = await response.json();
    return mapManifoldMarket(market);
  } catch (error) {
    console.error('Manifold get error:', error);
    return null;
  }
}

export async function getManifoldHistory(id: string): Promise<any[]> {
  try {
    // Fetch bets to reconstruct history
    const response = await fetch(`${API_URL}/bets?contractId=${id}&limit=1000`);

    if (!response.ok) return [];

    const bets = await response.json();

    if (!Array.isArray(bets)) return [];

    // Sort by time
    bets.sort((a: any, b: any) => a.createdTime - b.createdTime);

    // Filter/Downsample?
    // For now return all points (probAfter is the probability after the bet)
    return bets.map((b: any) => ({
      time: b.createdTime,
      value: (b.probAfter || b.probBefore || 0) * 100,
    }));
  } catch (error) {
    console.error('Manifold history error:', error);
    return [];
  }
}

function mapManifoldMarket(market: any): MarketResult {
  const prob = market.probability || 0.5;
  let outcomes = [];
  let childMarkets: any[] = [];

  if (market.outcomeType === 'BINARY') {
    outcomes = [
      {
        name: 'Yes',
        percentage: Math.round(prob * 100),
        color: 'green',
        price: prob,
      },
      {
        name: 'No',
        percentage: Math.round((1 - prob) * 100),
        color: 'red',
        price: 1 - prob,
      },
    ];
    // For binary markets, create a single child market
    childMarkets = [
      {
        name: market.question,
        shortName: market.question,
        yesPrice: Math.round(prob * 100),
        noPrice: Math.round((1 - prob) * 100),
        probability: Math.round(prob * 100),
        volume: 'M$' + formatNumber(market.volume || 0),
        liquidity: 'M$' + formatNumber(market.liquidity || 0),
        ticker: market.id,
      },
    ];
  } else if (market.outcomeType === 'MULTIPLE_CHOICE' && market.answers) {
    outcomes = market.answers
      .map((ans: any) => ({
        name: ans.text,
        percentage: Math.round(ans.probability * 100),
        color: 'blue',
        price: ans.probability,
      }))
      .sort((a: any, b: any) => b.percentage - a.percentage);
    
    // Map each answer as a child market
    childMarkets = market.answers.map((ans: any) => ({
      name: ans.text,
      shortName: ans.text,
      yesPrice: Math.round(ans.probability * 100),
      noPrice: Math.round((1 - ans.probability) * 100),
      probability: Math.round(ans.probability * 100),
      volume: 'M$' + formatNumber(market.volume || 0),
      liquidity: 'M$' + formatNumber(market.liquidity || 0),
      ticker: `${market.id}-${ans.id}`,
    })).sort((a: any, b: any) => {
      const probDiff = (b.probability || 0) - (a.probability || 0);
      if (probDiff !== 0) return probDiff;
      return 0;
    });
  } else {
    // Fallback or Pseudo-Numeric
    outcomes = [
      {
        name: 'Prediction',
        percentage: Math.round(prob * 100),
        color: 'green',
        price: prob,
      },
    ];
    childMarkets = [
      {
        name: market.question,
        shortName: market.question,
        yesPrice: Math.round(prob * 100),
        noPrice: Math.round((1 - prob) * 100),
        probability: Math.round(prob * 100),
        volume: 'M$' + formatNumber(market.volume || 0),
        liquidity: 'M$' + formatNumber(market.liquidity || 0),
        ticker: market.id,
      },
    ];
  }

  return {
    id: `manifold:${market.id}`,
    platform: 'Manifold',
    title: market.question,
    icon: '🟣', // Default Manifold icon/color emoji
    outcomes: outcomes,
    volume: 'M$' + formatNumber(market.volume || 0),
    liquidity: 'M$' + formatNumber(market.liquidity || 0), // Manifold often uses liquidity pool
    date: market.closeTime
      ? new Date(market.closeTime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'N/A',
    link: market.url,
    markets: childMarkets,
  };
}

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}
