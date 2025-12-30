/**
 * Sports Arbitrage Service
 * 
 * Finds arbitrage opportunities in sports markets by matching events
 * across platforms and identifying opposing outcomes.
 */

import { MarketResult } from '@/types';
import { getFrontPageMarkets, parseVolume } from './marketService';
import { extractTeams, extractDate, isSameEvent, areOpposingOutcomes, extractTeamFromOutcome, validateTeamsForSport } from './eventExtraction';
import { ArbitrageOpportunity } from './arbitrageService';
import { searchPolymarket, getPolymarketEvent, getPolymarketEventsBySport } from './polymarket';
import { fetchKalshiEventsBySport } from './kalshi';

// Fee constants
const KALSHI_FEE = 0.02; // 2% conservative
const POLYMARKET_FEE = 0.0; // 0% platform fees

/**
 * Calculate optimal bet allocation for arbitrage
 */
interface ArbitrageCalculation {
  investment1: number; // Investment on market 1
  investment2: number; // Investment on market 2
  payout: number; // Guaranteed payout (same on both sides)
  fee1: number; // Fee for market 1
  fee2: number; // Fee for market 2
  totalFees: number;
  netProfit: number;
  roi: number; // Return on investment percentage
  isValid: boolean; // Whether arbitrage is profitable after fees
}

function calculateArbitrage(
  price1: number, // Price (0-1) for outcome 1
  price2: number, // Price (0-1) for outcome 2
  totalInvestment: number,
  fee1: number, // Fee rate for market 1 (e.g., 0.02 for 2%)
  fee2: number // Fee rate for market 2
): ArbitrageCalculation {
  // To equalize payouts:
  // investment1 / price1 = investment2 / price2
  // investment1 + investment2 = totalInvestment
  
  // Solving: investment1 = (totalInvestment * price1) / (price1 + price2)
  //          investment2 = (totalInvestment * price2) / (price1 + price2)
  
  const investment1 = (totalInvestment * price1) / (price1 + price2);
  const investment2 = (totalInvestment * price2) / (price1 + price2);
  
  // Payout is the same from both sides (before fees)
  const payout = investment1 / price1;
  
  // Calculate fees
  const fee1Amount = investment1 * fee1;
  const fee2Amount = investment2 * fee2;
  const totalFees = fee1Amount + fee2Amount;
  
  // Net profit after fees
  const netProfit = payout - totalInvestment - totalFees;
  
  // ROI
  const roi = (netProfit / totalInvestment) * 100;
  
  // Valid if profit > 0
  const isValid = netProfit > 0;
  
  return {
    investment1,
    investment2,
    payout,
    fee1: fee1Amount,
    fee2: fee2Amount,
    totalFees,
    netProfit,
    roi,
    isValid,
  };
}

/**
 * Find sports arbitrage opportunities
 * NEW APPROACH: Process each sport separately to avoid volume limits and cross-sport mismatches
 */
export async function findSportsArbitrage(
  limit: number = 200,
  minSpread: number = 0.01 // Minimum spread % to consider (lowered to show more opportunities, even small ones)
): Promise<ArbitrageOpportunity[]> {
  console.log(`[SportsArb] Starting sport-by-sport arbitrage search (limit: ${limit})...`);
  
  // Define sports to check (in priority order)
  const sports = ['nfl', 'nba', 'nhl', 'cbb', 'cfb'] as const;
  
  const allOpportunities: ArbitrageOpportunity[] = [];
  
  // Process each sport separately
  for (const sport of sports) {
    console.log(`\n[SportsArb] ===== Processing ${sport.toUpperCase()} =====`);
    const opportunities = await findArbitrageForSport(sport, limit, minSpread);
    allOpportunities.push(...opportunities);
    console.log(`[SportsArb] Found ${opportunities.length} ${sport.toUpperCase()} opportunities`);
  }
  
  console.log(`\n[SportsArb] ===== SUMMARY =====`);
  console.log(`[SportsArb] Total opportunities found: ${allOpportunities.length}`);
  
  return allOpportunities;
}

/**
 * Find arbitrage opportunities for a specific sport
 */
async function findArbitrageForSport(
  sport: string,
  limit: number,
  minSpread: number
): Promise<ArbitrageOpportunity[]> {
  // Fetch markets for this sport from both platforms using sport-specific endpoints
  const arbitrageLimit = Math.max(limit, 1000);
  
  // Fetch Kalshi markets using sport-specific series_ticker filter
  // Note: Kalshi API has a max limit of 1000, so fetchKalshiEventsBySport will cap it
  const kalshiMarkets = await fetchKalshiEventsBySport(sport, arbitrageLimit);
  
  // Fetch Polymarket markets using sport-specific endpoint
  // Use a much larger limit to catch future events that might not be in the top volume list
  const allPolyMarkets = await getPolymarketEventsBySport(sport, Math.max(arbitrageLimit, 5000));
  
  // Build a slug -> ID mapping for quick lookups
  // Extract actual Polymarket ID from stored ID (format: "polymarket:123456")
  const slugToIdMap = new Map<string, string>();
  for (const polyMarket of allPolyMarkets) {
    const slug = (polyMarket.link || '').replace('https://polymarket.com/event/', '').toLowerCase();
    if (slug && polyMarket.id) {
      // Extract actual ID (remove "polymarket:" prefix if present)
      const actualId = polyMarket.id.startsWith('polymarket:') 
        ? polyMarket.id.replace('polymarket:', '')
        : polyMarket.id;
      slugToIdMap.set(slug, actualId);
    }
  }
  
  console.log(`[SportsArb] Built slug->ID mapping with ${slugToIdMap.size} entries for ${sport.toUpperCase()}`);
  if (slugToIdMap.size > 0) {
    const sampleSlugs = Array.from(slugToIdMap.keys()).slice(0, 3);
    console.log(`[SportsArb] Sample slugs in mapping: ${sampleSlugs.join(', ')}`);
  }
  
  // Combine and filter to this sport only
  const allMarkets = [...kalshiMarkets, ...allPolyMarkets];
  
  console.log(`[SportsArb] Total markets before filtering: ${allMarkets.length} (${kalshiMarkets.length} Kalshi, ${allPolyMarkets.length} Polymarket)`);
  
  // Filter to this sport only from both platforms
  const sportMarkets = allMarkets.filter((market) => {
    // Must be from Kalshi or Polymarket
    if (market.platform !== 'Kalshi' && market.platform !== 'Polymarket') {
      return false;
    }
    
    // Determine sport context first (before filtering by teams)
    const marketLink = (market.link || '').toLowerCase();
    const title = (market.title || '').toLowerCase();
    const eventTicker = (market.id || '').replace(/^kalshi:/i, '').toUpperCase();
    
    // For Polymarket, extract teams from slug if available (format: sport-team1-team2-date)
    let teams: string[] = [];
    if (market.platform === 'Polymarket') {
      // Try to extract from slug first (e.g., "nfl-la-sea-2025-12-18")
      const slug = marketLink.replace('https://polymarket.com/event/', '').toLowerCase();
      const slugMatch = slug.match(/^(nfl|nba|nhl|cbb|cfb|cwbb)-([a-z]+)-([a-z]+)-(\d{4}-\d{2}-\d{2})/);
      if (slugMatch) {
        // Found teams in slug format
        teams = [slugMatch[2], slugMatch[3]];
      } else {
        // Fallback to title extraction
        teams = extractTeams(market.title);
      }
    } else {
      // For Kalshi, extract from title (or link if needed)
      teams = extractTeams(market.title);
      if (teams.length !== 2 && marketLink) {
        // Try extracting from Kalshi link/ID as backup
        const linkTeams = extractTeams(marketLink);
        if (linkTeams.length === 2) {
          teams = linkTeams;
        }
      }
    }
    
    // Must have exactly 2 teams
    if (teams.length !== 2) return false;
    
    let marketSport = '';
    
    // Sport detection logic - check Kalshi ticker format first, then Polymarket, then title
    if (sport === 'nfl') {
      // Kalshi uses KXNFLGAME format (e.g., KXNFLGAME-25DEC27BALGB)
      // Polymarket uses /event/nfl- format
      if (/KXNFLGAME/i.test(eventTicker) ||
          /\/event\/nfl-/i.test(marketLink) ||
          (/\b(nfl|football)\b/i.test(title) && !/\b(college|ncaa|cfb)\b/i.test(title))) {
        marketSport = 'nfl';
      }
    } else if (sport === 'nba') {
      // Kalshi uses KXNBAGAME format (e.g., KXNBAGAME-25DEC20PORSAC)
      if (/KXNBAGAME/i.test(eventTicker) ||
          /\/event\/nba-/i.test(marketLink) ||
          (/\b(nba|basketball)\b/i.test(title) && !/\b(college|ncaa)\b/i.test(title))) {
        marketSport = 'nba';
      }
    } else if (sport === 'nhl') {
      // Kalshi uses KXNHLGAME format (e.g., KXNHLGAME-25DEC21COLMIN)
      if (/KXNHLGAME/i.test(eventTicker) ||
          /\/event\/nhl-/i.test(marketLink) ||
          /\b(nhl|hockey)\b/i.test(title)) {
        marketSport = 'nhl';
      }
    } else if (sport === 'cfb') {
      // Kalshi uses KXNCAAFGAME format for college football (FBS games)
      if (/KXNCAAFGAME/i.test(eventTicker) ||
          /\/event\/cfb-/i.test(marketLink) ||
          /\b(cfb|college football)\b/i.test(title)) {
        marketSport = 'cfb';
      }
    } else if (sport === 'cbb') {
      // Kalshi uses KXNCAAMBGAME format (e.g., KXNCAAMBGAME-25DEC20SDSUARIZ)
      if (/KXNCAAMBGAME/i.test(eventTicker) ||
          /\/event\/cbb-/i.test(marketLink) ||
          /\/event\/cwbb-/i.test(marketLink) ||
          /\b(cbb|college basketball)\b/i.test(title) || 
          /\(w\)/i.test(title)) {
        marketSport = 'cbb';
      }
    }
    
    // Only include if it matches this sport
    const matches = marketSport === sport;
    
    // Debug logging for Kalshi markets that don't match
    if (market.platform === 'Kalshi' && !matches) {
      console.log(`[SportsArb] Kalshi market filtered out: "${market.title}" (ticker: ${eventTicker}, sport detected: ${marketSport || 'none'}, expected: ${sport})`);
    }
    
    return matches;
  });
  
  const kalshiCount = sportMarkets.filter(m => m.platform === 'Kalshi').length;
  const polyCount = sportMarkets.filter(m => m.platform === 'Polymarket').length;
  console.log(`[SportsArb] ${sport.toUpperCase()}: Found ${sportMarkets.length} markets (${kalshiCount} Kalshi, ${polyCount} Polymarket)`);
  
  // Log sample Kalshi markets that made it through
  if (kalshiCount > 0) {
    const sampleKalshi = sportMarkets.find(m => m.platform === 'Kalshi');
    if (sampleKalshi) {
      console.log(`[SportsArb] Sample Kalshi market: "${sampleKalshi.title}" (id: ${sampleKalshi.id})`);
    }
  }
  
  // Log sample Polymarket slugs to understand the format
  if (polyCount > 0) {
    const samplePoly = sportMarkets.find(m => m.platform === 'Polymarket');
    if (samplePoly) {
      const link = samplePoly.link || '';
      const slug = link.replace('https://polymarket.com/event/', '');
      console.log(`[SportsArb] Sample Polymarket slug format: "${slug}" (from link: "${link}")`);
    }
  }
  
  if (sportMarkets.length === 0) {
    return [];
  }
  
  // Assign sport context to all markets (they're already filtered, but assign for consistency)
  for (const market of sportMarkets) {
    (market as any).sportContext = sport;
  }
  
  // Group markets by event signature (within this sport only)
  // Use flexible date matching (±1 day) to handle timezone differences
  const eventGroups = new Map<string, MarketResult[]>();
  
  // Helper to find existing group with same teams and date within ±1 day
  const findMatchingGroup = (sortedTeams: string[], date: string | null): string | null => {
    if (!date) {
      // No date - match by teams only
      const noDateSig = `${sortedTeams[0]}-${sortedTeams[1]}`;
      return eventGroups.has(noDateSig) ? noDateSig : null;
    }
    
    // Try exact date first
    const exactSig = `${sortedTeams[0]}-${sortedTeams[1]}-${date}`;
    if (eventGroups.has(exactSig)) {
      return exactSig;
    }
    
    // Try ±1 day
    try {
      const dateObj = new Date(date);
      const prevDay = new Date(dateObj);
      prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dates = [
        prevDay.toISOString().split('T')[0],
        nextDay.toISOString().split('T')[0]
      ];
      
      for (const altDate of dates) {
        const altSig = `${sortedTeams[0]}-${sortedTeams[1]}-${altDate}`;
        if (eventGroups.has(altSig)) {
          return altSig; // Found existing group with nearby date
        }
      }
    } catch (e) {
      // Invalid date, fall through
    }
    
    return null;
  };
  
  for (const market of sportMarkets) {
    // Extract teams - try title first, then ID/link (for Kalshi "Combo" titles)
    let teams = extractTeams(market.title);
    
    // For Kalshi, also try extracting from ID if title doesn't have 2 teams
    // Kalshi titles like "Baltimore at Green Bay Winner?" should work, but if not, try ID
    if (teams.length !== 2 && market.platform === 'Kalshi') {
      // Kalshi event tickers like "KXNFLGAME-25DEC27BALGB" contain team abbreviations at the end
      // But for now, let's rely on title extraction which should work for "at" format
      // If title extraction fails, it might be a "Combo" market or unusual format
      if (market.title?.toLowerCase().includes('combo') || !market.title || teams.length === 0) {
        const idOrLink = (market.id || market.link || '').toLowerCase();
        const idTeams = extractTeams(idOrLink);
        if (idTeams.length === 2) {
          teams = idTeams;
        }
      }
    }
    
    // Refine teams based on sport context if needed
    if (sport === 'nba' && teams.includes('vikings')) {
      teams = teams.map(t => t === 'vikings' ? 'timberwolves' : t);
    } else if (sport === 'nhl' && teams.includes('vikings')) {
      teams = teams.map(t => t === 'vikings' ? 'wild' : t);
    }
    
    // Extract date - prioritize ID/link for Kalshi (tickers contain dates)
    const date = extractDate(market.link || '') || 
                 extractDate(market.id) || 
                 extractDate(market.title) ||
                 extractDate(market.date || '');
    
    // Validate teams belong to this sport (prevent cross-sport matches)
    if (teams.length !== 2 || !validateTeamsForSport(teams, sport)) {
      if (teams.length === 2) {
        console.log(`[SportsArb] Skipping ${sport.toUpperCase()} market with cross-sport teams: ${teams.join(' vs ')} (${market.title})`);
      }
      continue;
    }
    
    // Create signature
    const sortedTeams = teams.sort();
    
    // Try to find existing group with same teams and nearby date
    const existingGroup = findMatchingGroup(sortedTeams, date);
    
    if (existingGroup) {
      // Add to existing group (may have different date, but we merge them)
      eventGroups.get(existingGroup)!.push(market);
    } else {
      // Create new group
      const signature = date 
        ? `${sortedTeams[0]}-${sortedTeams[1]}-${date}`
        : `${sortedTeams[0]}-${sortedTeams[1]}`;
      eventGroups.set(signature, [market]);
    }
  }
  
  console.log(`[SportsArb] ${sport.toUpperCase()}: Found ${eventGroups.size} unique events`);
  
  // Now find arbitrage opportunities within this sport
  const opportunities: ArbitrageOpportunity[] = [];
  
  let eventsWithBothPlatforms = 0;
  let eventsProcessed = 0;
  
  for (const [signature, eventMarkets] of eventGroups.entries()) {
    eventsProcessed++;
    let kalshiMarkets = eventMarkets.filter(m => m.platform === 'Kalshi');
    let polymarketMarkets = eventMarkets.filter(m => m.platform === 'Polymarket');
    
    // If we have Kalshi markets but no Polymarket, try to find it in already-fetched events by slug
    // First, search through all already-fetched Polymarket events for this sport
    if (kalshiMarkets.length > 0 && polymarketMarkets.length === 0) {
      console.log(`[SportsArb] Attempting to find Polymarket event for "${signature}" in already-fetched events`);
      
      // Extract teams and date from signature for slug-based matching
      const parts = signature.split('-');
      const sigTeams = parts.slice(0, 2);
      const sigDate = parts.length >= 5 ? `${parts[2]}-${parts[3]}-${parts[4]}` : (parts.length >= 3 ? parts.slice(2).join('-') : null);
      
      // Team name to Polymarket abbreviation mapping
      const teamAbbrevs: Record<string, string> = {
        // NFL
        'rams': 'la', 'seahawks': 'sea', 'patriots': 'ne', 'jets': 'nyj',
        'giants': 'nyg', 'raiders': 'lv', 'jaguars': 'jax', 'colts': 'ind',
        'browns': 'cle', 'steelers': 'pit', 'bears': 'chi', '49ers': 'sf',
        'saints': 'no', 'titans': 'ten', 'bengals': 'cin', 'bills': 'buf',
        'dolphins': 'mia', 'cowboys': 'dal', 'eagles': 'phi', 'commanders': 'was',
        'packers': 'gb', 'lions': 'det', 'vikings': 'min', 'falcons': 'atl',
        'panthers': 'car', 'buccaneers': 'tb', 'cardinals': 'ari', 'chargers': 'lac',
        'chiefs': 'kc', 'broncos': 'den', 'ravens': 'bal', 'texans': 'hou',
        // NBA
        'lakers': 'lal', 'clippers': 'lac', 'warriors': 'gsw', 'suns': 'phx',
        'kings': 'sac', 'trail blazers': 'por', 'grizzlies': 'mem', 'mavericks': 'dal',
        'rockets': 'hou', 'spurs': 'sa', 'pelicans': 'no', 'thunder': 'okc',
        'celtics': 'bos', 'nets': 'bkn', 'knicks': 'ny', '76ers': 'phi',
        'raptors': 'tor', 'bulls': 'chi', 'cavaliers': 'cle', 'pistons': 'det',
        'pacers': 'ind', 'bucks': 'mil', 'hawks': 'atl', 'hornets': 'cha',
        'heat': 'mia', 'magic': 'orl', 'wizards': 'was', 'nuggets': 'den',
        'timberwolves': 'min', 'jazz': 'utah',
        // NHL (removed duplicates: panthers, kings, jets, stars conflict with NFL/NBA)
        'bruins': 'bos', 'sabres': 'buf', 'red wings': 'det',
        'canadiens': 'mtl', 'senators': 'ott', 'lightning': 'tb', 'maple leafs': 'tor',
        'hurricanes': 'car', 'blue jackets': 'cbj', 'devils': 'nj', 'islanders': 'nyi',
        'rangers': 'nyr', 'flyers': 'phi', 'penguins': 'pit', 'capitals': 'was',
        'blackhawks': 'chi', 'avalanche': 'col', 'wild': 'min',
        'predators': 'nsh', 'blues': 'stl', 'ducks': 'ana',
        'coyotes': 'ari', 'flames': 'cgy', 'oilers': 'edm',
        'sharks': 'sj', 'canucks': 'van', 'golden knights': 'vgk', 'kraken': 'sea',
      };
      
      const abbrev1 = teamAbbrevs[sigTeams[0]?.toLowerCase()] || sigTeams[0]?.substring(0, 3) || '';
      const abbrev2 = teamAbbrevs[sigTeams[1]?.toLowerCase()] || sigTeams[1]?.substring(0, 3) || '';
      
      // Search through all Polymarket markets we fetched for this sport
      for (const polyMarket of allPolyMarkets) {
        const polySlug = (polyMarket.link || '').replace('https://polymarket.com/event/', '').toLowerCase();
        
        // First, try slug-based matching (most reliable)
        if (sigDate && abbrev1 && abbrev2) {
          const expectedSlug1 = `${sport}-${abbrev1}-${abbrev2}-${sigDate}`.toLowerCase();
          const expectedSlug2 = `${sport}-${abbrev2}-${abbrev1}-${sigDate}`.toLowerCase();
          
          if (polySlug === expectedSlug1 || polySlug === expectedSlug2) {
            polymarketMarkets.push(polyMarket);
            console.log(`[SportsArb] ✓ Found matching Polymarket event by slug: "${polyMarket.title}" (slug: ${polySlug})`);
            break;
          }
          
          // Also try ±1 day variations
          if (sigDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const dateParts = sigDate.split('-');
            const year = dateParts[0];
            const month = dateParts[1];
            const day = parseInt(dateParts[2]);
            
            // Try day - 1
            if (day > 1) {
              const prevDay = String(day - 1).padStart(2, '0');
              const prevDate = `${year}-${month}-${prevDay}`;
              const prevSlug1 = `${sport}-${abbrev1}-${abbrev2}-${prevDate}`.toLowerCase();
              const prevSlug2 = `${sport}-${abbrev2}-${abbrev1}-${prevDate}`.toLowerCase();
              if (polySlug === prevSlug1 || polySlug === prevSlug2) {
                polymarketMarkets.push(polyMarket);
                console.log(`[SportsArb] ✓ Found matching Polymarket event by slug (date -1): "${polyMarket.title}" (slug: ${polySlug})`);
                break;
              }
            }
            
            // Try day + 1
            if (day < 28) {
              const nextDay = String(day + 1).padStart(2, '0');
              const nextDate = `${year}-${month}-${nextDay}`;
              const nextSlug1 = `${sport}-${abbrev1}-${abbrev2}-${nextDate}`.toLowerCase();
              const nextSlug2 = `${sport}-${abbrev2}-${abbrev1}-${nextDate}`.toLowerCase();
              if (polySlug === nextSlug1 || polySlug === nextSlug2) {
                polymarketMarkets.push(polyMarket);
                console.log(`[SportsArb] ✓ Found matching Polymarket event by slug (date +1): "${polyMarket.title}" (slug: ${polySlug})`);
                break;
              }
            }
          }
        }
        
        // Fallback: Check if this Polymarket event matches our signature by teams and date
        const polyTeams = extractTeams(polyMarket.title || '');
        const polyDate = extractDate(polyMarket.link || '') || extractDate(polyMarket.date || '');
        
        // Match by teams and date
        if (polyTeams.length === 2 && polyDate && sigDate) {
          const sortedPolyTeams = polyTeams.sort();
          const sortedSigTeams = sigTeams.sort();
          
          // Check if teams match (flexible matching)
          const teamsMatch = sortedPolyTeams[0] === sortedSigTeams[0] && sortedPolyTeams[1] === sortedSigTeams[1];
          
          // Check if date matches (±1 day)
          if (teamsMatch) {
            const dateMatch = polyDate === sigDate || 
              (Math.abs(new Date(polyDate).getTime() - new Date(sigDate).getTime()) < 2 * 24 * 60 * 60 * 1000);
            
            if (dateMatch) {
              polymarketMarkets.push(polyMarket);
              console.log(`[SportsArb] ✓ Found matching Polymarket event by teams/date: "${polyMarket.title}" (slug: ${polySlug})`);
              break;
            }
          }
        }
      }
      
      // If still not found, try constructing slug and searching in fetched events
      if (polymarketMarkets.length === 0) {
        console.log(`[SportsArb] Not found in initial fetch, attempting slug-based search for "${signature}"`);
        // Extract teams and date from signature (format: "team1-team2-date" or "team1-team2")
        // Note: Date format is YYYY-MM-DD, so it contains dashes. We need to handle this carefully.
        const parts = signature.split('-');
        let date: string | null = null;
        let abbrev1 = '';
        let abbrev2 = '';
        
        if (parts.length >= 2) {
          const team1 = parts[0];
          const team2 = parts[1];
          // Date is everything after the second dash (parts[2], parts[3], parts[4] = YYYY-MM-DD)
          // Or if there are more parts, it's parts[2] through parts[4] joined by '-'
          let dateFromSig: string | null = null;
          if (parts.length >= 5) {
            // Has full date: YYYY-MM-DD (parts[2], parts[3], parts[4])
            dateFromSig = `${parts[2]}-${parts[3]}-${parts[4]}`;
          } else if (parts.length >= 3) {
            // Might be just year, or partial date - check format
            const potentialDate = parts.slice(2).join('-');
            // If it looks like a date (YYYY-MM-DD or YYYY-MM or YYYY), try to use it
            if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(potentialDate)) {
              dateFromSig = potentialDate;
            }
          }
          
          // Get date from Kalshi market if not in signature
          date = dateFromSig;
          if (!date && kalshiMarkets.length > 0) {
            const kalshiDate = extractDate(kalshiMarkets[0].link || '') || 
                             extractDate(kalshiMarkets[0].id) ||
                             extractDate(kalshiMarkets[0].date || '');
            date = kalshiDate;
          }
          
          // Log the date we're working with
          console.log(`[SportsArb] Date extracted: "${date}" (from sig: "${dateFromSig}", from market: "${extractDate(kalshiMarkets[0]?.link || '') || extractDate(kalshiMarkets[0]?.id) || 'N/A'}")`);
          
          // Ensure date is in YYYY-MM-DD format
          if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            console.log(`[SportsArb] ⚠ Date format issue: "${date}" is not YYYY-MM-DD, attempting to fix...`);
            // Try to extract a proper date from the string
            const fixedDate = extractDate(date);
            if (fixedDate && /^\d{4}-\d{2}-\d{2}$/.test(fixedDate)) {
              date = fixedDate;
              console.log(`[SportsArb] ✓ Fixed date to: "${date}"`);
            } else {
              console.log(`[SportsArb] ✗ Could not fix date format, skipping direct fetch`);
              date = null;
            }
          }
          
          // Team name to Polymarket abbreviation mapping
          const teamAbbrevs: Record<string, string> = {
            // NFL
            'rams': 'la', 'seahawks': 'sea', 'patriots': 'ne', 'jets': 'nyj',
            'giants': 'nyg', 'raiders': 'lv', 'jaguars': 'jax', 'colts': 'ind',
            'browns': 'cle', 'steelers': 'pit', 'bears': 'chi', '49ers': 'sf',
            'saints': 'no', 'titans': 'ten', 'bengals': 'cin', 'bills': 'buf',
            'dolphins': 'mia', 'cowboys': 'dal', 'eagles': 'phi', 'commanders': 'was',
            'packers': 'gb', 'lions': 'det', 'vikings': 'min', 'falcons': 'atl',
            'panthers': 'car', 'buccaneers': 'tb', 'cardinals': 'ari', 'chargers': 'lac',
            'chiefs': 'kc', 'broncos': 'den', 'ravens': 'bal', 'texans': 'hou',
            // NBA
            'lakers': 'lal', 'clippers': 'lac', 'warriors': 'gsw', 'suns': 'phx',
            'kings': 'sac', 'trail blazers': 'por', 'grizzlies': 'mem', 'mavericks': 'dal',
            'rockets': 'hou', 'spurs': 'sa', 'pelicans': 'no', 'thunder': 'okc',
            'celtics': 'bos', 'nets': 'bkn', 'knicks': 'ny', '76ers': 'phi',
            'raptors': 'tor', 'bulls': 'chi', 'cavaliers': 'cle', 'pistons': 'det',
            'pacers': 'ind', 'bucks': 'mil', 'hawks': 'atl', 'hornets': 'cha',
            'heat': 'mia', 'magic': 'orl', 'wizards': 'was', 'nuggets': 'den',
            'timberwolves': 'min', 'jazz': 'utah',
            // NHL (removed duplicates: panthers, kings, jets, stars conflict with NFL/NBA)
            'bruins': 'bos', 'sabres': 'buf', 'red wings': 'det',
            'canadiens': 'mtl', 'senators': 'ott', 'lightning': 'tb', 'maple leafs': 'tor',
            'hurricanes': 'car', 'blue jackets': 'cbj', 'devils': 'nj', 'islanders': 'nyi',
            'rangers': 'nyr', 'flyers': 'phi', 'penguins': 'pit', 'capitals': 'was',
            'blackhawks': 'chi', 'avalanche': 'col', 'wild': 'min',
            'predators': 'nsh', 'blues': 'stl', 'ducks': 'ana',
            'coyotes': 'ari', 'flames': 'cgy', 'oilers': 'edm',
            'sharks': 'sj', 'canucks': 'van', 'golden knights': 'vgk', 'kraken': 'sea',
          };
          
          abbrev1 = teamAbbrevs[team1] || team1.substring(0, 3);
          abbrev2 = teamAbbrevs[team2] || team2.substring(0, 3);
        
          // Try both team orderings and date variations (±1 day)
        const datesToTry = date ? [
          date,
          date.replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
            const day = parseInt(d);
            if (day > 1) {
              return `${y}-${m}-${String(day - 1).padStart(2, '0')}`;
            }
            return date;
          }),
          date.replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => {
            const day = parseInt(d);
            if (day < 28) {
              return `${y}-${m}-${String(day + 1).padStart(2, '0')}`;
            }
            return date;
          }),
        ] : [null];
        
        // First, try to find in slug-to-ID mapping (from already-fetched events)
        // Then fetch full event details by ID for better matching
        for (const tryDate of datesToTry) {
          if (!tryDate || !/^\d{4}-\d{2}-\d{2}$/.test(tryDate)) continue;
          
          const slugs = [
            `${sport}-${abbrev1}-${abbrev2}-${tryDate}`.toLowerCase(),
            `${sport}-${abbrev2}-${abbrev1}-${tryDate}`.toLowerCase(),
          ];
          
          for (const slug of slugs) {
            // First check if we already have this event in allPolyMarkets
            const existingEvent = allPolyMarkets.find(m => {
              const mSlug = (m.link || '').replace('https://polymarket.com/event/', '').toLowerCase();
              return mSlug === slug;
            });
            
            if (existingEvent) {
              polymarketMarkets.push(existingEvent);
              console.log(`[SportsArb] ✓ Found Polymarket event in already-fetched events (slug: ${slug})`);
              break;
            }
            
            // If not found, try to get ID from mapping and fetch full details
            const eventId = slugToIdMap.get(slug);
            if (eventId) {
              // Found in mapping - fetch full event details by ID
              try {
                const polyEvent = await getPolymarketEvent(eventId);
                if (polyEvent && polyEvent.outcomes && polyEvent.outcomes.length > 0) {
                  polymarketMarkets.push(polyEvent);
                  console.log(`[SportsArb] ✓ Found Polymarket event via ID fetch (slug: ${slug}, ID: ${eventId})`);
                  break;
                }
              } catch (e: any) {
                console.log(`[SportsArb] Failed to fetch event by ID ${eventId}: ${e?.message || e}`);
              }
            }
          }
          
          if (polymarketMarkets.length > 0) break;
        }
        
        // Note: Search API doesn't work (returns 0 results for everything)
        // We can only match events that are in the fetched events (top 5000 by volume)
        if (polymarketMarkets.length === 0) {
          if (eventsProcessed <= 3) {
            console.log(`[SportsArb] ✗ Could not find Polymarket event for "${signature}" (not in top 5000 by volume)`);
          }
        }
      }
      
      // Final attempt: search through ALL fetched Polymarket events by slug pattern (should have been caught above, but double-check)
      if (polymarketMarkets.length === 0 && date && abbrev1 && abbrev2) {
        const expectedSlugs = [
          `${sport}-${abbrev1}-${abbrev2}-${date}`.toLowerCase(),
          `${sport}-${abbrev2}-${abbrev1}-${date}`.toLowerCase(),
        ];
        
        for (const expectedSlug of expectedSlugs) {
          const eventId = slugToIdMap.get(expectedSlug);
          if (eventId) {
            // Found in mapping - fetch by ID
            try {
              const polyEvent = await getPolymarketEvent(eventId);
              if (polyEvent && polyEvent.outcomes && polyEvent.outcomes.length > 0) {
                polymarketMarkets.push(polyEvent);
                console.log(`[SportsArb] ✓ Found Polymarket event by final slug->ID lookup: ${expectedSlug} (ID: ${eventId})`);
                break;
              }
            } catch (e: any) {
              console.log(`[SportsArb] Failed to fetch event by ID ${eventId}: ${e?.message || e}`);
            }
          }
        }
      }
      }
    }
    
    // Need both platforms
    if (kalshiMarkets.length === 0 || polymarketMarkets.length === 0) {
      if (eventsProcessed <= 5) {
        console.log(`[SportsArb] ${sport.toUpperCase()} Event "${signature}": ${kalshiMarkets.length} Kalshi, ${polymarketMarkets.length} Polymarket - skipping (missing platform)`);
      }
      continue;
    }
    
    eventsWithBothPlatforms++;
    
    // Filter to team win markets only (exclude player props, totals, etc.)
    // RELAXED: Allow markets that have team win outcomes, even if they also have spreads/totals
    const isTeamWinMarket = (market: MarketResult): boolean => {
      const title = (market.title || '').toLowerCase();
      const outcomes = market.outcomes || [];
      
      // Exclude markets with prop keywords in title (but allow if it's just the game title)
      const propKeywords = ['player', 'yards', 'touchdowns', 'rebounds', 'assists', 'goals', 'saves'];
      if (propKeywords.some(keyword => title.includes(keyword))) {
        return false;
      }
      
      // For Polymarket: If it has a team vs team outcome (like "Ravens vs. Packers"), allow it
      // even if it also has spreads/totals
      const hasTeamWinOutcome = outcomes.some(o => {
        const outcomeName = (o.name || '').toLowerCase();
        // Check if outcome looks like a team name (not a number/spread)
        // Allow team names, Yes/No, or outcomes without numbers/spread keywords
        return !/\d/.test(outcomeName) && 
               !outcomeName.includes('spread') && 
               !outcomeName.includes('over') && 
               !outcomeName.includes('under') &&
               !outcomeName.includes('o/u');
      });
      
      if (hasTeamWinOutcome) {
        return true;
      }
      
      // Exclude outcomes with numbers (e.g., "80+", "Over 45.5") - but only if NO team win outcomes exist
      if (outcomes.some(o => /\d/.test(o.name))) {
        return false;
      }
      
      // Allow "Yes"/"No" outcomes for binary team win markets
      // Allow team name outcomes
      return true;
    };
    
    const kalshiTeamWinMarkets = kalshiMarkets.filter(isTeamWinMarket);
    const polyTeamWinMarkets = polymarketMarkets.filter(isTeamWinMarket);
    
    // Log first few events with both platforms
    if (eventsWithBothPlatforms <= 3) {
      console.log(`\n[SportsArb] ${sport.toUpperCase()} Event "${signature}" (${eventsWithBothPlatforms}/${eventGroups.size} with both platforms):`);
      console.log(`  Total markets: ${eventMarkets.length} (${kalshiMarkets.length} Kalshi, ${polymarketMarkets.length} Polymarket)`);
      console.log(`  Team win markets: ${kalshiTeamWinMarkets.length} Kalshi, ${polyTeamWinMarkets.length} Polymarket`);
      
      if (kalshiMarkets.length > 0 && kalshiTeamWinMarkets.length === 0) {
        const sample = kalshiMarkets[0];
        console.log(`  ✗ Sample Kalshi market (filtered out): "${sample.title}"`);
        console.log(`    Outcomes: ${(sample.outcomes || []).map(o => `${o.name} (${(o.price * 100).toFixed(1)}%)`).join(', ')}`);
      }
      if (polymarketMarkets.length > 0 && polyTeamWinMarkets.length === 0) {
        const sample = polymarketMarkets[0];
        console.log(`  ✗ Sample Polymarket market (filtered out): "${sample.title}"`);
        console.log(`    Outcomes: ${(sample.outcomes || []).map(o => `${o.name} (${(o.price * 100).toFixed(1)}%)`).join(', ')}`);
      }
      if (kalshiTeamWinMarkets.length > 0) {
        const sample = kalshiTeamWinMarkets[0];
        console.log(`  ✓ Sample Kalshi team win market: "${sample.title}"`);
        console.log(`    Outcomes: ${(sample.outcomes || []).map(o => `${o.name} (${(o.price * 100).toFixed(1)}%)`).join(', ')}`);
      }
      if (polyTeamWinMarkets.length > 0) {
        const sample = polyTeamWinMarkets[0];
        console.log(`  ✓ Sample Polymarket team win market: "${sample.title}"`);
        console.log(`    Outcomes: ${(sample.outcomes || []).map(o => `${o.name} (${(o.price * 100).toFixed(1)}%)`).join(', ')}`);
      }
    }
    
    if (kalshiTeamWinMarkets.length === 0 || polyTeamWinMarkets.length === 0) {
      if (eventsWithBothPlatforms <= 3) {
        console.log(`  ⚠ No team win markets after filtering`);
      }
      continue;
    }
    
    // Try to find opposing outcomes
    let pairsChecked = 0;
    let skippedSameTeam = 0;
    let skippedNoTeam = 0;
    let skippedTeamMismatch = 0;
    let skippedNotProfitable = 0;
    
    for (const kalshiMarket of kalshiTeamWinMarkets) {
      for (const polyMarket of polyTeamWinMarkets) {
        // Find opposing outcomes
        for (const kOutcome of kalshiMarket.outcomes || []) {
          for (const pOutcome of polyMarket.outcomes || []) {
            pairsChecked++;
            
            // Check if outcomes are opposing
            // Pass event teams to help extractTeamFromOutcome determine the correct team
            // For Kalshi "Yes" on single-team questions, we need to know both teams to find the "other" team
            // Also pass the outcome object itself which may contain teamName from yes_sub_title
            const sigTeams = signature.split('-').slice(0, 2);
            const kTeam = extractTeamFromOutcome(kOutcome.name, kalshiMarket.title, sigTeams, kOutcome);
            const pTeam = extractTeamFromOutcome(pOutcome.name, polyMarket.title, sigTeams, pOutcome);
            
            // Log first few pairs for debugging
            if (pairsChecked <= 5 && eventsWithBothPlatforms <= 2) {
              console.log(`  Pair ${pairsChecked}: "${kalshiMarket.title}" (${kOutcome.name}) vs "${polyMarket.title}" (${pOutcome.name})`);
              console.log(`    Teams extracted: Kalshi=${kTeam || 'NONE'}, Polymarket=${pTeam || 'NONE'}`);
            }
            
            // RELAXED MATCHING: Since we're in the same event group (same signature),
            // we'll allow matches even if team extraction is imperfect.
            // We'll still validate when possible, but won't reject everything.
            
            // If we extracted teams successfully, do basic validation
            if (kTeam && pTeam) {
              // Skip if both outcomes represent the same team
              if (kTeam.toLowerCase().trim() === pTeam.toLowerCase().trim()) {
                skippedSameTeam++;
                continue;
              }
              
              // Try to validate against signature, but don't be too strict
              const normalizedSigTeams = sigTeams.map(t => t.toLowerCase().trim());
              const normalizedKTeam = kTeam.toLowerCase().trim();
              const normalizedPTeam = pTeam.toLowerCase().trim();
              
              const kTeamMatches = normalizedSigTeams.some(sigTeam => 
                normalizedKTeam === sigTeam || 
                normalizedKTeam.includes(sigTeam) || 
                sigTeam.includes(normalizedKTeam)
              );
              const pTeamMatches = normalizedSigTeams.some(sigTeam => 
                normalizedPTeam === sigTeam || 
                normalizedPTeam.includes(sigTeam) || 
                sigTeam.includes(normalizedPTeam)
              );
              
              // If teams match signature, great. If not, still allow it since we're in same event group
              if (!kTeamMatches || !pTeamMatches) {
                // Log but continue - team extraction might be imperfect but markets are for same game
                if (pairsChecked <= 10 && eventsWithBothPlatforms <= 3) {
                  console.log(`    ⚠ Team validation weak but allowing (same event): sigTeams=[${sigTeams.join(', ')}], kTeam=${kTeam}, pTeam=${pTeam}`);
                }
              }
            } else if (!kTeam || !pTeam) {
              // Couldn't extract one or both teams, but markets are in same event group
              // Allow it - they're already grouped by the same teams/date
              skippedNoTeam++;
              if (pairsChecked <= 10 && eventsWithBothPlatforms <= 3) {
                console.log(`    ⚠ No team extracted but allowing (same event): kTeam=${kTeam || 'NONE'}, pTeam=${pTeam || 'NONE'}`);
              }
              // Continue to allow the match
            }
            
            // Calculate arbitrage
            const price1 = kOutcome.price;
            const price2 = pOutcome.price;
            const investment = 1000; // Default investment
            
            const calc = calculateArbitrage(price1, price2, investment, KALSHI_FEE, POLYMARKET_FEE);
            
            // Filter by minimum ROI
            if (calc.isValid && calc.roi >= minSpread) {
              if (opportunities.length === 0) {
                console.log(`  ✓ FOUND FIRST OPPORTUNITY! "${signature}" - ROI: ${calc.roi.toFixed(2)}%`);
              }
              // Determine which is best buy (lower price) and best sell (higher price)
              const bestBuy = price1 <= price2 
                ? { market: kalshiMarket, price: price1, outcomeIndex: kalshiMarket.outcomes.indexOf(kOutcome) }
                : { market: polyMarket, price: price2, outcomeIndex: polyMarket.outcomes.indexOf(pOutcome) };
              const bestSell = price1 <= price2
                ? { market: polyMarket, price: price2, outcomeIndex: polyMarket.outcomes.indexOf(pOutcome) }
                : { market: kalshiMarket, price: price1, outcomeIndex: kalshiMarket.outcomes.indexOf(kOutcome) };
              
              const spread = ((price2 - price1) / Math.min(price1, price2)) * 100;
              const sigTeams = signature.split('-').slice(0, 2);
              
              opportunities.push({
                id: `sports-arb-${kalshiMarket.id}-${polyMarket.id}-${kOutcome.name}-${pOutcome.name}`,
                markets: [kalshiMarket, polyMarket],
                spread: calc.roi,
                maxSpread: spread,
                bestBuy: {
                  market: bestBuy.market,
                  price: bestBuy.price,
                  platform: bestBuy.market.platform,
                  outcomeIndex: bestBuy.outcomeIndex,
                },
                bestSell: {
                  market: bestSell.market,
                  price: bestSell.price,
                  platform: bestSell.market.platform,
                  outcomeIndex: bestSell.outcomeIndex,
                },
                totalVolume: parseVolume(kalshiMarket.volume || 0) + parseVolume(polyMarket.volume || 0),
                avgLiquidity: (parseVolume(kalshiMarket.liquidity || 0) + parseVolume(polyMarket.liquidity || 0)) / 2,
                title: `${sigTeams[0]} vs ${sigTeams[1]}`,
                confidenceTier: 'high' as const,
              });
            } else {
              skippedNotProfitable++;
            }
          }
        }
      }
    }
    
    // Log summary for first few events
    if (eventsWithBothPlatforms <= 3) {
      console.log(`  Summary: checked ${pairsChecked} pairs, skipped: ${skippedSameTeam} same team, ${skippedNoTeam} no team, ${skippedTeamMismatch} team mismatch, ${skippedNotProfitable} not profitable`);
    }
  }
  
  console.log(`[SportsArb] ${sport.toUpperCase()} Summary: ${eventsWithBothPlatforms} events with both platforms, ${opportunities.length} opportunities found`);
  
  // Deduplicate opportunities by event signature (same game)
  // Keep only the best opportunity (highest spread) for each unique game
  const deduplicatedMap = new Map<string, ArbitrageOpportunity>();
  
  for (const opp of opportunities) {
    // Extract event signature from title (e.g., "Celtics vs Raptors" -> "celtics-raptors")
    // Handle variations: "vs", "Vs", "VS", "v", etc.
    const titleLower = opp.title.toLowerCase();
    const teams = titleLower
      .split(/\s+(?:vs|v\.?)\s+/i)
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .sort();
    
    if (teams.length !== 2) {
      // Fallback: if we can't parse teams from title, use the full title as signature
      const eventSig = titleLower;
      if (!deduplicatedMap.has(eventSig) || opp.maxSpread > deduplicatedMap.get(eventSig)!.maxSpread) {
        deduplicatedMap.set(eventSig, opp);
      }
      continue;
    }
    
    const eventSig = teams.join('-');
    
    // If we already have an opportunity for this event, keep the one with higher spread
    if (deduplicatedMap.has(eventSig)) {
      const existing = deduplicatedMap.get(eventSig)!;
      if (opp.maxSpread > existing.maxSpread) {
        deduplicatedMap.set(eventSig, opp);
      }
    } else {
      deduplicatedMap.set(eventSig, opp);
    }
  }
  
  const deduplicated = Array.from(deduplicatedMap.values());
  
  if (opportunities.length > deduplicated.length) {
    console.log(`[SportsArb] ${sport.toUpperCase()} Deduplication: ${opportunities.length} -> ${deduplicated.length} opportunities (removed ${opportunities.length - deduplicated.length} duplicates)`);
  }
  
  return deduplicated;
}

/**
 * Calculate arbitrage for a given investment amount
 */
export function calculateArbitrageForInvestment(
  opportunity: ArbitrageOpportunity,
  investmentAmount: number
): ArbitrageCalculation {
  const price1 = opportunity.bestBuy.price;
  const price2 = opportunity.bestSell.price;
  
  const fee1 = opportunity.bestBuy.platform === 'Kalshi' ? KALSHI_FEE : POLYMARKET_FEE;
  const fee2 = opportunity.bestSell.platform === 'Kalshi' ? KALSHI_FEE : POLYMARKET_FEE;
  
  return calculateArbitrage(price1, price2, investmentAmount, fee1, fee2);
}
