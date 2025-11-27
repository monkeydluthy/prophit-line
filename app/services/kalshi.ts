import { MarketResult } from '@/types';
import crypto from 'crypto';

const BASE_HOST = 'https://api.elections.kalshi.com';
const API_PREFIX = '/trade-api/v2';
const PUBLIC_API = 'https://api.elections.kalshi.com/v1';

function getHeaders(method: string, path: string) {
  const keyId = process.env.KALSHI_KEY_ID;
  let privateKey = process.env.KALSHI_PRIVATE_KEY || '';

  if (!keyId || !privateKey) {
    console.warn('Kalshi credentials missing in env');
    return null;
  }

  if (!privateKey.includes('\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const timestamp = Date.now().toString();
  const msg = timestamp + method + path;

  try {
    const sign = crypto.createSign('SHA256');
    sign.update(msg);
    sign.end();

    const signature = sign.sign(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
      },
      'base64'
    );

    return {
      'KALSHI-ACCESS-KEY': keyId,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  } catch (e) {
    console.error('Error signing Kalshi request:', e);
    return null;
  }
}

export async function searchKalshi(query: string): Promise<MarketResult[]> {
  const events = await fetchKalshiEvents();

  const lowerQuery = query.toLowerCase();

  let filtered = events.filter(
    (e: any) =>
      (e.title && e.title.toLowerCase().includes(lowerQuery)) ||
      (e.ticker && e.ticker.toLowerCase().includes(lowerQuery))
  );

  return filtered.slice(0, 20).map((event: any) => mapKalshiEvent(event));
}

export async function getKalshiTopEvents(
  limit: number = 60
): Promise<MarketResult[]> {
  const events = await fetchKalshiEvents(limit);
  return events.slice(0, limit).map((event: any) => mapKalshiEvent(event));
}

export async function getKalshiTrendingEvents(
  limit: number = 120
): Promise<MarketResult[]> {
  try {
    const cappedLimit = Math.min(limit, 50);
    const response = await fetch(
      `${PUBLIC_API}/search/series?order_by=trending&page_size=${cappedLimit}&status=open&with_milestones=true`,
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      console.error('Kalshi trending API error:', response.status);
      return [];
    }

    const data = await response.json();
    const page = data?.current_page || [];
    const tickers = page
      .map((entry: any) => entry.event_ticker)
      .filter(Boolean);

    if (tickers.length === 0) {
      return await getKalshiTopEvents(limit);
    }

    const events = await fetchKalshiEventsByTickers(tickers);
    const eventMap = new Map(events.map((evt: any) => [evt.ticker, evt]));

    const mapped = tickers
      .map((ticker: string) => eventMap.get(ticker))
      .filter(Boolean)
      .map((event: any) => mapKalshiEvent(event));

    if (mapped.length > 0) {
      return mapped;
    }
  } catch (error) {
    console.error('Kalshi trending fetch error:', error);
  }

  try {
    return await getKalshiTopEvents(limit);
  } catch (fallbackError) {
    console.error('Kalshi trending fallback error:', fallbackError);
    return [];
  }
}

export async function getKalshiMarket(
  id: string
): Promise<MarketResult | null> {
  // Fetch Event by ticker
  const endpoint = `/events/${id}`;
  const fullPath = API_PREFIX + endpoint;
  const headers = getHeaders('GET', fullPath);

  if (!headers) return null;

  try {
    const response = await fetch(`${BASE_HOST}${fullPath}`, {
      headers: headers as any,
      next: { revalidate: 60 },
    });

    let eventObj: any = null;

    if (!response.ok) {
      const text = await response.text();
      console.error('Kalshi Get Error:', text);
    } else {
      const data = await response.json();
      eventObj = data.event;
    }

    if (
      !eventObj ||
      !Array.isArray(eventObj.markets) ||
      eventObj.markets.length === 0
    ) {
      const markets = await fetchKalshiMarketsForEvent(id);
      if (markets.length > 0) {
        eventObj = {
          ...(eventObj || { event_ticker: id }),
          markets,
        };
      }
    }

    if (!eventObj || !eventObj.markets?.length) {
      const fallbackEvents = await fetchKalshiEventsByTickers([id]);
      if (fallbackEvents.length > 0) {
        eventObj = fallbackEvents[0];
        if (!eventObj.markets || !eventObj.markets.length) {
          const fallbackMarkets = await fetchKalshiMarketsForEvent(
            fallbackEvents[0]?.ticker || id
          );
          if (fallbackMarkets.length) {
            eventObj.markets = fallbackMarkets;
          }
        }
      }
    }

    if (!eventObj) {
      return null;
    }

    return mapKalshiEvent(eventObj);
  } catch (error) {
    console.error('Kalshi get error:', error);
    return null;
  }
}

export async function getKalshiHistory(id: string): Promise<any[]> {
  const cleanId = id.replace(/^kalshi:/, '');
  const eventRes = await fetch(`${BASE_HOST}${API_PREFIX}/events/${cleanId}`, {
    headers: getHeaders('GET', `${API_PREFIX}/events/${cleanId}`) as any,
  });

  let eventData = null;
  if (eventRes.ok) {
    eventData = await eventRes.json();
  }

  let eventObj = eventData?.event || eventData || null;
  let markets = eventObj?.markets || [];

  if (!markets.length) {
    const directMarkets = await fetchKalshiMarketsForEvent(cleanId);
    if (directMarkets.length > 0) {
      markets = directMarkets;
      if (!eventObj) {
        eventObj = { event_ticker: cleanId };
      }
      eventObj.markets = directMarkets;
    }
  }

  if (!markets.length) {
    const fallback = await fetchKalshiEventsByTickers([cleanId]);
    if (fallback.length > 0) {
      eventObj = fallback[0];
      markets = fallback[0].markets || [];
      if (!markets.length) {
        const fallbackMarkets = await fetchKalshiMarketsForEvent(
          fallback[0].ticker || cleanId
        );
        if (fallbackMarkets.length > 0) {
          markets = fallbackMarkets;
          eventObj.markets = fallbackMarkets;
        }
      }
    }
  }

  if (markets.length === 0) return [];

  markets.sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0));
  const marketTickers = markets.map((m: any) => m.ticker).filter(Boolean);

  const candlestickSets = await fetchKalshiEventCandlesticks(cleanId);
  if (!candlestickSets.length) {
    console.warn('Kalshi event candlesticks empty', { eventId: cleanId });
    return [];
  }

  const candlestickMap = new Map<string, any[]>();
  candlestickSets.forEach((entry: any) => {
    if (entry?.market_ticker && Array.isArray(entry?.candlesticks)) {
      candlestickMap.set(entry.market_ticker, entry.candlesticks);
    }
  });

  const orderedTickers =
    marketTickers.length > 0
      ? marketTickers
      : Array.from(candlestickMap.keys());

  for (const ticker of orderedTickers) {
    const candlesticks = candlestickMap.get(ticker);
    if (!candlesticks || candlesticks.length === 0) {
      console.warn('Kalshi candlesticks empty', { ticker });
      continue;
    }

    return candlesticks.map((c: any) => {
      const timestamp =
        c.end_period_ts || c.timestamp || c.time || c.start_period_ts;
      const price =
        c.price?.close ||
        c.price ||
        c.close_price ||
        c.close ||
        c.last_price ||
        0;
      const tsNum = Number(timestamp || 0);
      const time = tsNum > 1e12 ? tsNum : tsNum * 1000;
      return {
        time,
        value: Number(price),
      };
    });
  }

  return [];
}

function mapKalshiEvent(event: any): MarketResult {
  const markets = event.markets || [];
  let outcomes = [];
  const eventTicker =
    event.event_ticker || event.ticker || event.series_ticker || 'unknown';
  const seriesTicker = event.series_ticker || eventTicker;

  const totalVolume = markets.reduce(
    (sum: number, m: any) => sum + normalizeKalshiMoney(m.volume),
    0
  );

  const childMarkets = markets
    .map((m: any) => {
      const yesPrice = m.yes_bid || m.last_price || 0;
      const noPrice = m.no_ask || 100 - yesPrice;
      return {
        name: m.subtitle || m.title,
        shortName: deriveShortName(m.subtitle || m.title),
        yesPrice,
        noPrice,
        probability: yesPrice,
        volume: normalizeKalshiMoney(m.volume),
        liquidity: normalizeKalshiMoney(m.liquidity),
        ticker: m.ticker,
        seriesTicker: m.series_ticker || m.seriesTicker,
      };
    })
    .sort((a: any, b: any) => {
      const probDiff = (b.probability || 0) - (a.probability || 0);
      if (probDiff !== 0) return probDiff;
      return (b.volume || 0) - (a.volume || 0);
    });

  if (markets.length === 1) {
    const m = markets[0];
    const yesPrice = m.yes_bid || m.last_price || 50;
    const noPrice = 100 - yesPrice;

    outcomes = [
      {
        name: 'Yes',
        percentage: yesPrice,
        color: 'green',
        price: yesPrice / 100,
      },
      { name: 'No', percentage: noPrice, color: 'red', price: noPrice / 100 },
    ];
  } else {
    outcomes = markets.map((m: any) => {
      const probability = m.yes_bid || m.last_price || 0;
      return {
        name: deriveShortName(m.subtitle || m.title),
        percentage: probability,
        color: 'blue',
        price: probability / 100,
      };
    });

    outcomes.sort((a: any, b: any) => b.percentage - a.percentage);
  }

  if (outcomes.length > 0) outcomes[0].color = 'green';
  if (outcomes.length > 1) outcomes[1].color = 'red';

  return {
    id: `kalshi:${eventTicker}`,
    platform: 'Kalshi',
    title: event.title,
    icon: '🟢',
    outcomes: outcomes.slice(0, 5),
    volume: formatCurrency(totalVolume),
    liquidity: event.liquidity
      ? formatCurrency(normalizeKalshiMoney(event.liquidity))
      : 'N/A',
    date: markets[0]?.expiration_time
      ? new Date(markets[0].expiration_time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'N/A',
    link: buildKalshiLink(
      seriesTicker,
      event.sub_title || event.title,
      eventTicker
    ),
    markets: childMarkets,
  };
}

function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toString();
}

async function fetchKalshiEvents(limit: number = 120): Promise<any[]> {
  const endpoint = '/markets';
  const queryParams = `?limit=${limit}`;
  const fullPath = API_PREFIX + endpoint + queryParams;

  const headers = getHeaders('GET', fullPath);

  if (!headers) {
    return [];
  }

  try {
    const response = await fetch(`${BASE_HOST}${fullPath}`, {
      headers: headers as any,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`Kalshi API error: ${response.status}`);
      const text = await response.text();
      console.error('Kalshi Error details:', text);
      return [];
    }

    const data = await response.json();
    const markets = data.markets || [];

    const eventsMap = new Map<string, any>();

    for (const m of markets) {
      if (!m.event_ticker) continue;

      if (!eventsMap.has(m.event_ticker)) {
        eventsMap.set(m.event_ticker, {
          ticker: m.event_ticker,
          title: m.event_title || m.title,
          markets: [],
          volume: 0,
        });
      }
      const event = eventsMap.get(m.event_ticker);
      event.markets.push(m);
      event.volume += m.volume || 0;
    }

    const events = Array.from(eventsMap.values());
    events.sort((a: any, b: any) => b.volume - a.volume);
    return events;
  } catch (error) {
    console.error('Kalshi fetch events error:', error);
    return [];
  }
}

async function fetchKalshiMarketsForEvent(eventTicker: string): Promise<any[]> {
  const endpoint = `/markets?event_ticker=${encodeURIComponent(
    eventTicker
  )}&limit=500`;
  const fullPath = API_PREFIX + endpoint;
  const headers = getHeaders('GET', fullPath);
  if (!headers) return [];

  try {
    const response = await fetch(`${BASE_HOST}${fullPath}`, {
      headers: headers as any,
      next: { revalidate: 30 },
    });
    if (!response.ok) {
      console.warn('Kalshi event markets error', response.status);
      return [];
    }
    const data = await response.json();
    const markets = Array.isArray(data?.markets) ? data.markets : [];
    return markets;
  } catch (error) {
    console.error('Kalshi event markets fetch error:', error);
    return [];
  }
}

async function fetchKalshiEventCandlesticks(
  eventTicker: string,
  periodMinutes: number = 60
): Promise<Array<{ market_ticker: string; candlesticks: any[] }>> {
  const endpoint = `${API_PREFIX}/events/${eventTicker}/candlesticks?period_interval=${periodMinutes}`;
  const headers = getHeaders('GET', endpoint);
  if (!headers) return [];

  try {
    const res = await fetch(`${BASE_HOST}${endpoint}`, {
      headers: headers as any,
    });

    if (!res.ok) {
      console.warn('Kalshi event candlesticks error', {
        eventTicker,
        status: res.status,
      });
      return [];
    }

    const data = await res.json();
    return Array.isArray(data?.market_candlesticks)
      ? data.market_candlesticks
      : [];
  } catch (error) {
    console.error('Kalshi event candlesticks fetch error', {
      eventTicker,
      error,
    });
    return [];
  }
}

async function fetchKalshiEventsByTickers(
  tickers: string[],
  chunkSize: number = 40
): Promise<any[]> {
  const events: any[] = [];

  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize);
    const params = new URLSearchParams({
      series_tickers: '',
      single_event_per_series: 'false',
      tickers: chunk.join(','),
      page_size: String(chunk.length),
      page_number: '1',
    });

    try {
      const response = await fetch(
        `${PUBLIC_API}/events/?${params.toString()}`,
        {
          next: { revalidate: 30 },
        }
      );

      if (!response.ok) {
        console.error('Kalshi events chunk error:', response.status);
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data?.events)) {
        events.push(...data.events);
      }
    } catch (error) {
      console.error('Kalshi chunk fetch error:', error);
    }
  }

  return events;
}

function normalizeKalshiMoney(value: number = 0): number {
  if (!value || Number.isNaN(Number(value))) return 0;
  // Kalshi returns integer cents
  return Number(value) / 100;
}

function deriveShortName(name: string = ''): string {
  if (!name) return '';
  const teamMatch = name.match(/Will (?:the )?(.+?) win/i);
  if (teamMatch && teamMatch[1]) {
    return teamMatch[1].trim();
  }
  const lastWords = name.split(' ').slice(-2).join(' ');
  return lastWords.trim();
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function slugify(value: string = ''): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildKalshiLink(
  seriesTicker: string,
  subTitle: string,
  eventTicker: string
): string {
  const seriesSlug = slugify(seriesTicker);
  const eventSlug = slugify(subTitle || 'market');
  const tickerSlug = slugify(eventTicker);
  if (!seriesSlug || !tickerSlug) {
    return 'https://kalshi.com/markets';
  }
  return `https://kalshi.com/markets/${seriesSlug}/${eventSlug}/${tickerSlug}`;
}
