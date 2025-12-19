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

  const lowerQuery = query.toLowerCase().trim();

  // Extract meaningful terms (remove stop words)
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'will',
    'be',
    'is',
    'are',
    'was',
    'were',
  ]);
  const queryTerms = lowerQuery
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term))
    .map((term) => term.replace(/[^a-z0-9]/g, ''))
    .filter((term) => term.length > 0);

  if (queryTerms.length === 0) return [];

  // Use strict word boundary matching for short terms
  const filtered = events.filter((e: any) => {
    const title = (e.title || '').toLowerCase();
    const ticker = (e.ticker || '').toLowerCase();
    const searchText = `${title} ${ticker}`;

    // All terms must match
    return queryTerms.every((term) => {
      const isShortTerm = term.length <= 3;
      if (isShortTerm) {
        // Short terms must match as whole words
        const wordBoundaryRegex = new RegExp(
          `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          'i'
        );
        return wordBoundaryRegex.test(searchText);
      } else {
        // Longer terms can match as substring
        return searchText.includes(term);
      }
    });
  });

  return filtered.slice(0, 20).map((event: any) => mapKalshiEvent(event));
}

export async function getKalshiTopEvents(
  limit: number = 200
): Promise<MarketResult[]> {
  // fetchKalshiEvents supports up to 500, but we'll cap at 500 to be safe
  const safeLimit = Math.min(limit, 500);
  const events = await fetchKalshiEvents(safeLimit);
  const mapped = events
    .slice(0, safeLimit)
    .map((event: any) => mapKalshiEvent(event));
  console.log(
    `[Kalshi] Fetched ${mapped.length} top events (requested ${limit}, capped at ${safeLimit})`
  );
  return mapped;
}

export async function getKalshiTrendingEvents(
  limit: number = 120
): Promise<MarketResult[]> {
  // For large limits (500+), use getKalshiTopEvents which is more efficient
  // The trending endpoint is paginated and slower for large requests
  if (limit >= 300) {
    console.log(`[Kalshi] Using top events for large limit (${limit})`);
    return await getKalshiTopEvents(limit);
  }

  try {
    // For smaller limits, try trending endpoint
    // Kalshi API supports up to 100 per page, paginate if needed
    const pageSize = Math.min(limit, 100);
    const response = await fetch(
      `${PUBLIC_API}/search/series?order_by=trending&page_size=${pageSize}&status=open&with_milestones=true`,
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      console.error('Kalshi trending API error:', response.status);
      return await getKalshiTopEvents(limit);
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
      console.log(
        `[Kalshi] Fetched ${mapped.length} trending events (requested ${pageSize})`
      );
      return mapped;
    }
  } catch (error) {
    console.error('Kalshi trending fetch error:', error);
  }

  // Fallback to top events (supports up to 500)
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
  
  // Extract series ticker from event ticker if not available
  // Event ticker format: {SERIES_TICKER}-{DATE}{TEAMS} (e.g., KXNBAGAME-25DEC20BOSTOR)
  // Series ticker is the part before the first dash followed by numbers
  let seriesTicker = event.series_ticker;
  if (!seriesTicker && eventTicker !== 'unknown') {
    // Extract series ticker from event ticker (e.g., "KXNBAGAME-25DEC20BOSTOR" -> "KXNBAGAME")
    // Look for pattern: SERIES_TICKER followed by dash and date (numbers)
    const match = eventTicker.match(/^([A-Z]+?)(?:-\d)/);
    if (match) {
      seriesTicker = match[1];
    } else {
      // Fallback: if no pattern match, use event ticker (will be wrong but better than nothing)
      seriesTicker = eventTicker;
    }
  }
  
  // Final fallback
  if (!seriesTicker || seriesTicker === 'unknown') {
    seriesTicker = eventTicker;
  }

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

  // Use question field if available (more accurate), otherwise title
  // The question field contains the actual market question, not concatenated outcomes
  // Filter out "Combo" and other invalid titles
  function getKalshiTitle(event: any): string {
    // 1. Try market subtitle (most specific for single markets)
    if (markets.length === 1 && markets[0]?.subtitle) {
      const subtitle = markets[0].subtitle;
      if (subtitle && subtitle !== 'Combo' && subtitle.length > 10) {
        return subtitle;
      }
    }

    // 2. Try event question (from event API)
    if (
      event.question &&
      event.question !== 'Combo' &&
      event.question.length > 10
    ) {
      return event.question;
    }

    // 3. Try event title + subtitle
    if (event.title && event.sub_title) {
      const combined = `${event.title}: ${event.sub_title}`;
      if (combined !== 'Combo' && combined.length > 10) {
        return combined;
      }
    }

    // 4. Just event title
    if (event.title && event.title !== 'Combo' && event.title.length > 10) {
      return event.title;
    }

    // 5. Try sub_title alone
    if (
      event.sub_title &&
      event.sub_title !== 'Combo' &&
      event.sub_title.length > 10
    ) {
      return event.sub_title;
    }

    // 6. Try series_title from first market
    if (
      markets[0]?.series_title &&
      markets[0].series_title !== 'Combo' &&
      markets[0].series_title.length > 10
    ) {
      return markets[0].series_title;
    }

    // 7. Try event_title from first market
    if (
      markets[0]?.event_title &&
      markets[0].event_title !== 'Combo' &&
      markets[0].event_title.length > 10
    ) {
      return markets[0].event_title;
    }

    return `Kalshi Market ${eventTicker}`;
  }

  const marketTitle = getKalshiTitle(event);

  return {
    id: `kalshi:${eventTicker}`,
    platform: 'Kalshi',
    title: marketTitle,
    icon: '🟢',
    outcomes: outcomes.slice(0, 5),
    volume: formatCurrency(totalVolume),
    liquidity: event.liquidity
      ? formatCurrency(normalizeKalshiMoney(event.liquidity))
      : 'N/A',
    // Store ISO date string (YYYY-MM-DD) for reliable date extraction and matching
    // Prefer target_datetime (game date) over expiration_time (market close time)
    date: event.target_datetime
      ? new Date(event.target_datetime).toISOString().split('T')[0] // YYYY-MM-DD format
      : markets[0]?.expiration_time
      ? new Date(markets[0].expiration_time).toISOString().split('T')[0] // YYYY-MM-DD format
      : '',
    link: buildKalshiLink(
      seriesTicker,
      eventTicker,
      event.series_title || markets[0]?.series_title || 'market'
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

/**
 * Fetch series data from Kalshi to get the actual questions (not outcome names)
 */
async function fetchKalshiSeries(
  seriesTickers: string[]
): Promise<Map<string, any>> {
  const seriesMap = new Map<string, any>();
  const chunkSize = 20; // Kalshi API limit

  for (let i = 0; i < seriesTickers.length; i += chunkSize) {
    const chunk = seriesTickers.slice(i, i + chunkSize);
    try {
      const response = await fetch(
        `${PUBLIC_API}/series/?series_tickers=${chunk.join(',')}&page_size=${
          chunk.length
        }`,
        { next: { revalidate: 60 } }
      );

      if (response.ok) {
        const data = await response.json();
        // Debug: log first response to see structure
        if (i === 0 && data) {
          console.log('[Kalshi Debug] Series API response:', {
            hasSeries: Array.isArray(data?.series),
            seriesCount: Array.isArray(data?.series) ? data.series.length : 0,
            firstSeriesKeys:
              Array.isArray(data?.series) && data.series[0]
                ? Object.keys(data.series[0])
                : [],
            firstSeriesSample:
              Array.isArray(data?.series) && data.series[0]
                ? {
                    series_ticker: data.series[0].series_ticker,
                    title: data.series[0].title,
                    question: data.series[0].question,
                  }
                : null,
          });
        }

        const series = Array.isArray(data?.series) ? data.series : [];
        for (const s of series) {
          if (s.series_ticker) {
            seriesMap.set(s.series_ticker, s);
          }
        }
      } else {
        console.warn(
          `[Kalshi] Series API error for chunk ${i / chunkSize + 1}: ${
            response.status
          }`
        );
      }
    } catch (error) {
      console.warn(
        `[Kalshi] Series API fetch error for chunk ${i / chunkSize + 1}:`,
        error
      );
    }
  }

  return seriesMap;
}

/**
 * Fetch Kalshi events by sport using series_ticker filter
 * This is more efficient than fetching all markets and filtering
 * Returns MarketResult[] format for consistency with other functions
 */
export async function fetchKalshiEventsBySport(sport: string, limit: number = 500): Promise<MarketResult[]> {
  // Map sport codes to Kalshi series tickers
  // Based on URLs from kalshi.com:
  // - NFL: kxnflgame -> KXNFLGAME
  // - NBA: kxnbagame -> KXNBAGAME  
  // - NHL: kxnhlgame -> KXNHLGAME
  // - CBB: kxncaambgame -> KXNCAAMBGAME
  const sportSeriesMap: Record<string, string> = {
    'nfl': 'KXNFLGAME',
    'nba': 'KXNBAGAME',
    'nhl': 'KXNHLGAME',
    'cbb': 'KXNCAAMBGAME',
    'cfb': 'KXMVENCFBGAME', // Need to find CFB equivalent
  };
  
  const seriesTicker = sportSeriesMap[sport.toLowerCase()];
  if (!seriesTicker) {
    console.log(`[Kalshi] No series ticker found for sport: ${sport}`);
    return [];
  }
  
  // Kalshi API has a hard limit of 1000 per request
  const cappedLimit = Math.min(limit, 1000);
  if (limit > 1000) {
    console.log(`[Kalshi] Capping limit from ${limit} to 1000 (Kalshi API maximum)`);
  }
  
  // Use /markets endpoint with series_ticker filter (authenticated API supports this)
  // This is similar to how fetchKalshiEvents works but filtered by series
  const endpoint = '/markets';
  const queryParams = new URLSearchParams({
    limit: String(cappedLimit),
    status: 'open',
    series_ticker: seriesTicker,
  });
  const fullPath = API_PREFIX + endpoint + '?' + queryParams.toString();

  const headers = getHeaders('GET', fullPath);

  if (!headers) {
    console.warn(`[Kalshi] Missing credentials for fetchKalshiEventsBySport`);
    return [];
  }

  try {
    const response = await fetch(`${BASE_HOST}${fullPath}`, {
      headers: headers as any,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`[Kalshi] fetchKalshiEventsBySport error: ${response.status} for ${sport} (series_ticker: ${seriesTicker})`);
      const text = await response.text();
      console.error('[Kalshi] Error details:', text);
      return [];
    }

    const data = await response.json();
    const markets = data.markets || [];
    
    console.log(`[Kalshi] fetchKalshiEventsBySport("${sport}"): fetched ${markets.length} markets using series_ticker=${seriesTicker}`);
    
    if (markets.length > 0) {
      console.log(`[Kalshi] Sample ${sport} market: "${markets[0].title}" (event_ticker: ${markets[0].event_ticker})`);
    }
    
    // Group markets by event_ticker (same logic as fetchKalshiEvents)
    const eventsMap = new Map<string, any>();
    const uniqueSeriesTickers = new Set<string>();

    for (const m of markets) {
      if (!m.event_ticker) continue;

      if (m.series_ticker) {
        uniqueSeriesTickers.add(m.series_ticker);
      }

      if (!eventsMap.has(m.event_ticker)) {
        eventsMap.set(m.event_ticker, {
          ticker: m.event_ticker,
          series_ticker: m.series_ticker,
          title: null, // Will be set from event data
          question: null,
          markets: [],
          volume: 0,
        });
      }
      const event = eventsMap.get(m.event_ticker);
      event.markets.push(m);
      event.volume += m.volume || 0;
    }
    
    // Fetch event data to get titles/questions (same as fetchKalshiEvents)
    const uniqueEventTickers = Array.from(eventsMap.keys());
    const eventDataMap = await fetchKalshiEventsByTickers(uniqueEventTickers);
    const eventDataByTicker = new Map(
      eventDataMap.map((evt: any) => [evt.ticker || evt.event_ticker, evt])
    );
    
    // Also fetch series data as backup
    const seriesMap = await fetchKalshiSeries(Array.from(uniqueSeriesTickers));
    
    // Update events with titles/questions from event data
    const result = Array.from(eventsMap.values());
    for (const event of result) {
      // FIRST: Always get series title from series data (for URL building)
      if (event.series_ticker && seriesMap.has(event.series_ticker)) {
        const series = seriesMap.get(event.series_ticker);
        // Store series title for URL building (e.g., "Professional Basketball Game")
        event.series_title = series.title || series.question;
      }
      
      // Fallback: try to get series title from first market
      if (!event.series_title && event.markets.length > 0) {
        const firstMarket = event.markets[0];
        if (firstMarket.series_title) {
          event.series_title = firstMarket.series_title;
        }
      }
      
      // THEN: Get event title from event data
      if (eventDataByTicker.has(event.ticker)) {
        const eventData = eventDataByTicker.get(event.ticker);
        event.title = eventData.title || eventData.question || eventData.event_title;
        event.question = eventData.title || eventData.question || eventData.event_title;
        event.sub_title = eventData.sub_title || event.sub_title;
        if (eventData.target_datetime) {
          event.target_datetime = eventData.target_datetime;
        }
      }
      
      // Fallback to series data for event title (only if not set)
      if (!event.title && event.series_ticker && seriesMap.has(event.series_ticker)) {
        const series = seriesMap.get(event.series_ticker);
        event.title = series.title || series.question;
        event.question = series.title || series.question;
        event.sub_title = series.sub_title || event.sub_title;
      }
      
      // Final fallback for event title
      if (!event.title && event.markets.length > 0) {
        const firstMarket = event.markets[0];
        event.title = firstMarket.series_title || firstMarket.event_title || firstMarket.title || `Kalshi Market ${event.ticker}`;
        event.question = event.title;
      }
    }
    
    // Map to MarketResult format
    return result.map(event => mapKalshiEvent(event));
  } catch (error) {
    console.error(`[Kalshi] fetchKalshiEventsBySport error for ${sport}:`, error);
    return [];
  }
}

async function fetchKalshiEvents(limit: number = 500): Promise<any[]> {
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

    // Debug: Log sample market (simplified)
    if (markets.length > 0) {
      console.log(`[Kalshi] Sample market: "${markets[0].title}" (ticker: ${markets[0].event_ticker})`);
    }

    // Step 1: Group markets by event_ticker and collect series_tickers
    const eventsMap = new Map<string, any>();
    const uniqueSeriesTickers = new Set<string>();

    for (const m of markets) {
      if (!m.event_ticker) continue;

      if (m.series_ticker) {
        uniqueSeriesTickers.add(m.series_ticker);
      }

      if (!eventsMap.has(m.event_ticker)) {
        eventsMap.set(m.event_ticker, {
          ticker: m.event_ticker,
          series_ticker: m.series_ticker,
          title: null, // Will be set from series data
          question: null,
          markets: [],
          volume: 0,
        });
      }
      const event = eventsMap.get(m.event_ticker);
      event.markets.push(m);
      event.volume += m.volume || 0;
    }

    // Step 2: Fetch event data using event tickers (this has the actual questions!)
    const uniqueEventTickers = Array.from(eventsMap.keys());
    console.log(
      `[Kalshi] Fetching event data for ${uniqueEventTickers.length} unique events to get questions...`
    );
    const eventDataMap = await fetchKalshiEventsByTickers(uniqueEventTickers);
    const eventDataByTicker = new Map(
      eventDataMap.map((evt: any) => [evt.ticker || evt.event_ticker, evt])
    );
    console.log(
      `[Kalshi] Fetched ${eventDataByTicker.size} events with question data`
    );

    // Step 3: Also try series data as backup
    console.log(
      `[Kalshi] Fetching series data for ${uniqueSeriesTickers.size} unique series as backup...`
    );
    const seriesMap = await fetchKalshiSeries(Array.from(uniqueSeriesTickers));
    console.log(`[Kalshi] Fetched ${seriesMap.size} series with question data`);

    // Step 4: Update events with titles/questions from event data (best source)
    let eventDataFoundCount = 0;
    let seriesFoundCount = 0;
    let fallbackCount = 0;

    for (const [eventTicker, event] of eventsMap.entries()) {
      // First priority: Use event data (most reliable - has actual questions)
      if (eventDataByTicker.has(eventTicker)) {
        const eventData = eventDataByTicker.get(eventTicker);
        event.title =
          eventData.title || eventData.question || eventData.event_title;
        event.question =
          eventData.title || eventData.question || eventData.event_title;
        event.sub_title = eventData.sub_title || event.sub_title;
        // Store target_datetime (game date) if available - this is more accurate than expiration_time
        if (eventData.target_datetime) {
          event.target_datetime = eventData.target_datetime;
        }
        if (event.title) eventDataFoundCount++;
      }

      // Second priority: Try series data if event data didn't work
      if (
        !event.title &&
        event.series_ticker &&
        seriesMap.has(event.series_ticker)
      ) {
        const series = seriesMap.get(event.series_ticker);
        event.title = series.title || series.question;
        event.question = series.title || series.question;
        event.sub_title = series.sub_title || event.sub_title;
        if (event.title) seriesFoundCount++;
      }

      // Fallback: if no series data, try multiple sources from market data
      if (!event.title && event.markets.length > 0) {
        const firstMarket = event.markets[0];

        // Try multiple fields in order of preference
        const possibleTitles = [
          firstMarket.series_title,
          firstMarket.event_title,
          firstMarket.title, // Sometimes title is the question
          // For multi-market events, try to construct from subtitles
          event.markets.length === 1 ? firstMarket.subtitle : null,
        ].filter(Boolean);

        // Find first title that doesn't look like concatenated outcomes
        for (const marketTitle of possibleTitles) {
          if (
            marketTitle &&
            typeof marketTitle === 'string' &&
            marketTitle.length > 10 && // Must be meaningful length
            !marketTitle.includes(',yes ') &&
            !marketTitle.includes(',no ') &&
            !marketTitle.match(/^[A-Z0-9-]+$/) // Not just a ticker/code
          ) {
            event.title = marketTitle;
            event.question = marketTitle;
            fallbackCount++;
            break;
          }
        }
      }

      // Final fallback: try to construct a title from market subtitles
      if (!event.title && event.markets.length > 0) {
        // For single market events, use the subtitle as the question
        if (event.markets.length === 1 && event.markets[0].subtitle) {
          const subtitle = event.markets[0].subtitle;
          // Only use if it looks like a question, not an outcome
          if (
            subtitle.length > 10 &&
            !subtitle.includes(',') &&
            (subtitle.includes('?') ||
              subtitle.includes('will') ||
              subtitle.includes('win'))
          ) {
            event.title = subtitle;
            event.question = subtitle;
            fallbackCount++;
          }
        }
      }

      // Absolute final fallback: use a generic title
      if (!event.title) {
        event.title = `Kalshi Market ${eventTicker}`;
        event.question = event.title;
      }
    }

    console.log(
      `[Kalshi] Title extraction: ${eventDataFoundCount} from event API, ${seriesFoundCount} from series API, ${fallbackCount} from market data, ${
        eventsMap.size - eventDataFoundCount - seriesFoundCount - fallbackCount
      } fallbacks`
    );

    const events = Array.from(eventsMap.values());
    events.sort((a: any, b: any) => b.volume - a.volume);
    console.log(
      `[Kalshi] fetchKalshiEvents returned ${events.length} unique events (requested limit: ${limit})`
    );

    // Log sample of final titles to verify they're correct
    if (events.length > 0) {
      console.log('[Kalshi Debug] Sample final event titles (first 5):');
      events.slice(0, 5).forEach((e, idx) => {
        console.log(`  ${idx + 1}. "${e.title?.substring(0, 70)}"`);
      });
    }

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
      // Disable caching for large event batch requests (they exceed 2MB cache limit)
      const response = await fetch(
        `${PUBLIC_API}/events/?${params.toString()}`,
        {
          cache: 'no-store', // Large responses can't be cached anyway
        }
      );

      if (!response.ok) {
        console.error('Kalshi events chunk error:', response.status);
        continue;
      }

      const data = await response.json();
      if (Array.isArray(data?.events)) {
        // Debug: Log sample event (simplified)
        if (events.length === 0 && data.events.length > 0) {
          console.log(`[Kalshi] Sample event: "${data.events[0].title}" (${data.events[0].sub_title || 'no subtitle'})`);
        }
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
  eventTicker: string,
  seriesTitle: string
): string {
  // Kalshi URLs use the format: https://kalshi.com/markets/{series-ticker}/{series-slug}/{event-ticker}
  // Example: https://kalshi.com/markets/kxnbagame/professional-basketball-game/kxnbagame-25dec20bostor
  if (!seriesTicker || !eventTicker || seriesTicker === 'unknown' || eventTicker === 'unknown') {
    return 'https://kalshi.com/markets';
  }
  
  // Convert to lowercase for URL
  const seriesSlug = seriesTicker.toLowerCase();
  const eventSlug = eventTicker.toLowerCase();
  
  // Create series title slug (e.g., "Professional Basketball Game" -> "professional-basketball-game")
  const seriesTitleSlug = slugify(seriesTitle || 'market');
  
  return `https://kalshi.com/markets/${seriesSlug}/${seriesTitleSlug}/${eventSlug}`;
}
