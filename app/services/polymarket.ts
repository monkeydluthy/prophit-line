import { MarketResult } from '@/types';

const API_URL = 'https://gamma-api.polymarket.com';
const CLOB_URL = 'https://clob.polymarket.com';

export async function searchPolymarket(query: string): Promise<MarketResult[]> {
  try {
    const directResponse = await fetch(
      `${API_URL}/events?q=${encodeURIComponent(
        query
      )}&limit=20&closed=false&order=volume`
    );

    const combinedEvents: any[] = [];

    if (directResponse.ok) {
      const directData = await directResponse.json();
      if (Array.isArray(directData)) {
        combinedEvents.push(...directData);
      }
    }

    const fallbackResponse = await fetch(
      `${API_URL}/events/pagination?limit=200&active=true&archived=false&closed=false&order=volume`
    );

    if (fallbackResponse.ok) {
      const fallbackJson = await fallbackResponse.json();
      const fallbackEvents = Array.isArray(fallbackJson?.data)
        ? fallbackJson.data
        : [];
      combinedEvents.push(...fallbackEvents);
    }

    const filtered = filterEventsByQuery(combinedEvents, query);

    const dedupedMap = new Map<string, any>();
    filtered.forEach((event) => {
      if (!dedupedMap.has(event.id)) {
        dedupedMap.set(event.id, event);
      }
    });

    return Array.from(dedupedMap.values())
      .slice(0, 40)
      .map((event: any) => mapPolymarketEvent(event));
  } catch (error) {
    console.error('Polymarket search error:', error);
    return [];
  }
}

export async function getPolymarketTop(
  limit: number = 60
): Promise<MarketResult[]> {
  try {
    const response = await fetch(
      `${API_URL}/events?limit=${limit}&closed=false&order=volume`
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((event: any) => mapPolymarketEvent(event));
  } catch (error) {
    console.error('Polymarket top error:', error);
    return [];
  }
}

export async function getPolymarketTrending(
  limit: number = 200
): Promise<MarketResult[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      active: 'true',
      archived: 'false',
      closed: 'false',
      order: 'volume',
    });

    const response = await fetch(
      `${API_URL}/events/pagination?${params.toString()}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      console.error('Polymarket trending error:', response.statusText);
      return [];
    }

    const data = await response.json();
    const events = Array.isArray(data?.data) ? data.data : [];

    return events.map((event: any) => mapPolymarketEvent(event));
  } catch (error) {
    console.error('Polymarket trending fetch error:', error);
    return [];
  }
}

export async function getPolymarketEvent(
  id: string
): Promise<MarketResult | null> {
  try {
    const response = await fetch(`${API_URL}/events/${id}`);
    if (!response.ok) return null;
    const event = await response.json();
    return mapPolymarketEvent(event);
  } catch (error) {
    console.error('Polymarket get error:', error);
    return null;
  }
}

export async function getPolymarketHistory(id: string): Promise<any[]> {
  try {
    // 1. Fetch raw event to get the CLOB Token ID of the main market
    const response = await fetch(`${API_URL}/events/${id}`);
    if (!response.ok) return [];
    const event = await response.json();

    if (!event.markets || event.markets.length === 0) return [];

    // Sort markets by volume to find the main one
    const markets = event.markets.sort(
      (a: any, b: any) => (b.volume || 0) - (a.volume || 0)
    );
    const mainMarket = markets[0];

    // Polymarket CLOB IDs are usually in clobTokenIds array.
    // [0] is usually YES (or the specific outcome token).
    const clobId = mainMarket.clobTokenIds?.[0];

    if (!clobId) return [];

    // 2. Fetch History
    // fidelity: 10, 60, etc. (minutes).
    // For "ALL", maybe larger. For now hardcode reasonable default.
    const historyRes = await fetch(
      `${CLOB_URL}/prices-history?market=${clobId}&fidelity=60`
    );

    if (!historyRes.ok) return [];

    const historyData = await historyRes.json();

    if (!historyData.history) return [];

    // Return generic { time, value } format
    return historyData.history.map((p: any) => ({
      time: p.t * 1000, // Convert to ms
      value: p.p * 100, // Convert to percentage
    }));
  } catch (error) {
    console.error('Polymarket history error:', error);
    return [];
  }
}

function mapPolymarketEvent(event: any): MarketResult {
  let outcomes = [];

  if (event.markets && event.markets.length > 1) {
    outcomes = event.markets.map((m: any) => ({
      name: m.groupItemTitle || m.question,
      percentage: Math.round(Number(m.outcomePrices?.[0] || 0) * 100),
      color: 'green',
      price: Number(m.outcomePrices?.[0] || 0),
    }));
  } else if (event.markets && event.markets.length === 1) {
    const m = event.markets[0];
    const yesPrice = Number(m.outcomePrices?.[0] || 0);
    outcomes = [
      {
        name: 'Yes',
        percentage: Math.round(yesPrice * 100),
        color: 'green',
        price: yesPrice,
      },
      {
        name: 'No',
        percentage: Math.round((1 - yesPrice) * 100),
        color: 'red',
        price: 1 - yesPrice,
      },
    ];
  }

  outcomes.sort((a: any, b: any) => b.percentage - a.percentage);
  const displayOutcomes = outcomes.slice(0, 2);

  return {
    id: `polymarket:${event.id}`,
    platform: 'Polymarket',
    title: event.title,
    icon: event.image || '🔵',
    outcomes: displayOutcomes,
    volume: formatCurrency(event.volume || 0),
    liquidity: formatCurrency(event.liquidity || 0),
    date: new Date(event.endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    link: `https://polymarket.com/event/${event.slug}`,
  };
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
  return '$' + value.toFixed(0);
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'by',
  'for',
  'a',
  'an',
  'on',
  'at',
]);

function filterEventsByQuery(events: any[], query: string): any[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const meaningfulTokens = tokens.filter((token) => !STOP_WORDS.has(token));
  const activeTokens =
    meaningfulTokens.length > 0 ? meaningfulTokens : tokens;

  if (activeTokens.length === 0) return events;

  const scored = events
    .map((event) => {
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const markets = Array.isArray(event.markets) ? event.markets : [];
      const fields = [
        title,
        description,
        ...markets.map((market: any) =>
          (market.question || market.groupItemTitle || '').toLowerCase()
        ),
      ];

      let matches = 0;
      activeTokens.forEach((token) => {
        if (fields.some((field) => field.includes(token))) {
          matches += 1;
        }
      });

      return {
        event,
        matches,
      };
    })
    .filter((entry) => entry.matches > 0);

  if (scored.length === 0) return events;

  return scored
    .sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      const volA = a.event.volume || 0;
      const volB = b.event.volume || 0;
      return volB - volA;
    })
    .map((entry) => entry.event);
}
