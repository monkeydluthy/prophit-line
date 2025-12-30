/**
 * Event Extraction Utilities
 * 
 * Extracts teams, dates, and creates event signatures from market titles
 * for matching sports events across platforms.
 */

import { MarketResult } from '@/types';

// Team name normalization map (nickname -> normalized name)
// This helps match "Rams" with "Los Angeles Rams" or "LA Rams"
const TEAM_NICKNAMES: Record<string, string> = {
  // NFL
  saints: 'saints',
  buccaneers: 'buccaneers',
  bucs: 'buccaneers',
  packers: 'packers',
  chiefs: 'chiefs',
  '49ers': '49ers',
  niners: '49ers',
  bills: 'bills',
  bengals: 'bengals',
  ravens: 'ravens',
  patriots: 'patriots',
  cowboys: 'cowboys',
  eagles: 'eagles',
  rams: 'rams',
  chargers: 'chargers',
  giants: 'giants',
  jets: 'jets',
  bears: 'bears',
  dolphins: 'dolphins',
  falcons: 'falcons',
  broncos: 'broncos',
  lions: 'lions',
  texans: 'texans',
  colts: 'colts',
  jaguars: 'jaguars',
  vikings: 'vikings',
  raiders: 'raiders',
  seahawks: 'seahawks',
  titans: 'titans',
  commanders: 'commanders',
  panthers: 'panthers',
  steelers: 'steelers',
  browns: 'browns',
  // NBA
  celtics: 'celtics',
  bucks: 'bucks',
  nuggets: 'nuggets',
  hornets: 'hornets',
  knicks: 'knicks',
  nets: 'nets',
  lakers: 'lakers',
  clippers: 'clippers',
  warriors: 'warriors',
  heat: 'heat',
  suns: 'suns',
  mavericks: 'mavericks',
  mavs: 'mavericks',
  rockets: 'rockets',
  spurs: 'spurs',
  thunder: 'thunder',
  'trail blazers': 'trail blazers',
  blazers: 'trail blazers',
  kings: 'kings',
  pelicans: 'pelicans',
  grizzlies: 'grizzlies',
  timberwolves: 'timberwolves',
  wolves: 'timberwolves',
  jazz: 'jazz',
  wizards: 'wizards',
  raptors: 'raptors',
  '76ers': '76ers',
  sixers: '76ers',
  pacers: 'pacers',
  cavaliers: 'cavaliers',
  cavs: 'cavaliers',
  pistons: 'pistons',
  magic: 'magic',
  hawks: 'hawks',
  // NHL
  avalanche: 'avalanche',
  bruins: 'bruins',
  blackhawks: 'blackhawks',
  canes: 'canes',
  blues: 'blues',
  'blue jackets': 'blue jackets',
  capitals: 'capitals',
  caps: 'capitals',
  canucks: 'canucks',
  flames: 'flames',
  flyers: 'flyers',
  islanders: 'islanders',
  lightning: 'lightning',
  'maple leafs': 'maple leafs',
  leafs: 'maple leafs',
  oilers: 'oilers',
  penguins: 'penguins',
  pens: 'penguins',
  predators: 'predators',
  preds: 'predators',
  rangers: 'rangers',
  'red wings': 'red wings',
  wings: 'red wings',
  sharks: 'sharks',
  wild: 'wild',
  stars: 'stars',
  sabres: 'sabres',
  devils: 'devils',
  senators: 'senators',
  sens: 'senators',
  kraken: 'kraken',
  'golden knights': 'golden knights',
  knights: 'golden knights',
  // College Football (Major Programs)
  'crimson tide': 'alabama',
  tide: 'alabama',
  'fighting irish': 'notre dame',
  wolverines: 'michigan',
  bulldogs: 'georgia', // Context-dependent
  'longhorns': 'texas',
  'trojans': 'usc',
  'trojan': 'usc',
  'sooners': 'oklahoma',
  'badgers': 'wisconsin',
  'seminoles': 'florida state',
  'ducks': 'oregon', // Context-dependent with NHL
  'hurricanes': 'miami', // Context-dependent with NHL
  'huskies': 'washington', // Context-dependent (Washington or UConn)
  'cougars': 'washington state', // Context-dependent
  'wildcats': 'kentucky', // Context-dependent (multiple schools use this)
  'cardinals': 'louisville', // Context-dependent with NFL
  'bearcats': 'cincinnati',
  'spartans': 'michigan state',
  'nittany lions': 'penn state',
  'hawkeyes': 'iowa',
  // College Basketball (Major Programs)
  'tar heels': 'north carolina',
  'blue devils': 'duke',
  'jayhawks': 'kansas',
  'aztecs': 'san diego state',
  'mountaineers': 'west virginia',
  'hoosiers': 'indiana',
  'boilermakers': 'purdue',
  'razorbacks': 'arkansas',
  'tigers': 'auburn', // Context-dependent
  'gators': 'florida',
  'volunteers': 'tennessee',
  'aggies': 'texas a&m',
  'buckeyes': 'ohio state',
};

// City/abbreviation mappings to team nicknames
const CITY_TO_TEAM: Record<string, string> = {
  // NFL
  'new orleans': 'saints',
  'nola': 'saints',
  'no': 'saints',
  'tampa bay': 'buccaneers',
  'tampa': 'buccaneers',
  'tb': 'buccaneers',
  'green bay': 'packers',
  'gb': 'packers',
  'kansas city': 'chiefs',
  'kc': 'chiefs',
  'san francisco': '49ers',
  'sf': '49ers',
  'buffalo': 'bills',
  'buf': 'bills',
  'cincinnati': 'bengals',
  'cin': 'bengals',
  'baltimore': 'ravens',
  'bal': 'ravens',
  'new england': 'patriots',
  'ne': 'patriots',
  'dallas': 'cowboys',
  'dal': 'cowboys',
  'philadelphia': 'eagles',
  'phi': 'eagles',
  'los angeles': 'rams', // Note: Could be Rams or Chargers, but Rams more common
  'la': 'rams',
  'new york': 'giants', // Note: Could be Giants or Jets
  'ny': 'giants',
  'nyg': 'giants',
  'nyj': 'jets',
  'chicago': 'bears',
  'chi': 'bears',
  'miami': 'dolphins',
  'mia': 'dolphins',
  'atlanta': 'falcons',
  'atl': 'falcons',
  'denver': 'broncos',
  'den': 'broncos',
  'detroit': 'lions',
  'det': 'lions',
  'houston': 'texans',
  'hou': 'texans',
  'indianapolis': 'colts',
  'ind': 'colts',
  'jacksonville': 'jaguars',
  'jax': 'jaguars',
  'minnesota': 'vikings',
  'min': 'vikings',
  'las vegas': 'raiders',
  'vegas': 'raiders',
  'lv': 'raiders',
  'seattle': 'seahawks',
  'sea': 'seahawks',
  'tennessee': 'titans',
  'ten': 'titans',
  'washington': 'commanders',
  'was': 'commanders',
  'carolina': 'panthers',
  'car': 'panthers',
  'arizona': 'cardinals',
  'ari': 'cardinals',
  'pittsburgh': 'steelers',
  'pit': 'steelers',
  'cleveland': 'browns',
  'cle': 'browns',
  // NBA
  'boston': 'celtics',
  'milwaukee': 'bucks',
  'phoenix': 'suns',
  'golden state': 'warriors',
  'san antonio': 'spurs',
  'portland': 'trail blazers',
  'sacramento': 'kings',
  'memphis': 'grizzlies',
  'utah': 'jazz',
  'toronto': 'raptors',
  'indiana': 'pacers',
  'orlando': 'magic',
  'charlotte': 'hornets',
  'oklahoma city': 'thunder',
  // NHL
  'colorado': 'avalanche',
  'st louis': 'blues',
  'columbus': 'blue jackets',
  'calgary': 'flames',
  'edmonton': 'oilers',
  'nashville': 'predators',
  'anaheim': 'ducks',
  'san jose': 'sharks',
  'new jersey': 'devils',
  'ottawa': 'senators',
  // College (major programs - context helps disambiguate)
  'alabama': 'crimson tide',
  'clemson': 'tigers',
  'notre dame': 'fighting irish',
  'ohio state': 'buckeyes',
  'michigan': 'wolverines',
  'georgia': 'bulldogs',
  'texas': 'longhorns',
  'florida': 'gators',
  'usc': 'trojan',
  'oklahoma': 'sooners',
  'wisconsin': 'badgers',
  'florida state': 'seminoles',
  'oregon': 'ducks',
  'kentucky': 'wildcats',
  'louisville': 'cardinals',
  'michigan state': 'spartans',
  'penn state': 'nittany lions',
  'iowa': 'hawkeyes',
  'north carolina': 'tar heels',
  'duke': 'blue devils',
  'kansas': 'jayhawks',
  'uconn': 'huskies',
  'west virginia': 'mountaineers',
  'purdue': 'boilermakers',
  'arkansas': 'razorbacks',
  'auburn': 'tigers',
  'texas a&m': 'aggies',
};

// All team names (nicknames + cities + abbreviations) for matching
const ALL_TEAM_NAMES = new Set([
  ...Object.keys(TEAM_NICKNAMES),
  ...Object.keys(CITY_TO_TEAM),
  ...Object.values(TEAM_NICKNAMES),
]);

/**
 * Extract team names from a string
 * Prioritizes team nicknames over city names to avoid ambiguity
 */
export function extractTeams(text: string): string[] {
  const lower = text.toLowerCase();
  
  // Skip if text is clearly not about sports (e.g., "Min Arctic sea ice", "Minimum", etc.)
  if (/\b(min|minimum|max|maximum|arctic|sea ice|climate|weather|temperature)\b/i.test(text) && 
      !/\b(sports|nfl|nba|nhl|football|basketball|hockey|game|vs|at)\b/i.test(text)) {
    return [];
  }
  
  const foundTeams: Set<string> = new Set();
  const foundCities: Set<string> = new Set();

  // First pass: Check for team nicknames (most specific, avoids ambiguity)
  // Sort by length (longest first) to match "trail blazers" before "blazers"
  const sortedNicknames = Object.entries(TEAM_NICKNAMES).sort((a, b) => b[0].length - a[0].length);
  
  for (const [nickname, normalized] of sortedNicknames) {
    const regex = new RegExp(`\\b${nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      foundTeams.add(normalized);
      // Mark that we found a nickname, so we don't need to use city mapping for this
      // For example, if we find "Timberwolves", we don't need to map "Minnesota" to "Vikings"
    }
  }

  // Second pass: Check for city names/abbreviations, but only if we haven't found a team nickname
  // that could be from that city. This helps avoid "Minnesota" -> "Vikings" when it's actually "Timberwolves"
  for (const [city, team] of Object.entries(CITY_TO_TEAM)) {
    // Skip if we already found a team that could be from this city
    // For example, if text has "Minnesota Timberwolves", we found "timberwolves" so skip "Minnesota" -> "Vikings"
    const cityRegex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (cityRegex.test(text)) {
      // Check if we already found a team nickname that could be from this city
      // This is a heuristic - if we found a specific team nickname, prefer that over city mapping
      let shouldUseCity = true;
      
      // For ambiguous cities, check if we already found a more specific team
      if (city === 'minnesota' || city === 'min') {
        // If we found Timberwolves, Wild, or Vikings, don't use city mapping
        if (foundTeams.has('timberwolves') || foundTeams.has('wild') || foundTeams.has('vikings')) {
          shouldUseCity = false;
        } else {
          // No team nickname found - infer from context
          // Check if other team is NBA (Grizzlies, Lakers, etc.) -> Timberwolves
          // Check if other team is NFL (Packers, Bears, etc.) -> Vikings
          // Check if other team is NHL (Wild, Blackhawks, etc.) -> Wild
          const nbaTeams = ['grizzlies', 'lakers', 'clippers', 'warriors', 'celtics', 'heat', 'knicks', 'nets', 'suns', 'mavericks', 'rockets', 'spurs', 'thunder', 'trail blazers', 'kings', 'pelicans', 'jazz', 'wizards', 'raptors', '76ers', 'pacers', 'cavaliers', 'pistons', 'magic', 'hawks', 'hornets', 'bucks', 'nuggets'];
          const nflTeams = ['packers', 'bears', 'lions', 'vikings'];
          const nhlTeams = ['wild', 'blackhawks'];
          
          // Check if any found team is NBA
          const hasNBATeam = Array.from(foundTeams).some(t => nbaTeams.includes(t));
          const hasNFLTeam = Array.from(foundTeams).some(t => nflTeams.includes(t));
          const hasNHLTeam = Array.from(foundTeams).some(t => nhlTeams.includes(t));
          
          if (hasNBATeam) {
            foundTeams.add('timberwolves');
            shouldUseCity = false;
          } else if (hasNFLTeam) {
            foundTeams.add('vikings');
            shouldUseCity = false;
          } else if (hasNHLTeam) {
            foundTeams.add('wild');
            shouldUseCity = false;
          } else {
            // Default to Timberwolves (NBA is more common in current season)
            foundTeams.add('timberwolves');
            shouldUseCity = false;
          }
        }
      } else if (city === 'los angeles' || city === 'la') {
        // If we found Lakers, Clippers, Rams, or Chargers, don't use city mapping
        if (foundTeams.has('lakers') || foundTeams.has('clippers') || foundTeams.has('rams') || foundTeams.has('chargers')) {
          shouldUseCity = false;
        }
      } else if (city === 'new york' || city === 'ny') {
        // If we found Knicks, Nets, Giants, Jets, Rangers, Islanders, don't use city mapping
        if (foundTeams.has('knicks') || foundTeams.has('nets') || foundTeams.has('giants') || 
            foundTeams.has('jets') || foundTeams.has('rangers') || foundTeams.has('islanders')) {
          shouldUseCity = false;
        }
      }
      
      if (shouldUseCity) {
        foundTeams.add(team);
        foundCities.add(city);
      }
    }
  }

  return Array.from(foundTeams);
}

/**
 * Validate that teams belong to the correct sport
 * Returns true if all teams are valid for the given sport
 */
export function validateTeamsForSport(teams: string[], sport: string): boolean {
  if (teams.length !== 2) return false;
  
  // Define teams by sport
  const nflTeams = new Set(['saints', 'buccaneers', 'packers', 'chiefs', '49ers', 'bills', 'bengals', 'ravens', 'patriots', 'cowboys', 'eagles', 'rams', 'chargers', 'giants', 'jets', 'bears', 'dolphins', 'falcons', 'broncos', 'lions', 'texans', 'colts', 'jaguars', 'vikings', 'raiders', 'seahawks', 'titans', 'commanders', 'panthers', 'cardinals', 'steelers', 'browns']);
  const nbaTeams = new Set(['celtics', 'bucks', 'nuggets', 'hornets', 'knicks', 'nets', 'lakers', 'clippers', 'warriors', 'heat', 'suns', 'mavericks', 'rockets', 'spurs', 'thunder', 'trail blazers', 'kings', 'pelicans', 'grizzlies', 'timberwolves', 'jazz', 'wizards', 'raptors', '76ers', 'pacers', 'cavaliers', 'pistons', 'magic', 'hawks']);
  const nhlTeams = new Set(['avalanche', 'bruins', 'blackhawks', 'hurricanes', 'blues', 'blue jackets', 'capitals', 'canucks', 'flames', 'flyers', 'islanders', 'lightning', 'maple leafs', 'oilers', 'penguins', 'predators', 'rangers', 'red wings', 'sharks', 'wild', 'stars', 'ducks', 'sabres', 'devils', 'senators', 'kraken', 'golden knights']);
  const cbbTeams = new Set(['tar heels', 'blue devils', 'jayhawks', 'aztecs', 'mountaineers', 'hoosiers', 'boilermakers', 'razorbacks', 'tigers', 'gators', 'volunteers', 'aggies', 'crimson tide', 'buckeyes', 'huskies', 'wildcats', 'cardinals', 'spartans', 'wolverines', 'bulldogs', 'longhorns', 'fighting irish', 'badgers', 'seminoles', 'cougars', 'bearcats', 'hawkeyes']);
  const cfbTeams = new Set(['crimson tide', 'tigers', 'fighting irish', 'buckeyes', 'wolverines', 'bulldogs', 'longhorns', 'gators', 'trojans', 'sooners', 'badgers', 'seminoles', 'ducks', 'hurricanes', 'huskies', 'cougars', 'wildcats', 'cardinals', 'bearcats', 'spartans', 'nittany lions', 'hawkeyes']);
  
  let sportTeams: Set<string>;
  switch (sport.toLowerCase()) {
    case 'nfl':
      sportTeams = nflTeams;
      break;
    case 'nba':
      sportTeams = nbaTeams;
      break;
    case 'nhl':
      sportTeams = nhlTeams;
      break;
    case 'cbb':
      sportTeams = cbbTeams;
      break;
    case 'cfb':
      sportTeams = cfbTeams;
      break;
    default:
      return true; // Unknown sport, allow all teams
  }
  
  // Both teams must belong to this sport
  return teams.every(team => sportTeams.has(team.toLowerCase()));
}

/**
 * Extract date from text (various formats: YYYY-MM-DD, Dec 18, 12/18, etc.)
 */
export function extractDate(text: string): string | null {
  const lower = text.toLowerCase();

  // Format: YYYY-MM-DD (e.g., 2025-12-18)
  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format: YYMMMDD (e.g., 25dec18)
  const kalshiMatch = text.match(/\b(\d{2})([a-z]{3})(\d{2})\b/i);
  if (kalshiMatch) {
    const [, yearShort, monthStr, day] = kalshiMatch;
    const year = parseInt(yearShort) < 50 ? `20${yearShort}` : `19${yearShort}`;
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = monthMap[monthStr.toLowerCase()];
    if (month) {
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  // Format: MM/DD/YYYY or MM/DD/YY
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (slashMatch) {
    const [, month, day, yearStr] = slashMatch;
    const year = yearStr.length === 2 ? (parseInt(yearStr) < 50 ? `20${yearStr}` : `19${yearStr}`) : yearStr;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format: Month DD, YYYY or Mon DD (e.g., Dec 18, 2025 or Dec 18)
  const monthNames: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const monthMatch = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/);
  if (monthMatch) {
    const [, monthStr, day, yearStr] = monthMatch;
    const month = monthNames[monthStr.toLowerCase()];
    if (month) {
      const year = yearStr || new Date().getFullYear().toString();
      return `${year}-${month}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extract event signature from market
 * Format: "team1-team2-date" (sorted teams alphabetically for consistency)
 */
export function extractEventSignature(market: MarketResult): string | null {
  const teams = extractTeams(market.title);
  const date = extractDate(market.title) || extractDate(market.id) || extractDate(market.date || '');

  // Need exactly 2 teams for a game
  if (teams.length !== 2) {
    return null;
  }

  // Sort teams alphabetically for consistent matching
  const sortedTeams = teams.sort();

  // Create signature: "team1-team2" or "team1-team2-date"
  if (date) {
    return `${sortedTeams[0]}-${sortedTeams[1]}-${date}`;
  } else {
    return `${sortedTeams[0]}-${sortedTeams[1]}`;
  }
}

/**
 * Extract which team an outcome represents
 * @param outcomeName - The outcome name (e.g., "Yes", "No", "Milwaukee Bucks")
 * @param marketTitle - The market title/question (e.g., "Minnesota Winner?")
 * @param eventTeams - Optional: Array of both teams in the event (e.g., ["bucks", "timberwolves"])
 *                     Used to determine the OTHER team when "Yes" on single-team questions
 */
export function extractTeamFromOutcome(
  outcomeName: string, 
  marketTitle: string,
  eventTeams?: string[],
  outcomeData?: any // Optional: outcome object that may contain teamName or yes_sub_title
): string | null {
  const outcomeLower = outcomeName.toLowerCase();
  const titleLower = marketTitle.toLowerCase();

  // FIRST: Check if outcomeData has teamName (from Kalshi yes_sub_title/no_sub_title)
  // This is the most reliable way to know which team an outcome refers to
  if (outcomeData?.teamName) {
    let teamName = outcomeData.teamName.toLowerCase().trim();
    // Map city names to team nicknames using CITY_TO_TEAM
    // e.g., "Milwaukee" -> "Bucks", "Minnesota" -> check context (could be Timberwolves, Vikings, etc.)
    if (CITY_TO_TEAM[teamName]) {
      // If we have event teams, prefer the team that matches the context
      if (eventTeams && eventTeams.length === 2) {
        const normalizedEventTeams = eventTeams.map(t => t.toLowerCase().trim());
        const cityTeam = CITY_TO_TEAM[teamName].toLowerCase();
        // Check if the city's default team is one of the event teams
        if (normalizedEventTeams.some(et => et === cityTeam || et.includes(cityTeam) || cityTeam.includes(et))) {
          return cityTeam;
        }
        // Otherwise, find which event team corresponds to this city using reverseCityMap logic
        // But for now, just use the city's default team
      }
      return CITY_TO_TEAM[teamName].toLowerCase();
    }
    // If not in CITY_TO_TEAM, return as-is (might already be a team nickname)
    return teamName;
  }

  // Extract teams from both outcome name and market title
  const outcomeTeams = extractTeams(outcomeName);
  const titleTeams = extractTeams(marketTitle);

  // If outcome name contains a team, use it (Polymarket case: "Milwaukee Bucks" outcome)
  if (outcomeTeams.length > 0) {
    return outcomeTeams[0];
  }

  // If outcome is "Yes" or "No", try to infer team from market title
  if (outcomeLower === 'yes' || outcomeLower === 'no') {
    // Extract teams from title
    if (titleTeams.length === 1) {
      // Single team in title (e.g., "Minnesota Winner?")
      // For Kalshi: "Yes" on "Minnesota Winner?" means the OTHER team wins (not Minnesota)
      // "No" on "Minnesota Winner?" means Minnesota wins
      let teamInQuestion = titleTeams[0];
      const teamInQLower = teamInQuestion.toLowerCase();
      
      // If event teams are provided, use them to resolve city-to-team mapping
      // e.g., if eventTeams = ["bucks", "timberwolves"] and teamInQuestion = "Minnesota",
      // we can match "Minnesota" to "timberwolves" even though CITY_TO_TEAM["minnesota"] = "vikings"
      if (eventTeams && eventTeams.length === 2) {
        const normalize = (name: string) => name.toLowerCase().trim();
        const eventTeamsNormalized = eventTeams.map(normalize);
        
        // Try to match the city/team in question to one of the event teams
        // Check if any event team relates to the teamInQuestion (city or nickname)
        let matchedTeam: string | null = null;
        
        // First, check all known city-to-team mappings that could apply to any event team
        // This handles cases like "Minnesota" -> "timberwolves" even though CITY_TO_TEAM["minnesota"] = "vikings"
        // We need to check if any event team could be from this city
        const reverseCityMap: Record<string, string[]> = {
          'minnesota': ['timberwolves', 'wild', 'vikings', 'twins'],
          'utah': ['jazz'],
          'toronto': ['raptors', 'maple leafs', 'blue jays'],
          'milwaukee': ['bucks', 'brewers'],
          'boston': ['celtics', 'bruins', 'red sox', 'patriots'],
          'los angeles': ['lakers', 'clippers', 'kings', 'dodgers', 'rams', 'chargers'],
          'new york': ['knicks', 'nets', 'rangers', 'islanders', 'yankees', 'mets', 'giants', 'jets'],
          'chicago': ['bulls', 'blackhawks', 'bears', 'cubs', 'white sox'],
          'miami': ['heat', 'dolphins', 'marlins'],
          'philadelphia': ['76ers', 'flyers', 'eagles', 'phillies'],
          'phoenix': ['suns', 'cardinals', 'diamondbacks'],
          'dallas': ['mavericks', 'stars', 'cowboys', 'rangers'],
          'denver': ['nuggets', 'avalanche', 'broncos', 'rockies'],
          'detroit': ['pistons', 'red wings', 'lions', 'tigers'],
          'houston': ['rockets', 'texans', 'astros'],
          'indiana': ['pacers', 'colts'],
          'indianapolis': ['pacers', 'colts'],
          'memphis': ['grizzlies'],
          'new orleans': ['pelicans', 'saints'],
          'oklahoma city': ['thunder'],
          'orlando': ['magic'],
          'portland': ['trail blazers'],
          'sacramento': ['kings'],
          'san antonio': ['spurs'],
          'washington': ['wizards', 'capitals', 'commanders', 'nationals'],
          'atlanta': ['hawks', 'falcons', 'braves'],
          'charlotte': ['hornets', 'panthers'],
          'cleveland': ['cavaliers', 'browns', 'guardians'],
          'golden state': ['warriors'],
          'brooklyn': ['nets'],
        };
        
        // Check if teamInQuestion is a city that could map to any of the event teams
        if (reverseCityMap[teamInQLower]) {
          const possibleTeams = reverseCityMap[teamInQLower];
          for (const eventTeam of eventTeams) {
            const eventTeamLower = normalize(eventTeam);
            // Check if event team matches any of the possible teams for this city
            if (possibleTeams.some(possibleTeam => {
              const possibleTeamLower = normalize(possibleTeam);
              return eventTeamLower === possibleTeamLower || 
                     eventTeamLower.includes(possibleTeamLower) || 
                     possibleTeamLower.includes(eventTeamLower);
            })) {
              matchedTeam = eventTeam;
              break;
            }
          }
        }
        
        // If no match yet, try direct matching
        if (!matchedTeam) {
          for (const eventTeam of eventTeams) {
            const eventTeamLower = normalize(eventTeam);
            // Direct match
            if (eventTeamLower === teamInQLower || 
                eventTeamLower.includes(teamInQLower) || 
                teamInQLower.includes(eventTeamLower)) {
              matchedTeam = eventTeam;
              break;
            }
            // Check if city maps to this team (original mapping)
            if (CITY_TO_TEAM[teamInQLower] === eventTeamLower) {
              matchedTeam = eventTeam;
              break;
            }
            // Check if event team's city matches
            const eventTeamCity = Object.entries(CITY_TO_TEAM).find(([city, team]) => team === eventTeamLower)?.[0];
            if (eventTeamCity === teamInQLower) {
              matchedTeam = eventTeam;
              break;
            }
          }
        }
        
        if (outcomeLower === 'yes') {
          // "Yes" = OTHER team wins
          if (matchedTeam) {
            // Find the OTHER team (not the matched one)
            const otherTeam = eventTeams.find(t => normalize(t) !== normalize(matchedTeam!));
            if (otherTeam) {
              return otherTeam;
            }
          } else {
            // Can't match team in question to event teams, try to find the other team anyway
            // This is a fallback - might not work correctly
            const otherTeam = eventTeams.find(t => {
              const tNormalized = normalize(t);
              return tNormalized !== teamInQLower && 
                     !tNormalized.includes(teamInQLower) && 
                     !teamInQLower.includes(tNormalized);
            });
            if (otherTeam) {
              return otherTeam;
            }
          }
          return null;
        } else {
          // "No" = the team in question wins
          return matchedTeam || teamInQuestion;
        }
      } else {
        // No event teams provided - use CITY_TO_TEAM mapping as fallback
        if (CITY_TO_TEAM[teamInQLower]) {
          teamInQuestion = CITY_TO_TEAM[teamInQLower];
        }
        
        if (outcomeLower === 'yes') {
          // Can't determine other team without event context
          return null;
        } else {
          // "No" = the team in question wins
          return teamInQuestion;
        }
      }
    } else if (titleTeams.length === 2) {
      // Two teams in title: "Yes" = first team wins, "No" = second team wins
      // Check title pattern to determine order (e.g., "Team A vs Team B" or "Team A @ Team B")
      const team1Index = titleLower.indexOf(titleTeams[0].toLowerCase());
      const team2Index = titleLower.indexOf(titleTeams[1].toLowerCase());
      
      // Determine which team comes first in the title
      const firstTeam = team1Index < team2Index ? titleTeams[0] : titleTeams[1];
      const secondTeam = team1Index < team2Index ? titleTeams[1] : titleTeams[0];
      
      if (outcomeLower === 'yes') {
        return firstTeam;
      } else {
        return secondTeam;
      }
    }
  }

  return null;
}

/**
 * Check if two markets represent the same event
 */
export function isSameEvent(market1: MarketResult, market2: MarketResult): boolean {
  const sig1 = extractEventSignature(market1);
  const sig2 = extractEventSignature(market2);

  if (!sig1 || !sig2) {
    return false;
  }

  // For strict date matching, both signatures must include dates and match exactly
  if (sig1.includes('-') && sig2.includes('-')) {
    // Count dashes: 2 = teams only, 3+ = teams + date
    const parts1 = sig1.split('-');
    const parts2 = sig2.split('-');
    
    // Both have dates
    if (parts1.length >= 3 && parts2.length >= 3) {
      // Must match exactly (teams + date)
      return sig1 === sig2;
    }
    
    // Both don't have dates (just teams)
    if (parts1.length === 2 && parts2.length === 2) {
      return sig1 === sig2;
    }
    
    // One has date, one doesn't - strict mode says no match
    return false;
  }

  // If one doesn't have a signature, they can't match
  return false;
}

/**
 * Check if two outcomes are opposing (Team A vs Team B)
 */
export function areOpposingOutcomes(
  outcome1Name: string,
  market1: MarketResult,
  outcome2Name: string,
  market2: MarketResult
): boolean {
  // Must be same event first
  if (!isSameEvent(market1, market2)) {
    return false;
  }

  // Extract teams from market titles to pass as event context
  const eventTeams = extractTeams(market1.title);
  if (eventTeams.length !== 2) {
    return false;
  }

  const team1FromOutcome1 = extractTeamFromOutcome(outcome1Name, market1.title, eventTeams);
  const team2FromOutcome2 = extractTeamFromOutcome(outcome2Name, market2.title, eventTeams);

  // If we can't determine teams from outcomes, check if outcomes are different
  if (!team1FromOutcome1 || !team2FromOutcome2) {
    // For binary markets, "Yes" vs "No" on same market = opposing
    // But we need same event, different outcomes
    // Let's check if the outcome names are different and both markets have team mentions
    const outcome1Teams = extractTeams(outcome1Name);
    const outcome2Teams = extractTeams(outcome2Name);
    
    if (outcome1Teams.length > 0 && outcome2Teams.length > 0) {
      // Both outcomes have team names
      return outcome1Teams[0] !== outcome2Teams[0] && 
             eventTeams.includes(outcome1Teams[0]) && 
             eventTeams.includes(outcome2Teams[0]);
    }
    
    return false;
  }

  // Teams must be different and both must be in the event
  return team1FromOutcome1 !== team2FromOutcome2 && 
         eventTeams.includes(team1FromOutcome1) && 
         eventTeams.includes(team2FromOutcome2);
}

