import { MarketResult } from '@/types';
import { getFrontPageMarkets, parseVolume } from './marketService';

export interface ArbitrageOpportunity {
  id: string;
  markets: MarketResult[];
  spread: number; // Percentage spread (0-100)
  maxSpread: number; // Maximum percentage difference
  bestBuy: {
    market: MarketResult;
    price: number;
    platform: string;
    outcomeIndex?: number; // Index of the matched outcome
  };
  bestSell: {
    market: MarketResult;
    price: number;
    platform: string;
    outcomeIndex?: number; // Index of the matched outcome
  };
  totalVolume: number;
  avgLiquidity: number;
  title: string; // Normalized title
  confidenceTier?: 'high' | 'medium' | 'low'; // Match confidence tier (like Matchr.xyz)
  similarityScore?: number; // Embedding similarity score (0-1)
}

/**
 * Calculate text similarity between two strings using improved matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Exact match check
  if (s1 === s2) return 1.0;

  // Check if one contains the other (for partial matches)
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return (shorter / longer) * 0.9; // 90% weight for substring matches
  }

  // Tokenize and check for common words
  const words1 = s1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = s2.split(/\s+/).filter((w) => w.length > 0);
  const commonWords = words1.filter((w) => words2.includes(w));

  // Word overlap similarity
  const wordSimilarity =
    (commonWords.length * 2) / (words1.length + words2.length);

  // Check for key terms (longer words that are more important)
  const keyTerms1 = words1.filter((w) => w.length > 3);
  const keyTerms2 = words2.filter((w) => w.length > 3);
  const matchingKeyTerms = keyTerms1.filter((t1) =>
    keyTerms2.some((t2) => {
      // Exact match
      if (t1 === t2) return true;
      // Substring match (one contains the other)
      if (t1.includes(t2) || t2.includes(t1)) return true;
      // Fuzzy match (similarity > 0.7)
      const similarity = calculateWordSimilarity(t1, t2);
      return similarity > 0.7;
    })
  );

  const keyTermSimilarity =
    matchingKeyTerms.length / Math.max(keyTerms1.length, keyTerms2.length, 1);

  // Combine similarities with weights
  return Math.max(
    wordSimilarity,
    keyTermSimilarity * 0.85,
    wordSimilarity * 0.6 + keyTermSimilarity * 0.4
  );
}

/**
 * Calculate similarity between two words (simple Levenshtein-like)
 */
function calculateWordSimilarity(word1: string, word2: string): number {
  if (word1 === word2) return 1.0;
  if (word1.includes(word2) || word2.includes(word1)) return 0.8;

  // Simple character overlap
  const chars1 = new Set(word1.split(''));
  const chars2 = new Set(word2.split(''));
  const commonChars = [...chars1].filter((c) => chars2.has(c)).length;
  const totalChars = Math.max(chars1.size, chars2.size);

  return commonChars / totalChars;
}

/**
 * Normalize market title for matching (removes punctuation and filler words)
 * Enhanced version based on Matchr's approach
 */
/**
 * Enhanced title normalization (like Matchr.xyz does)
 * Aggressively normalizes titles for better matching
 */
function normalizeTitle(title: string): string {
  if (!title) return '';

  let normalized = title.toLowerCase();

  // CRITICAL: Normalize team names FIRST (before removing words)
  // This ensures "Saints" becomes "New Orleans" and "Buccaneers" becomes "Tampa Bay"
  const teamNameMap: Record<string, string> = {
    // NFL teams - map nickname to city
    saints: 'new orleans',
    buccaneers: 'tampa bay',
    bucs: 'tampa bay',
    packers: 'green bay',
    chiefs: 'kansas city',
    '49ers': 'san francisco',
    bills: 'buffalo',
    bengals: 'cincinnati',
    ravens: 'baltimore',
    patriots: 'new england',
    cowboys: 'dallas',
    eagles: 'philadelphia',
    rams: 'los angeles',
    chargers: 'los angeles',
    giants: 'new york',
    jets: 'new york',
    bears: 'chicago',
    dolphins: 'miami',
    falcons: 'atlanta',
    broncos: 'denver',
    lions: 'detroit',
    texans: 'houston',
    colts: 'indianapolis',
    jaguars: 'jacksonville',
    vikings: 'minnesota',
    raiders: 'las vegas',
    seahawks: 'seattle',
    titans: 'tennessee',
    commanders: 'washington',
    panthers: 'carolina',
    cardinals: 'arizona',
    steelers: 'pittsburgh',
    browns: 'cleveland',
  };

  // Replace team nicknames with city names
  for (const [nickname, city] of Object.entries(teamNameMap)) {
    // Match whole word only (not "saints" in "saintly")
    const regex = new RegExp(`\\b${nickname}\\b`, 'gi');
    normalized = normalized.replace(regex, city);
  }

  // Now normalize the rest
  normalized = normalized
    // Remove common filler words
    .replace(
      /\b(will|does|is|the|a|an|by|in|on|at|to|for|of|with|from|and|or|but|this|that|be|are|was|were)\b/gi,
      ' '
    )
    // Normalize currency
    .replace(/\$(\d+)([kmb]?)/gi, '$1$2') // Remove $, keep numbers and units
    // Normalize percentages
    .replace(/(\d+)%/gi, '$1 percent')
    // Remove all punctuation
    .replace(/[?!.,;:()\[\]{}'"]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate normalized Levenshtein similarity (0-1, where 1 is identical)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  return 1 - distance / maxLength;
}

/**
 * Market components extracted from title
 */
interface MarketComponents {
  subject: string; // "bitcoin", "trump", "frank ocean"
  eventType: string; // "price", "election", "release"
  outcome: string; // "above", "win", "yes"
  target: string | null; // "$100k", "2024", null
  timeframe: string | null; // "2024", "december", "q4"
  action: string; // "announce", "removed", "win", "cross", "sign"
  object: string; // "fed chair", "25th amendment", "$100k", "nfl team"
  teams: string[]; // For sports events
  questionType: string; // "will", "when", "who", "unknown"
}

/**
 * Market index for efficient pre-filtering
 */
interface MarketIndex {
  bySubject: Map<string, MarketResult[]>; // Group by main subject
  byEventType: Map<string, MarketResult[]>; // Group by event type
  byKeywords: Map<string, MarketResult[]>; // Group by important keywords
}

/**
 * Extract main subject from title (checks known entities first, then proper nouns)
 */
function extractMainSubject(title: string): string {
  const normalized = title.toLowerCase();

  // Check for known entities (most common subjects) - ORDER MATTERS (more specific first)
  const entities = [
    // Cryptocurrency
    'bitcoin',
    'btc',
    'ethereum',
    'eth',
    'crypto',
    // People
    'trump',
    'donald trump',
    'biden',
    'joe biden',
    'musk',
    'elon musk',
    // Organizations
    'fed',
    'federal reserve',
    'federal',
    'reserve',
    // Sports
    'super bowl',
    'nfl',
    'nba',
    'mlb',
    'nhl',
    'chiefs',
    '49ers',
    'patriots',
    // Elections
    'election',
    'presidential election',
    'governor',
    'senate',
    'house',
    // Companies
    'tesla',
    'nvidia',
    'apple',
    'microsoft',
    'google',
    'meta',
    // Other common subjects
    'aliens',
    'ufo',
    'gold card',
    '25th amendment',
  ];

  // Check for known entities (more specific matches first)
  for (const entity of entities) {
    if (normalized.includes(entity)) {
      // Return normalized version (e.g., "donald trump" -> "trump", "federal reserve" -> "fed")
      if (entity === 'donald trump') return 'trump';
      if (entity === 'joe biden') return 'biden';
      if (entity === 'elon musk') return 'musk';
      if (entity === 'federal reserve' || entity === 'federal') return 'fed';
      if (entity === 'bitcoin' || entity === 'btc') return 'bitcoin';
      if (entity === 'ethereum' || entity === 'eth') return 'ethereum';
      return entity;
    }
  }

  // For sports markets with "Team A at Team B" or "Team A vs Team B" format
  // Extract both team names as the subject (more specific)
  const vsMatch = normalized.match(/([^atvs]+)\s+(?:at|vs|v\.?|versus)\s+(.+)/);
  if (vsMatch) {
    const team1 = vsMatch[1].trim();
    const team2 = vsMatch[2].trim();
    // Use both team names for more specific matching
    // Normalize team names (remove common suffixes, get city/name)
    const normalizeTeam = (team: string) => {
      return team
        .replace(
          /\s+(saints|bucs|bills|chiefs|packers|49ers|patriots|cowboys|eagles|rams|chargers|giants|jets|bears|dolphins|falcons|broncos|lions|texans|colts|jaguars|vikings|raiders|seahawks|buccaneers|titans|commanders|wildcats|cardinals|raiders|spartans|titans|phoenix)\s*$/i,
          ''
        )
        .trim();
    };
    const t1 = normalizeTeam(team1);
    const t2 = normalizeTeam(team2);
    // Return a combined subject that's more specific
    if (t1 && t2) {
      return `${t1}_${t2}`.substring(0, 50); // Limit length
    }
  }

  // If no known entity, extract first proper noun (but be more careful)
  const words = title.split(' ');
  const properNouns = words.filter(
    (w) => w.length > 0 && w[0] === w[0].toUpperCase()
  );
  if (properNouns.length > 0) {
    // For single-word proper nouns, check if it's part of a multi-word entity
    // e.g., "New" should become "New Orleans" or "New Hampshire", not just "new"
    if (properNouns.length === 1 && properNouns[0].length <= 4) {
      // Short proper noun like "New" - try to get the full phrase
      const idx = words.indexOf(properNouns[0]);
      if (idx >= 0 && idx + 1 < words.length) {
        const nextWord = words[idx + 1];
        if (nextWord && nextWord[0] === nextWord[0].toUpperCase()) {
          return `${properNouns[0].toLowerCase()}_${nextWord.toLowerCase()}`;
        }
      }
    }
    return properNouns[0].toLowerCase();
  }

  // Fallback: return first meaningful word
  const normalizedWords = normalized.split(/\s+/).filter((w) => w.length > 3);
  return normalizedWords[0] || 'unknown';
}

/**
 * Extract subject from title (main entity/person/thing) - legacy function
 */
function extractSubject(title: string): string {
  // First, try to find proper nouns in original title (before normalization)
  const originalWords = title.split(/\s+/);
  const properNouns: string[] = [];
  const stopWords = new Set([
    'cross',
    'above',
    'below',
    'reach',
    'hit',
    'win',
    'lose',
    'sign',
    'release',
    'happen',
    'again',
    'this',
    'year',
    'by',
    'before',
    'after',
    'end',
    'start',
    'team',
    'player',
    'actor',
    'artist',
    'will',
    'the',
    'a',
    'an',
  ]);

  // Find capitalized words (likely proper nouns)
  for (let i = 0; i < originalWords.length; i++) {
    const word = originalWords[i];
    const cleaned = word.toLowerCase().replace(/[?.,!]/g, '');
    // Check if word starts with capital (likely proper noun)
    if (
      word.length > 0 &&
      word[0] === word[0].toUpperCase() &&
      word[0] !== word[0].toLowerCase()
    ) {
      if (cleaned.length > 2 && !stopWords.has(cleaned)) {
        properNouns.push(cleaned);
      }
    }
  }

  // If we found proper nouns, combine consecutive ones (e.g., "justin tucker", "frank ocean")
  if (properNouns.length > 0) {
    // Check if they're consecutive in the original title
    const indices: number[] = [];
    for (let i = 0; i < originalWords.length; i++) {
      const word = originalWords[i];
      const cleaned = word.toLowerCase().replace(/[?.,!]/g, '');
      if (properNouns.includes(cleaned)) {
        indices.push(i);
      }
    }

    // If proper nouns are consecutive, combine them
    if (
      indices.length > 1 &&
      indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1)
    ) {
      return properNouns.join(' ');
    }
    return properNouns[0];
  }

  // Fallback: use normalized title and find first significant word
  const normalized = normalizeTitle(title);
  const words = normalized.split(/\s+/);

  // Look for common subject patterns
  // Pattern: "Will [Subject] ..."
  const willIndex = words.indexOf('will');
  if (willIndex >= 0 && willIndex + 1 < words.length) {
    const candidate = words[willIndex + 1];
    if (candidate.length > 2 && !stopWords.has(candidate)) {
      // Check if next word is also part of subject (e.g., "frank ocean")
      if (willIndex + 2 < words.length) {
        const nextWord = words[willIndex + 2];
        if (
          nextWord.length > 2 &&
          !stopWords.has(nextWord) &&
          !['cross', 'sign', 'win', 'release', 'above', 'below'].includes(
            nextWord
          )
        ) {
          return `${candidate} ${nextWord}`;
        }
      }
      return candidate;
    }
  }

  // Find the first significant word that's not a stop word
  for (const word of words) {
    if (word.length > 2 && !stopWords.has(word)) {
      // Check if it's likely a subject (not a verb or common word)
      if (
        !['will', 'does', 'is', 'the', 'a', 'an', 'be', 'have', 'get'].includes(
          word
        )
      ) {
        return word;
      }
    }
  }

  // Fallback: return first meaningful word
  return words.find((w) => w.length > 3) || words[0] || '';
}

/**
 * Extract event type from title
 */
function extractEventType(title: string): string {
  const normalized = normalizeTitle(title);
  const lower = normalized.toLowerCase();

  // Price-related
  if (
    lower.includes('price') ||
    lower.includes('cross') ||
    lower.includes('above') ||
    lower.includes('below') ||
    lower.includes('$')
  ) {
    return 'price';
  }

  // Election-related
  if (
    lower.includes('election') ||
    lower.includes('win') ||
    lower.includes('governor') ||
    lower.includes('president') ||
    lower.includes('senate') ||
    lower.includes('house')
  ) {
    return 'election';
  }

  // Sports-related
  if (
    lower.includes('nfl') ||
    lower.includes('nba') ||
    lower.includes('mlb') ||
    lower.includes('nhl') ||
    lower.includes('super bowl') ||
    lower.includes('championship')
  ) {
    return 'sports';
  }

  // Release/launch
  if (
    lower.includes('release') ||
    lower.includes('launch') ||
    lower.includes('album') ||
    lower.includes('movie') ||
    lower.includes('film')
  ) {
    return 'release';
  }

  // Signing/contract
  if (
    lower.includes('sign') ||
    lower.includes('contract') ||
    lower.includes('team')
  ) {
    return 'signing';
  }

  // Default to generic event
  return 'event';
}

/**
 * Extract action from title (what is happening) - must be exact
 */
function extractAction(title: string): string {
  const normalized = normalizeTitle(title);
  const lower = normalized.toLowerCase();

  // Common actions with specific keywords - must match exactly
  const actions: Record<string, string[]> = {
    decision: ['decision', 'decide', 'decides', 'decided'],
    abolish: ['abolished', 'abolish', 'eliminate', 'eliminated', 'end', 'ends'],
    out: ['out', 'removed', 'leaves', 'leave', 'resign', 'resigns', 'resigned'],
    issue: ['issue', 'issues', 'issued', 'release', 'releases', 'released'],
    win: ['win', 'wins', 'winner', 'wins the', 'wins election'],
    reach: [
      'reach',
      'reaches',
      'hit',
      'hits',
      'above',
      'surpass',
      'surpasses',
      'cross',
      'crosses',
    ],
    announce: [
      'announce',
      'announces',
      'announced',
      'name',
      'names',
      'named',
      'appoint',
      'appoints',
      'appointed',
      'select',
      'selects',
      'selected',
    ],
    sign: ['sign', 'signs', 'signed', 'signing'],
    happen: ['happen', 'happens', 'happened', 'occur', 'occurs', 'occurred'],
    launch: ['launch', 'launches', 'launched'],
    say: ['say', 'says', 'said', 'state', 'states', 'stated'],
  };

  // Check in order of specificity (more specific first)
  for (const [action, keywords] of Object.entries(actions)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return action;
      }
    }
  }

  return 'unknown';
}

/**
 * Extract teams from title (for sports events)
 */
/**
 * Extract and normalize teams from title using team name map
 * Returns normalized city names (e.g., "new orleans", "tampa bay")
 */
/**
 * FINAL WORKING VERSION - Extract exactly 2 teams, no duplicates
 */
function extractTeamsFromTitle(title: string): string[] {
  const normalized = title.toLowerCase().trim();

  // Team name map (nickname -> city)
  const teamNameMap: Record<string, string> = {
    saints: 'new orleans',
    buccaneers: 'tampa bay',
    bucs: 'tampa bay',
    packers: 'green bay',
    chiefs: 'kansas city',
    '49ers': 'san francisco',
    bills: 'buffalo',
    bengals: 'cincinnati',
    ravens: 'baltimore',
    patriots: 'new england',
    cowboys: 'dallas',
    eagles: 'philadelphia',
    rams: 'los angeles',
    chargers: 'los angeles',
    giants: 'new york',
    jets: 'new york',
    bears: 'chicago',
    dolphins: 'miami',
    falcons: 'atlanta',
    broncos: 'denver',
    lions: 'detroit',
    texans: 'houston',
    colts: 'indianapolis',
    jaguars: 'jacksonville',
    vikings: 'minnesota',
    raiders: 'las vegas',
    seahawks: 'seattle',
    titans: 'tennessee',
    commanders: 'washington',
    cardinals: 'arizona',
    steelers: 'pittsburgh',
    browns: 'cleveland',
    // NBA
    celtics: 'boston',
    bucks: 'milwaukee',
    nuggets: 'denver',
    hornets: 'charlotte',
    knicks: 'new york',
    nets: 'brooklyn',
    lakers: 'los angeles',
    clippers: 'los angeles',
    warriors: 'golden state',
    heat: 'miami',
    suns: 'phoenix',
    mavericks: 'dallas',
    mavs: 'dallas',
    rockets: 'houston',
    spurs: 'san antonio',
    thunder: 'oklahoma city',
    'trail blazers': 'portland',
    blazers: 'portland',
    kings: 'sacramento',
    pelicans: 'new orleans',
    grizzlies: 'memphis',
    timberwolves: 'minnesota',
    wolves: 'minnesota',
    jazz: 'utah',
    wizards: 'washington',
    raptors: 'toronto',
    '76ers': 'philadelphia',
    sixers: 'philadelphia',
    pacers: 'indiana',
    cavaliers: 'cleveland',
    cavs: 'cleveland',
    pistons: 'detroit',
    magic: 'orlando',
    hawks: 'atlanta',
    // NHL
    avalanche: 'colorado',
    bruins: 'boston',
    blackhawks: 'chicago',
    hurricanes: 'carolina',
    canes: 'carolina',
    blues: 'st louis',
    capitals: 'washington',
    caps: 'washington',
    canucks: 'vancouver',
    flames: 'calgary',
    flyers: 'philadelphia',
    islanders: 'new york',
    lightning: 'tampa bay',
    'maple leafs': 'toronto',
    leafs: 'toronto',
    oilers: 'edmonton',
    penguins: 'pittsburgh',
    pens: 'pittsburgh',
    predators: 'nashville',
    preds: 'nashville',
    rangers: 'new york',
    'red wings': 'detroit',
    wings: 'detroit',
    sharks: 'san jose',
    wild: 'minnesota',
    stars: 'dallas',
    ducks: 'anaheim',
    sabres: 'buffalo',
    devils: 'new jersey',
    senators: 'ottawa',
    sens: 'ottawa',
    'florida panthers': 'florida',
    kraken: 'seattle',
    'golden knights': 'vegas',
    knights: 'vegas',
    'blue jackets': 'columbus',
  };

  // NFL/NBA/NHL cities
  const sportsCities = [
    'new orleans',
    'tampa bay',
    'green bay',
    'kansas city',
    'san francisco',
    'buffalo',
    'cincinnati',
    'baltimore',
    'dallas',
    'philadelphia',
    'los angeles',
    'new york',
    'chicago',
    'miami',
    'atlanta',
    'denver',
    'detroit',
    'houston',
    'indianapolis',
    'jacksonville',
    'minnesota',
    'las vegas',
    'seattle',
    'tennessee',
    'washington',
    'carolina',
    'arizona',
    'pittsburgh',
    'cleveland',
    'new england',
    'boston',
    'milwaukee',
    'charlotte',
    'brooklyn',
    'golden state',
    'phoenix',
    'san antonio',
    'oklahoma city',
    'portland',
    'sacramento',
    'memphis',
    'utah',
    'toronto',
    'indiana',
    'orlando',
    'colorado',
    'st louis',
    'vancouver',
    'calgary',
    'edmonton',
    'nashville',
    'san jose',
    'anaheim',
    'new jersey',
    'ottawa',
    'florida',
    'vegas',
    'columbus',
  ];

  // Step 1: Try to extract from "Team1 vs/at Team2" pattern ONLY
  const vsPattern = /^(.+?)\s+(?:vs\.?|versus|at|@)\s+(.+?)$/i;
  const match = normalized.match(vsPattern);

  if (match) {
    const team1Raw = match[1].trim();
    const team2Raw = match[2].trim();

    // Normalize each team
    const team1 = normalizeTeamName(team1Raw, teamNameMap);
    const team2 = normalizeTeamName(team2Raw, teamNameMap);

    // Only return if we got BOTH teams and they're DIFFERENT
    if (team1 && team2 && team1 !== team2) {
      return [team1, team2];
    }
  }

  // Step 2: If no pattern match, return empty (don't scan for random team names)
  return [];
}

/**
 * Helper: Normalize a raw team name to city (single team only)
 */
function normalizeTeamName(
  raw: string,
  teamMap: Record<string, string>
): string | null {
  const cleaned = raw.toLowerCase().trim();

  // Remove common prefixes like "AHL:", "SHL:", etc.
  const prefixRemoved = cleaned.replace(
    /^(nhl|nba|nfl|mlb|ncaa|ahl|shl|ufc):\s*/i,
    ''
  );

  // Known cities (check exact match first)
  const cities = [
    'new orleans',
    'tampa bay',
    'green bay',
    'kansas city',
    'san francisco',
    'buffalo',
    'cincinnati',
    'baltimore',
    'dallas',
    'philadelphia',
    'los angeles',
    'new york',
    'chicago',
    'miami',
    'atlanta',
    'denver',
    'detroit',
    'houston',
    'indianapolis',
    'jacksonville',
    'minnesota',
    'las vegas',
    'seattle',
    'tennessee',
    'washington',
    'carolina',
    'arizona',
    'pittsburgh',
    'cleveland',
    'new england',
    'boston',
    'milwaukee',
    'charlotte',
    'brooklyn',
    'golden state',
    'phoenix',
    'san antonio',
    'oklahoma city',
    'portland',
    'sacramento',
    'memphis',
    'utah',
    'toronto',
    'indiana',
    'orlando',
    'colorado',
    'st louis',
    'vancouver',
    'calgary',
    'edmonton',
    'nashville',
    'san jose',
    'anaheim',
    'new jersey',
    'ottawa',
    'florida',
    'vegas',
    'columbus',
  ];

  // Check if it's already a city name
  for (const city of cities) {
    if (prefixRemoved === city || prefixRemoved.startsWith(city + ' ')) {
      return city;
    }
  }

  // Check team nicknames (look for longest match first)
  const sortedTeams = Object.entries(teamMap).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [nickname, city] of sortedTeams) {
    // Check if the nickname appears in the string
    const nicknameRegex = new RegExp(`\\b${nickname}\\b`, 'i');
    if (nicknameRegex.test(prefixRemoved)) {
      return city;
    }
  }

  // Can't normalize - return null
  return null;
}

/**
 * FIXED: Calculate team match score
 */
function calculateTeamMatchScore(teams1: string[], teams2: string[]): number {
  if (teams1.length === 0 || teams2.length === 0) return 0;

  const normalized1 = teams1.map((t) => t.toLowerCase().trim());
  const normalized2 = teams2.map((t) => t.toLowerCase().trim());

  // Count exact matches
  let matches = 0;
  for (const t1 of normalized1) {
    for (const t2 of normalized2) {
      if (t1 === t2) {
        matches++;
        break;
      }
    }
  }

  // For 2-team games (most common)
  if (normalized1.length === 2 && normalized2.length === 2) {
    if (matches === 2) return 1.0; // Both teams match
    if (matches === 1) return 0.5; // One team matches
    return 0;
  }

  // General case
  return matches / Math.max(normalized1.length, normalized2.length);
}

/**
 * Legacy extractTeams function (kept for backward compatibility)
 */
function extractTeams(title: string): string[] {
  const normalized = title.toLowerCase();
  const teams: string[] = [];

  // Common team name patterns (full team names first, then partial)
  const teamPatterns = [
    // NFL teams
    /(kansas city|kc)\s+chiefs/i,
    /(san francisco|sf)\s+49ers/i,
    /(new england|ne)\s+patriots/i,
    /(dallas|dal)\s+cowboys/i,
    /(green bay|gb)\s+packers/i,
    /(pittsburgh|pit)\s+steelers/i,
    /(philadelphia|phi)\s+eagles/i,
    /(new orleans|no)\s+saints/i,
    /(los angeles|la)\s+(rams|chargers)/i,
    /(new york|ny)\s+(giants|jets)/i,
    /(chicago|chi)\s+bears/i,
    /(miami|mia)\s+dolphins/i,
    /(atlanta|atl)\s+falcons/i,
    /(buffalo|buf)\s+bills/i,
    /(denver|den)\s+broncos/i,
    /(detroit|det)\s+lions/i,
    /(houston|hou)\s+texans/i,
    /(indianapolis|ind)\s+colts/i,
    /(jacksonville|jax)\s+jaguars/i,
    /(minnesota|min)\s+vikings/i,
    /(new england|ne)\s+patriots/i,
    /(oakland|oak)\s+raiders/i,
    /(seattle|sea)\s+seahawks/i,
    /(tampa bay|tb)\s+buccaneers/i,
    /(tennessee|ten)\s+titans/i,
    /(washington|was)\s+commanders/i,
    // Common patterns
    /\b(new\s+(orleans|york|england|mexico|jersey))\b/i,
    /\b(los\s+angeles|san\s+francisco|san\s+antonio)\b/i,
    // Generic team names
    /\b([A-Z][a-z]+\s+(chiefs|49ers|patriots|cowboys|packers|steelers|eagles|saints|rams|chargers|giants|jets|bears|dolphins|falcons|bills|broncos|lions|texans|colts|jaguars|vikings|raiders|seahawks|buccaneers|titans|commanders))\b/i,
  ];

  for (const pattern of teamPatterns) {
    const matches = title.match(pattern);
    if (matches) {
      teams.push(matches[0].toLowerCase().trim());
    }
  }

  // Also look for "vs" or "v" patterns
  const vsMatch = normalized.match(/([^vs]+)\s+(?:vs|v\.?|versus)\s+(.+)/i);
  if (vsMatch) {
    const team1 = vsMatch[1].trim();
    const team2 = vsMatch[2].trim();
    if (team1 && team2) {
      return [team1, team2];
    }
  }

  return teams;
}

/**
 * Check if two teams match exactly (for sports)
 */
function teamsMatchExactly(teams1: string[], teams2: string[]): boolean {
  if (teams1.length === 0 || teams2.length === 0) return false;
  if (teams1.length !== teams2.length) return false;

  // Check if all teams match (order doesn't matter)
  const normalized1 = teams1.map((t) => t.toLowerCase().trim());
  const normalized2 = teams2.map((t) => t.toLowerCase().trim());

  // Check direct matches
  const allMatch = normalized1.every((t1) =>
    normalized2.some((t2) => t1 === t2 || t1.includes(t2) || t2.includes(t1))
  );

  if (allMatch) return true;

  // Check reverse order (team1 vs team2 = team2 vs team1)
  if (normalized1.length === 2 && normalized2.length === 2) {
    return (
      (normalized1[0] === normalized2[0] &&
        normalized1[1] === normalized2[1]) ||
      (normalized1[0] === normalized2[1] && normalized1[1] === normalized2[0])
    );
  }

  return false;
}

/**
 * Extract object from title (what the action is about)
 */
function extractObject(title: string): string {
  const normalized = normalizeTitle(title);
  const lower = normalized.toLowerCase();

  // Look for key objects/phrases (exact matches)
  const objectPatterns = [
    { pattern: /fed(eral)?\s+reserve|fed\s+chair/i, value: 'fed reserve' },
    { pattern: /25th\s+amendment/i, value: '25th amendment' },
    { pattern: /\$\d+[kmb]?/i, extract: true }, // Currency amounts - extract actual value
    { pattern: /super\s+bowl/i, value: 'super bowl' },
    { pattern: /president|presidential/i, value: 'president' },
    { pattern: /governor|governorship/i, value: 'governor' },
    { pattern: /senate|senator/i, value: 'senate' },
    { pattern: /house\s+of\s+representatives|house/i, value: 'house' },
    { pattern: /gold\s+card/i, value: 'gold card' },
  ];

  for (const { pattern, value, extract } of objectPatterns) {
    const match = title.match(pattern);
    if (match) {
      if (extract) {
        return match[0].toLowerCase().trim();
      }
      return value;
    }
  }

  return '';
}

/**
 * Extract outcome direction from title
 */
function extractOutcome(title: string): string {
  const normalized = normalizeTitle(title);
  const lower = normalized.toLowerCase();

  if (
    lower.includes('above') ||
    lower.includes('over') ||
    lower.includes('more than')
  ) {
    return 'above';
  }
  if (
    lower.includes('below') ||
    lower.includes('under') ||
    lower.includes('less than')
  ) {
    return 'below';
  }
  if (lower.includes('win') || lower.includes('winner')) {
    return 'win';
  }
  if (
    lower.includes('yes') ||
    lower.includes('happen') ||
    lower.includes('will')
  ) {
    return 'yes';
  }

  return 'unknown';
}

/**
 * Extract target value from title (e.g., "$100k", "2024")
 */
function extractTarget(title: string): string | null {
  // Look for currency amounts
  const currencyMatch = title.match(/\$[\d.]+[kmb]?/i);
  if (currencyMatch) return currencyMatch[0].toLowerCase();

  // Look for years
  const yearMatch = title.match(/\b(20\d{2})\b/);
  if (yearMatch) return yearMatch[1];

  // Look for percentages
  const percentMatch = title.match(/\d+%/);
  if (percentMatch) return percentMatch[0];

  return null;
}

/**
 * Extract year from timeframe string
 */
function extractYear(timeframe: string | null): number | null {
  if (!timeframe) return null;
  const yearMatch = timeframe.match(/\b(20\d{2})\b/);
  return yearMatch ? parseInt(yearMatch[1]) : null;
}

/**
 * Extract month from timeframe string
 */
function extractMonth(timeframe: string | null): string | null {
  if (!timeframe) return null;
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];
  const lower = timeframe.toLowerCase();
  for (const month of months) {
    if (lower.includes(month)) return month;
  }
  return null;
}

/**
 * Extract question type from title (e.g., "will", "when", "who")
 */
function extractQuestionType(title: string): string {
  const normalized = title.toLowerCase();

  if (normalized.startsWith('will ') || normalized.includes(' will '))
    return 'will';
  if (normalized.startsWith('when ') || normalized.includes(' when '))
    return 'when';
  if (normalized.startsWith('who ') || normalized.includes(' who '))
    return 'who';
  if (normalized.startsWith('what ') || normalized.includes(' what '))
    return 'what';
  if (normalized.startsWith('where ') || normalized.includes(' where '))
    return 'where';

  return 'unknown';
}

/**
 * Get question signature - identifies the TYPE of question being asked
 * This is CRITICAL to prevent matching different events about the same subject
 */
function getQuestionSignature(title: string): string {
  const normalized = title.toLowerCase();

  // Define question signatures - markets must have same signature to match
  const signatures: Record<string, string[]> = {
    removal: [
      'removed',
      'resign',
      'resigns',
      'resigned',
      'impeach',
      'impeached',
      'leave office',
      '25th amendment',
      'out of office',
      'ousted',
    ],
    attendance: [
      'attend',
      'attends',
      'attended',
      'go to',
      'goes to',
      'went to',
      'visit',
      'visits',
      'visited',
      'show up',
      'shows up',
      'showed up',
      'appear',
      'appears',
      'appeared',
    ],
    announcement: [
      'announce',
      'announces',
      'announced',
      'name',
      'names',
      'named',
      'nominate',
      'nominates',
      'nominated',
      'appoint',
      'appoints',
      'appointed',
      'select',
      'selects',
      'selected',
    ],
    win_election: [
      'win election',
      'wins election',
      'won election',
      'elected',
      'election winner',
      'presidential election',
      'election',
      'wins presidency',
    ],
    price_above: [
      'above',
      'over',
      'exceed',
      'exceeds',
      'exceeded',
      'reach',
      'reaches',
      'reached',
      'hit',
      'hits',
      'cross',
      'crosses',
      'crossed',
      'surpass',
      'surpasses',
      'surpassed',
    ],
    price_below: [
      'below',
      'under',
      'falls',
      'fall',
      'fell',
      'drops',
      'drop',
      'dropped',
    ],
    game_winner: [
      'win',
      'wins',
      'winner',
      'winners',
      'champion',
      'champions',
      'beat',
      'beats',
      'beaten',
      'defeat',
      'defeats',
      'defeated',
    ],
    release: [
      'release',
      'releases',
      'released',
      'launch',
      'launches',
      'launched',
      'drop',
      'drops',
      'dropped',
      'come out',
      'comes out',
      'came out',
    ],
    issue: [
      'issue',
      'issues',
      'issued',
      'grant',
      'grants',
      'granted',
      'give',
      'gives',
      'gave',
      'given',
    ],
    abolish: [
      'abolish',
      'abolishes',
      'abolished',
      'eliminate',
      'eliminates',
      'eliminated',
      'end',
      'ends',
      'ended',
      'terminate',
      'terminates',
      'terminated',
    ],
    sign: ['sign', 'signs', 'signed', 'signing', 'contract', 'contracts'],
    say: [
      'say',
      'says',
      'said',
      'state',
      'states',
      'stated',
      'claim',
      'claims',
      'claimed',
    ],
    happen: [
      'happen',
      'happens',
      'happened',
      'occur',
      'occurs',
      'occurred',
      'take place',
      'takes place',
      'took place',
    ],
  };

  // Check signatures in order (more specific first)
  for (const [sig, keywords] of Object.entries(signatures)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return sig;
      }
    }
  }

  return 'unknown';
}

/**
 * Extract timeframe from title
 */
function extractTimeframe(title: string): string | null {
  const normalized = normalizeTitle(title);
  const lower = normalized.toLowerCase();

  // Years
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  if (yearMatch) return yearMatch[1];

  // Months
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];
  for (const month of months) {
    if (lower.includes(month)) return month;
  }

  // Quarters
  if (
    lower.includes('q1') ||
    lower.includes('q2') ||
    lower.includes('q3') ||
    lower.includes('q4')
  ) {
    return lower.match(/q[1-4]/)?.[0] || null;
  }

  // Time references
  if (lower.includes('end of year') || lower.includes('eoy'))
    return 'end of year';
  if (lower.includes('this year')) return 'this year';
  if (lower.includes('next year')) return 'next year';

  return null;
}

/**
 * Check if two timeframes are compatible (stricter - within same year or adjacent year)
 */
function timeframesCompatible(tf1: string | null, tf2: string | null): boolean {
  if (!tf1 || !tf2) return true; // If one is missing, don't penalize

  // Extract years
  const year1 = extractYear(tf1);
  const year2 = extractYear(tf2);

  // Must be within same year or adjacent year (max 1 year difference)
  if (year1 && year2) {
    if (Math.abs(year1 - year2) > 1) {
      return false; // More than 1 year apart = incompatible
    }
  }

  // Check for incompatible phrases
  // "this year" (2024) is NOT compatible with "before 2027"
  // "December 2024" is compatible with "end of 2024"
  // "2025" is compatible with "first half 2025"

  const incompatible = [
    ['this year', 'before 2027'],
    ['2024', '2027'], // More than 1 year apart
    ['december', 'before 2027'], // December 2024 vs before 2027 (2+ years apart)
  ];

  for (const [p1, p2] of incompatible) {
    if (
      (tf1.includes(p1) && tf2.includes(p2)) ||
      (tf1.includes(p2) && tf2.includes(p1))
    ) {
      if (year1 && year2 && Math.abs(year1 - year2) > 1) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if two outcomes are the same (for binary markets)
 */
function isSameOutcome(
  comp1: MarketComponents,
  comp2: MarketComponents,
  title1: string,
  title2: string
): boolean {
  const directions = [
    'above',
    'below',
    'win',
    'lose',
    'yes',
    'no',
    'true',
    'false',
  ];
  const lower1 = title1.toLowerCase();
  const lower2 = title2.toLowerCase();

  // Check if both have the same direction keywords
  for (const dir of directions) {
    const has1 = lower1.includes(dir);
    const has2 = lower2.includes(dir);

    // If one has a direction and the other doesn't, they're different
    if (has1 !== has2) {
      // Exception: "win" and "winner" are the same
      if (
        (dir === 'win' && has1 && lower2.includes('winner')) ||
        (has2 && lower1.includes('winner'))
      ) {
        continue;
      }
      return false;
    }
  }

  // Check outcome component
  if (
    comp1.outcome !== comp2.outcome &&
    comp1.outcome !== 'unknown' &&
    comp2.outcome !== 'unknown'
  ) {
    return false;
  }

  return true;
}

/**
 * Extract keywords from title (important terms for indexing)
 */
function extractKeywords(title: string): string[] {
  const normalized = normalizeTitle(title);
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);

  // Filter out common stop words
  const stopWords = [
    'will',
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
    'from',
    'this',
    'that',
    'be',
    'is',
    'are',
    'was',
    'were',
  ];
  const keywords = words.filter((w) => !stopWords.includes(w));

  return keywords.slice(0, 5); // Limit to top 5 keywords
}

/**
 * Get the best price for a "yes" outcome (probability)
 */
function getBestYesPrice(market: MarketResult): number | null {
  if (!market.outcomes || market.outcomes.length === 0) return null;

  // For binary markets, find the "yes" or first outcome
  const yesOutcome =
    market.outcomes.find(
      (o) =>
        o.name.toLowerCase().includes('yes') ||
        o.name.toLowerCase().includes('true') ||
        o.name.toLowerCase().includes('will')
    ) || market.outcomes[0];

  // Return as probability (0-1)
  return yesOutcome.percentage / 100;
}

/**
 * Calculate potential spread between two markets, matching equivalent outcomes
 */
function calculateSpreadWithOutcomeMatching(
  m1: MarketResult,
  m2: MarketResult
): {
  spread: number;
  maxSpread: number;
  bestBuy: { market: MarketResult; price: number; outcomeIndex: number };
  bestSell: { market: MarketResult; price: number; outcomeIndex: number };
} | null {
  // Find matching outcomes between the two markets
  const matchingPairs: Array<{
    outcome1: { index: number; name: string; price: number };
    outcome2: { index: number; name: string; price: number };
    similarity: number;
  }> = [];

  for (let i = 0; i < m1.outcomes.length; i++) {
    const o1 = m1.outcomes[i];
    for (let j = 0; j < m2.outcomes.length; j++) {
      const o2 = m2.outcomes[j];
      const name1 = o1.name.toLowerCase().trim();
      const name2 = o2.name.toLowerCase().trim();

      // Check if outcomes match
      let similarity = 0;
      if (name1 === name2) {
        similarity = 1.0;
      } else {
        similarity = calculateSimilarity(name1, name2);
      }

      // For binary markets, match Yes/No across platforms
      const binaryMatch =
        (name1 === 'yes' && name2 === 'yes') ||
        (name1 === 'no' && name2 === 'no') ||
        (name1.includes('yes') && name2.includes('yes')) ||
        (name1.includes('no') && name2.includes('no'));

      // For multi-outcome, require higher similarity; for binary, be more lenient
      const isBinary =
        name1 === 'yes' || name1 === 'no' || name2 === 'yes' || name2 === 'no';
      const threshold = isBinary ? 0.7 : 0.75; // Stricter thresholds to prevent false matches

      if (similarity > threshold || binaryMatch) {
        matchingPairs.push({
          outcome1: { index: i, name: o1.name, price: o1.price },
          outcome2: { index: j, name: o2.name, price: o2.price },
          similarity,
        });
      }
    }
  }

  if (matchingPairs.length === 0) return null;

  // Find the pair with the largest spread
  let bestSpread = 0;
  let bestPair = matchingPairs[0];

  for (const pair of matchingPairs) {
    const price1 = pair.outcome1.price;
    const price2 = pair.outcome2.price;

    // Find the best buy (lowest price) and best sell (highest price)
    let buy, sell;
    if (price1 < price2) {
      buy = { market: m1, price: price1, outcomeIndex: pair.outcome1.index };
      sell = { market: m2, price: price2, outcomeIndex: pair.outcome2.index };
    } else {
      buy = { market: m2, price: price2, outcomeIndex: pair.outcome2.index };
      sell = { market: m1, price: price1, outcomeIndex: pair.outcome1.index };
    }

    const spread = sell.price - buy.price;
    const maxSpreadPct = spread / buy.price;

    if (maxSpreadPct > bestSpread) {
      bestSpread = maxSpreadPct;
      bestPair = pair;
    }
  }

  // Calculate final spread
  const price1 = bestPair.outcome1.price;
  const price2 = bestPair.outcome2.price;

  let bestBuy, bestSell;
  if (price1 < price2) {
    bestBuy = {
      market: m1,
      price: price1,
      outcomeIndex: bestPair.outcome1.index,
    };
    bestSell = {
      market: m2,
      price: price2,
      outcomeIndex: bestPair.outcome2.index,
    };
  } else {
    bestBuy = {
      market: m2,
      price: price2,
      outcomeIndex: bestPair.outcome2.index,
    };
    bestSell = {
      market: m1,
      price: price1,
      outcomeIndex: bestPair.outcome1.index,
    };
  }

  const spread = bestSell.price - bestBuy.price;
  const maxSpread = spread / bestBuy.price;

  return {
    spread: spread * 100,
    maxSpread: maxSpread * 100,
    bestBuy,
    bestSell,
  };
}

/**
 * Calculate potential spread between two markets (legacy function for backward compatibility)
 */
function calculateSpread(
  m1: MarketResult,
  m2: MarketResult
): {
  spread: number;
  maxSpread: number;
  bestBuy: { market: MarketResult; price: number };
  bestSell: { market: MarketResult; price: number };
} | null {
  const result = calculateSpreadWithOutcomeMatching(m1, m2);
  if (!result) return null;

  return {
    spread: result.spread,
    maxSpread: result.maxSpread,
    bestBuy: { market: result.bestBuy.market, price: result.bestBuy.price },
    bestSell: { market: result.bestSell.market, price: result.bestSell.price },
  };
}

// ============================================================================
// STRUCTURED ARBITRAGE DETECTION SYSTEM
// ============================================================================

interface ParsedMarket {
  rawTitle: string;
  category:
    | 'sports'
    | 'politics'
    | 'entertainment'
    | 'economics'
    | 'weather'
    | 'other';
  entities: {
    state: string | null;
    office: string | null;
    party: string | null;
    year: string | null;
    team1: string | null;
    team2: string | null;
    sport: string | null;
  };
  normalized: string;
  originalMarket: MarketResult;
}

/**
 * Parse a market to extract category and entities
 */
function parseMarket(market: MarketResult): ParsedMarket {
  const title = market.title || '';

  return {
    rawTitle: title,
    category: detectCategory(title),
    entities: extractEntities(title),
    normalized: normalizeTitle(title),
    originalMarket: market,
  };
}

/**
 * Detect market category using pattern matching
 */
function detectCategory(title: string): ParsedMarket['category'] {
  const patterns = {
    sports:
      /\bvs\b|\bat\b|@|\b(NFL|NBA|NHL|MLB|NCAA|game|match|playoff|championship|super bowl)\b/i,
    politics:
      /\b(election|senate|house|governor|primary|nomination|party|republican|democrat|democratic|gop|presidential)\b/i,
    entertainment:
      /\b(oscar|emmy|grammy|award|movie|album|release|actor|actress)\b/i,
    economics:
      /\b(price|stock|market|GDP|inflation|rate|fed|federal reserve|bitcoin|btc|ethereum|eth|crypto)\b/i,
    weather: /\b(temperature|rain|snow|hurricane|weather|storm|flood)\b/i,
  };

  for (const [cat, pattern] of Object.entries(patterns)) {
    if (pattern.test(title)) {
      return cat as ParsedMarket['category'];
    }
  }

  return 'other';
}

/**
 * IMPROVED: Extract entities with better team/city recognition
 */
function extractEntities(title: string): ParsedMarket['entities'] {
  // US States (all 50)
  const statePattern =
    /\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b/i;
  const stateMatch = title.match(statePattern);
  const state = stateMatch ? stateMatch[1] : null;

  // Office types
  const officePattern =
    /\b(Senate|House|Governor|Presidential|President|Congress|Representative)\b/i;
  const officeMatch = title.match(officePattern);
  const office = officeMatch ? officeMatch[1] : null;

  // Political parties
  const partyPattern = /\b(Republican|Democratic|Democrat|GOP)\b/i;
  const partyMatch = title.match(partyPattern);
  const party = partyMatch ? partyMatch[1] : null;

  // Years
  const yearMatch = title.match(/\b(2024|2025|2026|2027|2028|2029|2030)\b/);
  const year = yearMatch ? yearMatch[1] : null;

  // IMPROVED: Sports teams - use existing team extraction
  const teams = extractTeamsFromTitle(title);
  const team1 = teams[0] || null;
  const team2 = teams[1] || null;

  // Sport type
  const sportMatch = title.match(
    /\b(NFL|NBA|NHL|MLB|NCAA|NCAAB|NCAAM|NCAAMBB)\b/i
  );
  const sport = sportMatch ? sportMatch[1] : null;

  return {
    state,
    office,
    party,
    year,
    team1,
    team2,
    sport,
  };
}

/**
 * Add this at the beginning of matchPoliticalMarkets for debugging
 */
function matchPoliticalMarkets(
  markets: ParsedMarket[]
): Array<{ market1: ParsedMarket; market2: ParsedMarket; confidence: number }> {
  const matches: Array<{
    market1: ParsedMarket;
    market2: ParsedMarket;
    confidence: number;
  }> = [];

  console.log(`[Arbitrage] Comparing ${markets.length} political markets...`);
  console.log(`[Arbitrage] Sample political markets:`);
  for (let i = 0; i < Math.min(3, markets.length); i++) {
    const m = markets[i];
    console.log(`  ${i + 1}. ${m.originalMarket.platform}: "${m.rawTitle}"`);
    console.log(
      `     State: ${m.entities.state}, Office: ${m.entities.office}, Year: ${m.entities.year}`
    );
  }

  let comparisons = 0;

  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const m1 = markets[i];
      const m2 = markets[j];

      if (m1.originalMarket.platform === m2.originalMarket.platform) {
        continue;
      }

      comparisons++;
      const confidence = calculatePoliticalConfidence(m1, m2);

      if (confidence >= 70) {
        matches.push({ market1: m1, market2: m2, confidence });
      }
    }
  }

  console.log(
    `[Arbitrage] Made ${comparisons} comparisons, found ${matches.length} matches`
  );

  return matches;
}

/**
 * FIXED: Political confidence - check state match properly
 */
function calculatePoliticalConfidence(
  m1: ParsedMarket,
  m2: ParsedMarket
): number {
  let score = 0;

  // State check (CRITICAL - must match exactly)
  if (m1.entities.state && m2.entities.state) {
    const state1 = m1.entities.state.toLowerCase().trim();
    const state2 = m2.entities.state.toLowerCase().trim();

    if (state1 === state2) {
      score += 50;
    } else {
      // CRITICAL: Different states = NO MATCH for political markets
      console.log(
        `[Arbitrage] Political markets have different states: "${state1}" vs "${state2}" - REJECTED`
      );
      return 0;
    }
  } else if (!m1.entities.state && !m2.entities.state) {
    // Both have no state - could be national races
    // Check if they're both about the same national race
    const bothPresidential =
      /presidential|president/i.test(m1.rawTitle) &&
      /presidential|president/i.test(m2.rawTitle);

    if (bothPresidential) {
      score += 30; // Lower score since we're less certain
    } else {
      // Different types of races without states specified
      return 0;
    }
  } else {
    // One has state, one doesn't - not a match
    console.log(`[Arbitrage] One market has state, one doesn't - REJECTED`);
    return 0;
  }

  // Office check
  if (m1.entities.office && m2.entities.office) {
    const office1 = m1.entities.office.toLowerCase();
    const office2 = m2.entities.office.toLowerCase();

    if (office1 === office2) {
      score += 30;
    } else if (
      (office1.includes('house') && office2.includes('representative')) ||
      (office2.includes('house') && office1.includes('representative'))
    ) {
      score += 25;
    } else {
      // Different offices = not the same race
      console.log(
        `[Arbitrage] Different offices: "${office1}" vs "${office2}" - REJECTED`
      );
      return 0;
    }
  } else {
    score += 10;
  }

  // Year check
  if (m1.entities.year && m2.entities.year) {
    if (m1.entities.year === m2.entities.year) {
      score += 15;
    } else {
      // Different years = not the same race
      console.log(
        `[Arbitrage] Different years: "${m1.entities.year}" vs "${m2.entities.year}" - REJECTED`
      );
      return 0;
    }
  }

  // Check if both are about party (winner) vs candidate (primary)
  const m1IsPrimary = /primary|nomination/i.test(m1.rawTitle);
  const m2IsPrimary = /primary|nomination/i.test(m2.rawTitle);
  const m1IsGeneral = /which party|party will win|general election/i.test(
    m1.rawTitle
  );
  const m2IsGeneral = /which party|party will win|general election/i.test(
    m2.rawTitle
  );

  // Primary vs General = different races
  if ((m1IsPrimary && m2IsGeneral) || (m2IsPrimary && m1IsGeneral)) {
    console.log(`[Arbitrage] One is primary, one is general - REJECTED`);
    return 0;
  }

  // Same type bonus
  if (m1IsPrimary === m2IsPrimary) {
    score += 5;
  }

  return score;
}

/**
 * FIXED: Sports matching with proper team comparison
 */
function matchSportsMarkets(
  markets: ParsedMarket[]
): Array<{ market1: ParsedMarket; market2: ParsedMarket; confidence: number }> {
  const matches: Array<{
    market1: ParsedMarket;
    market2: ParsedMarket;
    confidence: number;
  }> = [];

  console.log(`[Arbitrage] Comparing ${markets.length} sports markets...`);

  // Show sample extractions for debugging
  console.log(`[Arbitrage] Sample sports extractions (first 10):`);
  for (let i = 0; i < Math.min(10, markets.length); i++) {
    const m = markets[i];
    const teams = extractTeamsFromTitle(m.rawTitle);
    console.log(`  ${i + 1}. "${m.rawTitle}"`);
    console.log(`     Platform: ${m.originalMarket.platform}`);
    console.log(`     Extracted teams: [${teams.join(', ')}]`);
  }

  let comparisons = 0;
  let potentialMatches = 0;

  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const m1 = markets[i];
      const m2 = markets[j];

      // Must be from different platforms
      if (m1.originalMarket.platform === m2.originalMarket.platform) {
        continue;
      }

      comparisons++;

      // Extract teams fresh
      const teams1 = extractTeamsFromTitle(m1.rawTitle);
      const teams2 = extractTeamsFromTitle(m2.rawTitle);

      // Both must have exactly 2 teams
      if (teams1.length !== 2 || teams2.length !== 2) {
        continue;
      }

      // Check if both teams match (order independent)
      const set1 = new Set(teams1);
      const set2 = new Set(teams2);

      // Both sets must be equal
      const match =
        set1.size === 2 &&
        set2.size === 2 &&
        teams1.every((t) => set2.has(t)) &&
        teams2.every((t) => set1.has(t));

      if (match) {
        potentialMatches++;
        const confidence = 100;

        matches.push({ market1: m1, market2: m2, confidence });

        if (potentialMatches <= 5) {
          console.log(`[Arbitrage] ✓ MATCH FOUND (${confidence}%):`);
          console.log(`  ${m1.originalMarket.platform}: "${m1.rawTitle}"`);
          console.log(`  Teams: [${teams1.join(', ')}]`);
          console.log(`  ${m2.originalMarket.platform}: "${m2.rawTitle}"`);
          console.log(`  Teams: [${teams2.join(', ')}]`);
        }
      }
    }
  }

  console.log(
    `[Arbitrage] Made ${comparisons} comparisons, found ${matches.length} matches`
  );

  return matches;
}

/**
 * FIXED: Sports confidence calculation
 */
function calculateSportsConfidence(m1: ParsedMarket, m2: ParsedMarket): number {
  const teams1 = [m1.entities.team1, m1.entities.team2].filter(
    Boolean
  ) as string[];
  const teams2 = [m2.entities.team1, m2.entities.team2].filter(
    Boolean
  ) as string[];

  // If no teams extracted, try extracting again from raw titles
  if (teams1.length === 0 || teams2.length === 0) {
    const extractedTeams1 = extractTeamsFromTitle(m1.rawTitle);
    const extractedTeams2 = extractTeamsFromTitle(m2.rawTitle);

    if (extractedTeams1.length === 0 || extractedTeams2.length === 0) {
      // No teams found - can't match
      return 0;
    }

    teams1.push(...extractedTeams1);
    teams2.push(...extractedTeams2);
  }

  // Calculate team match score
  const teamScore = calculateTeamMatchScore(teams1, teams2);

  if (teamScore === 0) return 0;

  let score = teamScore * 70; // 70 points max for team matching

  // Require at least 50% team match for sports
  if (teamScore < 0.5) return 0;

  // Same sport bonus
  if (m1.entities.sport && m2.entities.sport) {
    if (m1.entities.sport.toLowerCase() === m2.entities.sport.toLowerCase()) {
      score += 20;
    }
  }

  // Game format bonus
  const hasGameFormat1 = /\b(?:vs\.?|at|@|versus)\b/i.test(m1.rawTitle);
  const hasGameFormat2 = /\b(?:vs\.?|at|@|versus)\b/i.test(m2.rawTitle);
  if (hasGameFormat1 && hasGameFormat2) {
    score += 10;
  }

  return score;
}

/**
 * Match by category - ALL cases must be handled
 */
function matchByCategory(
  category: ParsedMarket['category'],
  markets: ParsedMarket[]
): Array<{ market1: ParsedMarket; market2: ParsedMarket; confidence: number }> {
  console.log(`[Arbitrage] Matching ${markets.length} ${category} markets`);

  switch (category) {
    case 'politics':
      return matchPoliticalMarkets(markets);

    case 'sports':
      return matchSportsMarkets(markets);

    case 'entertainment':
    case 'economics':
    case 'weather':
    case 'other':
      // Simple similarity matching for other categories
      const matches: Array<{
        market1: ParsedMarket;
        market2: ParsedMarket;
        confidence: number;
      }> = [];

      for (let i = 0; i < markets.length; i++) {
        for (let j = i + 1; j < markets.length; j++) {
          const m1 = markets[i];
          const m2 = markets[j];

          if (m1.originalMarket.platform === m2.originalMarket.platform) {
            continue;
          }

          const similarity = calculateSimilarity(m1.normalized, m2.normalized);

          if (similarity >= 0.9) {
            matches.push({
              market1: m1,
              market2: m2,
              confidence: similarity * 100,
            });
          }
        }
      }

      return matches;
  }
}

/**
 * IMPROVED: Add fallback matching for non-categorized markets
 */
function matchOtherMarkets(markets: ParsedMarket[]): Array<{
  market1: ParsedMarket;
  market2: ParsedMarket;
  confidence: number;
}> {
  const matches: Array<{
    market1: ParsedMarket;
    market2: ParsedMarket;
    confidence: number;
  }> = [];

  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const m1 = markets[i];
      const m2 = markets[j];

      // Must be from different platforms
      if (m1.originalMarket.platform === m2.originalMarket.platform) {
        continue;
      }

      // Very strict similarity required
      const titleSim = calculateSimilarity(m1.normalized, m2.normalized);

      if (titleSim >= 0.9) {
        // Also check that key subjects match
        const subject1 = extractMainSubject(m1.rawTitle);
        const subject2 = extractMainSubject(m2.rawTitle);

        if (subject1.toLowerCase() === subject2.toLowerCase()) {
          matches.push({
            market1: m1,
            market2: m2,
            confidence: titleSim * 100,
          });
        }
      }
    }
  }

  return matches;
}

/**
 * DEBUG: Add logging to see what's being compared
 */
function findMatchesStructured(markets: MarketResult[]): Array<{
  market1: ParsedMarket;
  market2: ParsedMarket;
  confidence: number;
}> {
  // Parse all markets
  const parsedMarkets = markets.map(parseMarket);

  // DEBUG: Log first few parsed markets
  console.log(`[Arbitrage] Sample parsed markets:`);
  for (let i = 0; i < Math.min(5, parsedMarkets.length); i++) {
    const p = parsedMarkets[i];
    console.log(`  ${i + 1}. [${p.category}] "${p.rawTitle}"`);
    console.log(`     Entities:`, p.entities);
    console.log(`     Normalized: "${p.normalized}"`);
  }

  // Group by category
  const byCategory = new Map<ParsedMarket['category'], ParsedMarket[]>();

  for (const parsed of parsedMarkets) {
    if (!byCategory.has(parsed.category)) {
      byCategory.set(parsed.category, []);
    }
    byCategory.get(parsed.category)!.push(parsed);
  }

  console.log(`[Arbitrage] Markets by category:`);
  for (const [cat, categoryMarkets] of byCategory.entries()) {
    console.log(`  ${cat}: ${categoryMarkets.length} markets`);

    // Show platforms in this category
    const platforms = new Set(
      categoryMarkets.map((m) => m.originalMarket.platform)
    );
    console.log(`    Platforms: ${[...platforms].join(', ')}`);
  }

  // Match within each category
  const allMatches: Array<{
    market1: ParsedMarket;
    market2: ParsedMarket;
    confidence: number;
  }> = [];

  for (const [category, categoryMarkets] of byCategory.entries()) {
    const categoryMatches = matchByCategory(category, categoryMarkets);
    console.log(
      `[Arbitrage] ${category}: Found ${categoryMatches.length} matches`
    );

    // DEBUG: Show first few matches
    for (let i = 0; i < Math.min(3, categoryMatches.length); i++) {
      const m = categoryMatches[i];
      console.log(`  Match ${i + 1} (${m.confidence.toFixed(1)}% confidence):`);
      console.log(
        `    - ${
          m.market1.originalMarket.platform
        }: "${m.market1.rawTitle.substring(0, 50)}"`
      );
      console.log(
        `    - ${
          m.market2.originalMarket.platform
        }: "${m.market2.rawTitle.substring(0, 50)}"`
      );
    }

    allMatches.push(...categoryMatches);
  }

  return allMatches;
}

export async function findArbitrageOpportunities(
  limit: number = 500
): Promise<ArbitrageOpportunity[]> {
  // Fetch markets from all platforms
  const allMarkets = await getFrontPageMarkets(limit);

  // Separate markets by platform
  const marketsByPlatform: Record<string, MarketResult[]> = {
    Kalshi: allMarkets.filter((m) => m.platform === 'Kalshi'),
    Polymarket: allMarkets.filter((m) => m.platform === 'Polymarket'),
    PredictIt: allMarkets.filter((m) => m.platform === 'PredictIt'),
  };

  // Count markets by platform
  const marketsByPlatformCount = allMarkets.reduce((acc, m) => {
    acc[m.platform] = (acc[m.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(
    `[Arbitrage] Fetched ${allMarkets.length} total markets for matching`
  );
  console.log(`[Arbitrage] Markets by platform:`, marketsByPlatformCount);
  console.log(
    `[Arbitrage] Kalshi: ${marketsByPlatform.Kalshi.length}, Polymarket: ${marketsByPlatform.Polymarket.length}, PredictIt: ${marketsByPlatform.PredictIt.length}`
  );

  // Compare all platform pairs
  // Generate all unique pairs: (Kalshi, Polymarket), (Kalshi, PredictIt), (Polymarket, PredictIt)
  const platformPairs: Array<[string, string]> = [
    ['Kalshi', 'Polymarket'],
    ['Kalshi', 'PredictIt'],
    ['Polymarket', 'PredictIt'],
  ];

  // STRUCTURED CATEGORY-BASED MATCHING
  console.log(`[Arbitrage] Using structured category-based matching`);

  // Find matches using structured approach
  const structuredMatches = findMatchesStructured(allMarkets);

  console.log(
    `[Arbitrage] Found ${structuredMatches.length} structured matches`
  );

  // Convert to opportunities
  const opportunities: ArbitrageOpportunity[] = [];

  for (const match of structuredMatches) {
    const spreadResult = calculateSpreadWithOutcomeMatching(
      match.market1.originalMarket,
      match.market2.originalMarket
    );

    if (spreadResult && spreadResult.maxSpread > 0.01) {
      // Determine confidence tier
      let confidenceTier: 'high' | 'medium' | 'low' = 'low';
      if (match.confidence >= 90) {
        confidenceTier = 'high';
      } else if (match.confidence >= 80) {
        confidenceTier = 'medium';
      }

      opportunities.push({
        id: `${match.market1.originalMarket.id}-${match.market2.originalMarket.id}`,
        markets: [match.market1.originalMarket, match.market2.originalMarket],
        spread: spreadResult.spread,
        maxSpread: spreadResult.maxSpread,
        bestBuy: {
          ...spreadResult.bestBuy,
          platform: spreadResult.bestBuy.market.platform,
        },
        bestSell: {
          ...spreadResult.bestSell,
          platform: spreadResult.bestSell.market.platform,
        },
        totalVolume:
          parseVolume(match.market1.originalMarket.volume || 0) +
          parseVolume(match.market2.originalMarket.volume || 0),
        avgLiquidity: 0, // Not calculated in structured approach
        title: match.market1.normalized,
        confidenceTier,
        similarityScore: match.confidence / 100, // Convert to 0-1 scale
      });

      console.log(
        `[Arbitrage] ✓ Match [${confidenceTier.toUpperCase()}] (${match.confidence.toFixed(
          1
        )}% confidence):`
      );
      console.log(
        `  ${
          match.market1.originalMarket.platform
        }: "${match.market1.rawTitle.substring(0, 60)}"`
      );
      console.log(
        `  ${
          match.market2.originalMarket.platform
        }: "${match.market2.rawTitle.substring(0, 60)}"`
      );
      console.log(`  Spread: ${spreadResult.maxSpread.toFixed(2)}%`);
    }
  }

  // Count by confidence tier
  const highConf = opportunities.filter(
    (o) => o.confidenceTier === 'high'
  ).length;
  const medConf = opportunities.filter(
    (o) => o.confidenceTier === 'medium'
  ).length;
  const lowConf = opportunities.filter(
    (o) => o.confidenceTier === 'low'
  ).length;

  console.log(
    `[Arbitrage] Returning ${opportunities.length} opportunities (High: ${highConf}, Medium: ${medConf}, Low: ${lowConf})`
  );

  // Sort by spread (highest first)
  opportunities.sort((a, b) => b.maxSpread - a.maxSpread);

  return opportunities.slice(0, limit);
}
