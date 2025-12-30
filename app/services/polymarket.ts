import { MarketResult } from '@/types';

const API_URL = 'https://gamma-api.polymarket.com';
const CLOB_URL = 'https://clob.polymarket.com';

/**
 * Fetch Polymarket events filtered by sport
 * Fetches a large set of events and filters client-side by sport keywords in slugs/links
 */
export async function getPolymarketEventsBySport(
  sport: string,
  limit: number = 500
): Promise<MarketResult[]> {
  try {
    // Map our sport codes to Polymarket API sport codes
    const sportMap: Record<string, string> = {
      'nfl': 'nfl',
      'nba': 'nba',
      'nhl': 'nhl',
      'cbb': 'cbb',
      'cfb': 'cfb',
    };
    
    const polySport = sportMap[sport];
    if (!polySport) return [];
    
    // Try the sports-specific endpoint first (more reliable)
    try {
      const response = await fetch(
        `${API_URL}/sports/${polySport}/games`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        const games = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        
        if (games.length > 0) {
          console.log(`[Polymarket] getEventsBySport("${sport}"): fetched ${games.length} games from /sports/${polySport}/games`);
          
          // Check if we have the Rams vs Seahawks game (for NFL)
          if (sport === 'nfl' && games.length > 0) {
            const ramsSeahawks = games.find((g: any) => {
              const slug = (g.slug || g.markets?.[0]?.slug || '').toLowerCase();
              return slug.includes('nfl-la-sea') || slug.includes('nfl-sea-la') || slug.includes('la-sea') || slug.includes('sea-la');
            });
            if (ramsSeahawks) {
              console.log(`[Polymarket] ✓ Found Rams vs Seahawks game:`, ramsSeahawks.slug || ramsSeahawks.markets?.[0]?.slug);
            } else {
              console.log(`[Polymarket] ✗ Rams vs Seahawks game NOT found in ${games.length} NFL games`);
            }
          }
          
          return games
            .slice(0, limit)
            .map((game: any) => mapPolymarketEvent(game));
        } else {
          console.log(`[Polymarket] /sports/${polySport}/games returned empty array, falling back to /events/pagination`);
        }
      } else {
        console.log(`[Polymarket] /sports/${polySport}/games returned ${response.status}, falling back to /events/pagination`);
      }
    } catch (sportsError: any) {
      console.log(`[Polymarket] /sports/${polySport}/games failed: ${sportsError?.message || sportsError}, falling back to /events/pagination`);
    }
    
    // Fallback to filtering from general events endpoint
    const sportPatterns: Record<string, string[]> = {
      'nfl': ['nfl-', '/nfl/', '/sports/nfl/'],
      'nba': ['nba-', '/nba/', '/sports/nba/'],
      'nhl': ['nhl-', '/nhl/', '/sports/nhl/'],
      'cbb': ['cbb-', '/cbb/', '/sports/cbb/', 'cwbb-', '/cwbb/'],
      'cfb': ['cfb-', '/cfb/', '/sports/cfb/'],
    };
    
    const patterns = sportPatterns[sport] || [];
    
    // Adaptive approach: Search through pages to find where game events are
    // Games are sorted by volume, so they may be at offset 2000+ (page 5+)
    // We'll keep fetching until we find games, then continue a few more pages to get them all
    // REDUCED for performance - was causing 30s timeouts on Netlify
    const allEvents: any[] = [];
    const maxPages = 5; // Maximum pages to search (2500 events) - reduced from 15 to prevent timeouts
    const maxPagesWithoutGames = 2; // Stop after 2 consecutive pages with no games (reduced from 3)
    
    // Regex to identify game events (e.g., nfl-la-sea-2025-12-18, nba-lac-okc-2025-12-17)
    // Define outside loop so it's accessible for counting later
    const gamePatternRegex = new RegExp(`^${sport}-[a-z]{2,4}-[a-z]{2,4}-\\d{4}-\\d{2}-\\d{2}`);
    
    let pagesWithoutGames = 0;
    let foundGames = false;
    let pagesFetched = 0;
    
    // Add timeout protection for fallback (10 seconds max for all pages)
    const fallbackStartTime = Date.now();
    const FALLBACK_TIMEOUT = 10000; // 10 seconds max for fallback
    
    for (let page = 0; page < maxPages; page++) {
      // Check timeout before each page
      if (Date.now() - fallbackStartTime > FALLBACK_TIMEOUT) {
        console.log(`[Polymarket] Fallback timeout reached after ${page} pages, stopping`);
        break;
      }
      
      const params = new URLSearchParams({
        limit: '500',
        active: 'true',
        archived: 'false',
        closed: 'false',
      });
      
      if (page > 0) {
        params.set('offset', String(page * 500));
      }
      
      try {
        // Add timeout to individual fetch (5 seconds per page)
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => fetchController.abort(), 5000);
        
        const response = await fetch(
          `${API_URL}/events/pagination?${params.toString()}`,
          { 
            cache: 'no-store',
            signal: fetchController.signal
          }
        );
        
        clearTimeout(fetchTimeout);
        
        if (!response.ok) {
          if (page === 0) {
            console.error(`Polymarket getEventsBySport error: ${response.status}`);
            return [];
          }
          break;
        }
        
        const data = await response.json();
        const pageEvents = Array.isArray(data?.data) ? data.data : [];
        
        if (pageEvents.length === 0) {
          break;
        }
        
        // Check if this page contains game events
        const gamesOnThisPage = pageEvents.filter((event: any) => {
          const slug = (event.slug || '').toLowerCase();
          return gamePatternRegex.test(slug);
        });
        
        if (gamesOnThisPage.length > 0) {
          foundGames = true;
          pagesWithoutGames = 0; // Reset counter
          console.log(`[Polymarket] Found ${gamesOnThisPage.length} ${sport} game events at offset ${page * 500}`);
        } else {
          pagesWithoutGames++;
          // If we've already found games and now hit pages without games, we might be past the game section
          // But continue a bit more in case games are scattered
          if (foundGames && pagesWithoutGames >= maxPagesWithoutGames) {
            console.log(`[Polymarket] No more games found after ${pagesWithoutGames} pages, stopping search`);
            break;
          }
        }
        
        allEvents.push(...pageEvents);
        pagesFetched++;
        
        // If we got fewer than 500, we've reached the end
        if (pageEvents.length < 500) {
          break;
        }
      } catch (error: any) {
        // Handle timeout/abort errors gracefully
        if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
          console.log(`[Polymarket] Page ${page} fetch timeout, stopping fallback`);
          break;
        }
        console.error(`Polymarket getEventsBySport page ${page} error:`, error);
        if (page === 0) return [];
        break;
      }
    }
    
    // Dedupe by event ID
    const uniqueEvents = Array.from(
      new Map(allEvents.map((e: any) => [e.id, e])).values()
    );
    
    const totalGames = uniqueEvents.filter((e: any) => gamePatternRegex.test((e.slug || '').toLowerCase())).length;
    console.log(`[Polymarket] getEventsBySport("${sport}"): fetched ${uniqueEvents.length} unique events from ${allEvents.length} total (${pagesFetched} pages), found ${totalGames} game events`);
    
    const events = uniqueEvents;
    
    // Filter to include sport events, prioritizing actual games over futures/props
    const filtered = events.filter((event: any) => {
      if (!event.markets || !Array.isArray(event.markets) || event.markets.length === 0) return false;
      
      const eventSlug = (event.slug || '').toLowerCase();
      const eventTitle = (event.title || '').toLowerCase();
      const eventDescription = ((event.description || '') + ' ' + (event.question || '')).toLowerCase();
      
      // Check if this is a sport event
      const eventMatches = patterns.some(pattern => {
        const patternLower = pattern.toLowerCase();
        return eventSlug.includes(patternLower) || 
               eventTitle.includes(patternLower) ||
               eventDescription.includes(patternLower);
      });
      
      if (!eventMatches) {
        // Check markets for sport pattern
        const marketMatches = event.markets.some((market: any) => {
          const marketSlug = (market.slug || '').toLowerCase();
          const marketTitle = (market.question || market.title || '').toLowerCase();
          return patterns.some(pattern => {
            const patternLower = pattern.toLowerCase();
            return marketSlug.includes(patternLower) || marketTitle.includes(patternLower);
          });
        });
        if (!marketMatches) return false;
      }
      
      // Prefer actual game events over futures/props
      // Game events typically have slugs like: nfl-la-sea-2025-12-18 or nba-lal-gsw-2025-12-19
      // Futures/props have slugs like: nfl-mvp-2025, nba-champion-2026, etc.
      const isLikelyGame = eventSlug.match(/^(nfl|nba|nhl|cfb|cbb)-[a-z]{2,4}-[a-z]{2,4}-\d{4}-\d{2}-\d{2}/);
      const isFutureOrProp = eventSlug.match(/(mvp|champion|rookie|coach|player-of-the-year|stanley-cup|finals|playoff|award)/) ||
                            eventTitle.match(/(mvp|champion|rookie|coach|player of the year|stanley cup|finals|playoff|award)/i);
      
      // Include all sport events, but we'll prioritize games in matching
      return true;
    });
    
    console.log(`[Polymarket] getEventsBySport("${sport}"): filtered to ${filtered.length} ${sport} events from ${events.length} total`);
    
    // Log sample event slugs to see what we're getting
    if (filtered.length > 0) {
      const sampleSlugs = filtered.slice(0, 5).map((e: any) => e.slug || 'no-slug');
      console.log(`[Polymarket] Sample ${sport} event slugs: ${sampleSlugs.join(', ')}`);
    }
    
    return filtered
      .slice(0, limit)
      .map((event: any) => mapPolymarketEvent(event));
  } catch (error) {
    console.error('Polymarket getEventsBySport error:', error);
    return [];
  }
}

export async function searchPolymarket(query: string): Promise<MarketResult[]> {
  try {
    const combinedEvents: any[] = [];
    
    // Try multiple search approaches
    // 1. Direct search endpoint
    const directResponse = await fetch(
      `${API_URL}/events?q=${encodeURIComponent(
        query
      )}&limit=50&closed=false&order=volume`,
      { cache: 'no-store' }
    );

    if (directResponse.ok) {
      const directData = await directResponse.json();
      if (Array.isArray(directData)) {
        combinedEvents.push(...directData);
      } else if (directData?.data && Array.isArray(directData.data)) {
        combinedEvents.push(...directData.data);
      }
    }

    // 2. Try pagination endpoint with search
    const paginationResponse = await fetch(
      `${API_URL}/events/pagination?limit=200&active=true&archived=false&closed=false&order=volume&q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    );

    if (paginationResponse.ok) {
      const paginationJson = await paginationResponse.json();
      const paginationEvents = Array.isArray(paginationJson?.data)
        ? paginationJson.data
        : [];
      combinedEvents.push(...paginationEvents);
    }

    // 3. Fallback: get more trending markets and filter client-side
    // If API search returned few or no results, fetch multiple pages to search through
    // This helps find markets that the API search endpoint misses
    if (combinedEvents.length < 10) {
      console.log(`[Polymarket search] API search returned ${combinedEvents.length} results, fetching more markets for client-side filtering...`);
      
      // Fetch multiple pages (up to 5000 markets = 10 pages)
      const maxPages = 10;
      const perPage = 500;
      
      for (let page = 0; page < maxPages; page++) {
        try {
          const params = new URLSearchParams({
            limit: String(perPage),
            active: 'true',
            archived: 'false',
            closed: 'false',
          });
          
          if (page > 0) {
            params.set('offset', String(page * perPage));
          }
          
          const fallbackResponse = await fetch(
            `${API_URL}/events/pagination?${params.toString()}`,
            { cache: 'no-store' }
          );

          if (fallbackResponse.ok) {
            const fallbackJson = await fallbackResponse.json();
            const fallbackEvents = Array.isArray(fallbackJson?.data)
              ? fallbackJson.data
              : [];
            
            if (fallbackEvents.length === 0) {
              break; // No more results
            }
            
            combinedEvents.push(...fallbackEvents);
            
            // If we have enough events now, we can break early after filtering
            // But let's get at least 2000-3000 to be safe
            if (combinedEvents.length >= 3000) {
              break;
            }
          } else {
            break; // API error, stop fetching
          }
        } catch (error) {
          console.error(`[Polymarket search] Error fetching page ${page}:`, error);
          break;
        }
      }
      
      console.log(`[Polymarket search] Fetched ${combinedEvents.length} total events for client-side filtering`);
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

    // Disable caching for large event requests (they exceed 2MB cache limit)
    const response = await fetch(
      `${API_URL}/events/pagination?${params.toString()}`,
      {
        cache: 'no-store', // Large responses can't be cached anyway
      }
    );

    if (!response.ok) {
      console.error('Polymarket trending error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    // Check response structure
    if (!data) {
      console.error('Polymarket API returned null/undefined data');
      return [];
    }
    
    // The API might return data directly as an array, or nested in a 'data' property
    let events: any[] = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (Array.isArray(data?.data)) {
      events = data.data;
    } else if (data?.events && Array.isArray(data.events)) {
      events = data.events;
    }
    
    console.log(`Polymarket API returned ${events.length} events. Response keys:`, Object.keys(data || {}));
    
    if (events.length === 0) {
      console.warn('Polymarket API returned empty events array. Full response structure:', {
        hasData: !!data,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        dataKeys: data ? Object.keys(data) : [],
        firstEventSample: data?.data?.[0] ? Object.keys(data.data[0]) : null,
      });
      return [];
    }

    // Log sample event (simplified)
    if (events.length > 0) {
      console.log(`[Polymarket] Sample event: "${events[0]?.title}" (${Array.isArray(events[0]?.markets) ? events[0].markets.length : 0} markets)`);
    }

    const mapped = events
      .map((event: any) => {
        try {
          const result = mapPolymarketEvent(event);
          if (!result || !result.id) {
            console.warn('mapPolymarketEvent returned invalid result:', { eventId: event?.id, result });
            return null;
          }
          return result;
        } catch (error) {
          console.error('Error mapping Polymarket event:', error, {
            eventId: event?.id,
            title: event?.title,
            hasMarkets: !!event?.markets,
            marketsLength: Array.isArray(event?.markets) ? event.markets.length : 0,
          });
          return null;
        }
      })
      .filter((m: any): m is MarketResult => m !== null && m !== undefined);

    console.log(`Polymarket mapped ${mapped.length} markets from ${events.length} events`);
    return mapped;
  } catch (error) {
    console.error('Polymarket trending fetch error:', error);
    return [];
  }
}

export async function getPolymarketEvent(
  id: string
): Promise<MarketResult | null> {
  try {
    const response = await fetch(`${API_URL}/events/${id}`, { cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 422) {
        // Try to get more info about why it failed
        const errorText = await response.text().catch(() => '');
        console.log(`[Polymarket] getEvent("${id}") returned 422. Error: ${errorText.substring(0, 200)}`);
      } else if (response.status !== 404) {
        console.log(`[Polymarket] getEvent("${id}") returned ${response.status}`);
      }
      return null;
    }
    const event = await response.json();
    if (!event || !event.markets || event.markets.length === 0) {
      return null;
    }
    return mapPolymarketEvent(event);
  } catch (error: any) {
    console.log(`[Polymarket] getEvent("${id}") error: ${error?.message || error}`);
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
  // Validate required fields
  if (!event || !event.id) {
    throw new Error('Invalid event: missing id');
  }
  
  if (!event.title) {
    console.warn('Event missing title:', event.id);
  }

  let outcomes = [];
  const markets = Array.isArray(event.markets) ? event.markets : [];
  
  // Detect sport context from market slug/link
  let sportContext = '';
  const firstMarket = markets[0];
  if (firstMarket?.slug) {
    const slug = firstMarket.slug.toLowerCase();
    if (slug.startsWith('nfl-') || slug.includes('/nfl/') || slug.includes('/sports/nfl/')) {
      sportContext = 'nfl';
    } else if (slug.startsWith('nba-') || slug.includes('/nba/') || slug.includes('/sports/nba/')) {
      sportContext = 'nba';
    } else if (slug.startsWith('nhl-') || slug.includes('/nhl/') || slug.includes('/sports/nhl/')) {
      sportContext = 'nhl';
    } else if (slug.startsWith('cfb-') || slug.includes('/cfb/') || slug.includes('/sports/cfb/')) {
      sportContext = 'cfb';
    } else if (slug.startsWith('cbb-') || slug.startsWith('cwbb-') || slug.includes('/cbb/') || slug.includes('/cwbb/') || slug.includes('/sports/cbb/')) {
      sportContext = 'cbb';
    }
  }
  
  // If no markets, we still want to create a market result, but log it
  if (markets.length === 0) {
    console.warn(`Event ${event.id} has no markets array or empty markets`);
  }

  // Helper to parse outcomePrices (can be string or array)
  const parseOutcomePrices = (outcomePrices: any): number[] => {
    if (Array.isArray(outcomePrices)) return outcomePrices.map(Number);
    if (typeof outcomePrices === 'string') {
      try {
        const parsed = JSON.parse(outcomePrices);
        return Array.isArray(parsed) ? parsed.map(Number) : [Number(parsed) || 0];
      } catch {
        return [0];
      }
    }
    return [0];
  };

  if (markets.length > 1) {
    outcomes = markets.map((m: any) => {
      const prices = parseOutcomePrices(m.outcomePrices);
      const firstPrice = prices[0] || 0;
      return {
        name: m.groupItemTitle || m.question,
        percentage: Math.round(firstPrice * 100),
        color: 'green',
        price: firstPrice,
      };
    });
  } else if (markets.length === 1) {
    const m = markets[0];
    const prices = parseOutcomePrices(m.outcomePrices);
    const yesPrice = prices[0] || 0;
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

  // Fallback if no outcomes were created
  if (outcomes.length === 0) {
    outcomes = [
      {
        name: 'Yes',
        percentage: 50,
        color: 'green',
        price: 0.5,
      },
      {
        name: 'No',
        percentage: 50,
        color: 'red',
        price: 0.5,
      },
    ];
  }

  outcomes.sort((a: any, b: any) => b.percentage - a.percentage);
  const displayOutcomes = outcomes.slice(0, 2);

  // Map child markets for active markets section
  const childMarkets = markets.map((m: any) => {
    const prices = parseOutcomePrices(m.outcomePrices);
    const yesPrice = (prices[0] || 0) * 100;
    const noPrice = (1 - (prices[0] || 0)) * 100;
    
    // Parse volume and liquidity (can be string or number)
    const marketVolume = typeof m.volume === 'string' 
      ? parseFloat(m.volume) || 0 
      : (m.volume || m.volumeNum || 0);
    const marketLiquidity = typeof m.liquidity === 'string'
      ? parseFloat(m.liquidity) || 0
      : (m.liquidity || m.liquidityNum || 0);
    
    return {
      name: m.groupItemTitle || m.question || event.title,
      shortName: m.groupItemTitle || m.question,
      yesPrice: Math.round(yesPrice),
      noPrice: Math.round(noPrice),
      probability: Math.round(yesPrice),
      volume: formatCurrency(marketVolume),
      liquidity: formatCurrency(marketLiquidity),
      ticker: m.id || m.clobTokenIds?.[0],
    };
  }).sort((a: any, b: any) => {
    const probDiff = (b.probability || 0) - (a.probability || 0);
    if (probDiff !== 0) return probDiff;
    const volA = typeof a.volume === 'string' ? parseFloat(a.volume.replace(/[^0-9.]/g, '')) || 0 : a.volume || 0;
    const volB = typeof b.volume === 'string' ? parseFloat(b.volume.replace(/[^0-9.]/g, '')) || 0 : b.volume || 0;
    return volB - volA;
  });

  // Get volume from event (can be string or number)
  const eventVolume = typeof event.volume === 'string' 
    ? parseFloat(event.volume) || 0 
    : (event.volume || event.volumeNum || 0);
  
  // Get liquidity from event (can be string or number)
  const eventLiquidity = typeof event.liquidity === 'string'
    ? parseFloat(event.liquidity) || 0
    : (event.liquidity || event.liquidityNum || 0);

  const result: any = {
    id: `polymarket:${event.id}`,
    platform: 'Polymarket',
    title: event.title,
    icon: event.image || '🔵',
    outcomes: displayOutcomes,
    volume: formatCurrency(eventVolume),
    liquidity: formatCurrency(eventLiquidity),
    // Store ISO date string (YYYY-MM-DD) for reliable date extraction and matching
    // Format for display can be done in the UI if needed
    date: event.endDate
      ? new Date(event.endDate).toISOString().split('T')[0] // YYYY-MM-DD format
      : '',
    link: markets[0]?.slug 
      ? `https://polymarket.com/event/${markets[0].slug}` 
      : (event.slug ? `https://polymarket.com/event/${event.slug}` : ''),
    markets: childMarkets,
  };
  
  // Add sport context if detected
  if (sportContext) {
    result.sportContext = sportContext;
  }
  
  return result;
}

function formatCurrency(value: number | string | undefined): string {
  // Convert to number if string
  const numValue = typeof value === 'string' 
    ? parseFloat(value) || 0 
    : (typeof value === 'number' ? value : 0);
  
  if (numValue >= 1e9) return '$' + (numValue / 1e9).toFixed(1) + 'B';
  if (numValue >= 1e6) return '$' + (numValue / 1e6).toFixed(1) + 'M';
  if (numValue >= 1e3) return '$' + (numValue / 1e3).toFixed(1) + 'K';
  return '$' + numValue.toFixed(0);
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

  if (activeTokens.length === 0) return []; // Return empty array instead of all events

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
      let allTermsMatch = true;
      
      activeTokens.forEach((token) => {
        const isShortTerm = token.length <= 3;
        let termMatched = false;
        
        fields.forEach((field) => {
          if (isShortTerm) {
            // Short terms (like "nfl", "agi") MUST match as whole words only
            const wordBoundaryRegex = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (wordBoundaryRegex.test(field)) {
              termMatched = true;
            }
          } else {
            // Longer terms can match as substring, but prefer whole word
            const wordBoundaryRegex = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (wordBoundaryRegex.test(field) || field.includes(token)) {
              termMatched = true;
            }
          }
        });
        
        if (termMatched) {
          matches += 1;
        } else {
          allTermsMatch = false;
        }
      });

      return {
        event,
        matches,
        allTermsMatch,
      };
    })
    .filter((entry) => {
      // STRICT: Only return if ALL terms matched (or at least 70% for longer queries)
      const requiredMatches = activeTokens.length <= 2 
        ? activeTokens.length 
        : Math.ceil(activeTokens.length * 0.7);
      return entry.matches >= requiredMatches;
    });

  // Return empty array if no matches found (don't return all events)
  if (scored.length === 0) return [];

  return scored
    .sort((a, b) => {
      // Prioritize events where all terms matched
      if (a.allTermsMatch !== b.allTermsMatch) {
        return b.allTermsMatch ? 1 : -1;
      }
      if (b.matches !== a.matches) return b.matches - a.matches;
      const volA = a.event.volume || 0;
      const volB = b.event.volume || 0;
      return volB - volA;
    })
    .map((entry) => entry.event);
}
