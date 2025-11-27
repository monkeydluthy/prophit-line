import { MarketResult } from '@/types';

const API_URL = 'https://www.predictit.org/api/marketdata';

export async function searchPredictIt(query: string): Promise<MarketResult[]> {
  try {
    // PredictIt public API returns ALL markets at this endpoint.
    // We fetch all and filter.
    // Adding User-Agent to avoid potential blocking
    const response = await fetch(`${API_URL}/all/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProphitLine/1.0)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.warn(`PredictIt API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const markets = data.markets || [];

    const lowerQuery = query.toLowerCase();

    // If query is generic "trending" (used by homepage), return top markets by simple slice?
    // Or strict filter.
    // Let's stick to filter, but if query is "trending", we return top.

    let filtered = markets;
    if (query !== 'trending') {
      filtered = markets.filter(
        (m: any) =>
          m.name.toLowerCase().includes(lowerQuery) ||
          m.contracts.some((c: any) =>
            c.name.toLowerCase().includes(lowerQuery)
          )
      );
    }

    // Return top 5
    return filtered
      .slice(0, 20)
      .map((market: any) => mapPredictItMarket(market));
  } catch (error) {
    console.error('PredictIt search error:', error);
    return [];
  }
}

export async function getPredictItMarket(
  id: string
): Promise<MarketResult | null> {
  try {
    const response = await fetch(`${API_URL}/markets/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProphitLine/1.0)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const market = await response.json();
    return mapPredictItMarket(market);
  } catch (error) {
    console.error('PredictIt get error:', error);
    return null;
  }
}

export async function getPredictItTrendingMarkets(
  limit: number = 200
): Promise<MarketResult[]> {
  try {
    const response = await fetch(`${API_URL}/all/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProphitLine/1.0)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.warn(`PredictIt API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    const markets = data.markets || [];

    const sorted = markets
      .map((market: any) => ({
        market,
        volume: getPredictItVolume(market),
      }))
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, limit)
      .map((entry: any) => mapPredictItMarket(entry.market));

    return sorted;
  } catch (error) {
    console.error('PredictIt top error:', error);
    return [];
  }
}

export async function getPredictItHistory(id: string): Promise<any[]> {
  try {
    // 1. Fetch raw market to get contract ID
    // The ID passed is usually just the numeric ID (e.g. "7456"), but might be prefixed if not cleaned.
    const cleanId = id.replace('predictit:', '');

    const response = await fetch(`${API_URL}/markets/${cleanId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProphitLine/1.0)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) return [];
    const market = await response.json();

    // Use the first contract (usually the most relevant or "Yes")
    const contract = market.contracts?.[0];
    if (!contract) return [];

    // 2. Fetch Chart Data
    // Endpoint: https://www.predictit.org/api/Public/GetMarketChartData?marketId=...&contractId=...&timespan=90d
    const chartRes = await fetch(
      `https://www.predictit.org/api/Public/GetMarketChartData?marketId=${cleanId}&contractId=${contract.id}&timespan=90d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProphitLine/1.0)',
          Accept: 'application/json',
        },
      }
    );

    if (!chartRes.ok) return [];

    const data = await chartRes.json();

    if (!Array.isArray(data)) return [];

    return data.map((d: any) => ({
      time: new Date(d.date).getTime(),
      value: d.closePrice * 100,
    }));
  } catch (error) {
    console.error('PredictIt history error:', error);
    return [];
  }
}

function mapPredictItMarket(market: any): MarketResult {
  // Map contracts to outcomes
  const contracts = market.contracts || [];

  // PredictIt contracts are often independent Yes/No, or multi-outcome (one wins).
  // Usually 'lastTradePrice' is the cost of "Yes".

  const outcomes = contracts
    .map((c: any) => ({
      name: c.name,
      percentage: Math.round((c.bestBuyYesCost || c.lastTradePrice || 0) * 100),
      color: 'blue',
      price: c.bestBuyYesCost || c.lastTradePrice || 0,
    }))
    .sort((a: any, b: any) => b.percentage - a.percentage);

  // Assign semantic colors
  if (outcomes.length > 0) outcomes[0].color = 'green';
  if (outcomes.length > 1) outcomes[1].color = 'red';

  const totalVolume = getPredictItVolume(market);

  return {
    id: `predictit:${market.id}`,
    platform: 'PredictIt',
    title: market.name,
    icon: market.image || '🟥',
    outcomes: outcomes,
    volume: formatVolume(totalVolume),
    liquidity: 'N/A',
    date: contracts?.[0]?.dateEnd
      ? new Date(contracts[0].dateEnd).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'N/A',
    link: market.url,
  };
}

function getPredictItVolume(market: any): number {
  const contracts = market.contracts || [];
  return contracts.reduce(
    (sum: number, contract: any) => sum + (contract.totalSharesTraded || 0),
    0
  );
}

function formatVolume(value: number): string {
  if (!value) return 'N/A';
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
  return '$' + value.toFixed(0);
}
