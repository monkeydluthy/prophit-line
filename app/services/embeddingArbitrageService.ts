/**
 * OpenAI Embeddings-Based Arbitrage Detection System
 * 
 * This service uses OpenAI's text-embedding-3-small model to find matching
 * markets across different platforms by comparing semantic similarity.
 */

import OpenAI from 'openai';
import { MarketResult } from '@/types';
import { getFrontPageMarkets, parseVolume } from './marketService';

// Import ArbitrageOpportunity type from arbitrageService
import { ArbitrageOpportunity } from './arbitrageService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Embedding cache to avoid re-processing same titles
// Version 3: Updated normalization with better team mappings
const CACHE_VERSION = 'v3';
const embeddingCache = new Map<string, number[]>();

// Similarity threshold for matching markets
// Lowered to 0.65 to catch legitimate matches after cache regeneration
// Will increase back to 0.70-0.75 once normalization improves
const EMBEDDING_SIMILARITY_THRESHOLD = 0.65;

/**
 * Clear the embedding cache (useful when titles are fixed)
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  console.log('[Embeddings] Cache cleared');
}

// Team name normalization map (nickname -> city)
const TEAM_NAME_MAP: Record<string, string> = {
  // NFL
  saints: 'new orleans',
  buccaneers: 'tampa bay',
  bucs: 'tampa bay',
  packers: 'green bay',
  chiefs: 'kansas city',
  '49ers': 'san francisco',
  niners: 'san francisco',
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
  'blue jackets': 'columbus',
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
  kraken: 'seattle',
  'golden knights': 'vegas',
  knights: 'vegas',
  // City to team mappings (bidirectional for better matching)
  portland: 'trail blazers',
  memphis: 'grizzlies',
  'new orleans': 'pelicans',
  'golden state': 'warriors',
  'oklahoma city': 'thunder',
  utah: 'jazz',
  sacramento: 'kings',
  phoenix: 'suns',
  'san antonio': 'spurs',
  indiana: 'pacers',
  orlando: 'magic',
  toronto: 'raptors',
};

/**
 * Normalize title for better embedding quality
 */
function normalizeForEmbedding(title: string): string {
  let normalized = title.toLowerCase();

  // Expand abbreviations for better embeddings
  normalized = normalized
    .replace(/\bbtc\b/g, 'bitcoin')
    .replace(/\beth\b/g, 'ethereum')
    .replace(/\bnfl\b/g, 'football game')
    .replace(/\bnba\b/g, 'basketball game')
    .replace(/\bnhl\b/g, 'hockey game')
    .replace(/\bmlb\b/g, 'baseball game')
    .replace(/\bncaa\b/g, 'college game');

  // Normalize team names to cities (helps embeddings match)
  // Sort by length (longest first) to match "trail blazers" before "blazers"
  const sortedTeamEntries = Object.entries(TEAM_NAME_MAP).sort(
    (a, b) => b[0].length - a[0].length
  );
  
  for (const [nickname, city] of sortedTeamEntries) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, city);
  }
  
  // Additional bidirectional mappings for common cases
  // City → Team (for cases like "Oklahoma City" → "thunder")
  const cityToTeam: Record<string, string> = {
    'oklahoma city': 'thunder',
    'los angeles': 'lakers clippers',
    philadelphia: 'sixers',
    houston: 'rockets',
    utah: 'jazz',
    seattle: 'kraken',
    portland: 'trail blazers',
    memphis: 'grizzlies',
    'new orleans': 'pelicans',
  };
  
  for (const [city, team] of Object.entries(cityToTeam)) {
    const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, team);
  }

  // Remove noise words but keep important connectors (vs, at, @) for sports
  // Be more conservative - only remove truly filler words
  normalized = normalized
    .replace(/\b(will|does|the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Detect market category for pre-filtering
 */
function detectCategory(title: string): 'sports' | 'politics' | 'crypto' | 'other' {
  const lower = title.toLowerCase();

  if (
    /\b(vs|at|@|game|match|playoff|championship|super bowl|nfl|nba|nhl|mlb|ncaa)\b/i.test(
      title
    ) ||
    Object.keys(TEAM_NAME_MAP).some((team) =>
      new RegExp(`\\b${team}\\b`, 'i').test(lower)
    )
  ) {
    return 'sports';
  }

  if (
    /\b(election|senate|house|governor|primary|nomination|party|republican|democrat|presidential|president)\b/i.test(
      title
    )
  ) {
    return 'politics';
  }

  if (
    /\b(bitcoin|btc|ethereum|eth|crypto|cryptocurrency|price|stock|market|gdp|inflation|fed|federal reserve)\b/i.test(
      title
    )
  ) {
    return 'crypto';
  }

  return 'other';
}

/**
 * Generate embeddings for a batch of texts
 */
async function generateEmbeddings(
  texts: string[],
  retries = 3
): Promise<number[][]> {
  const BATCH_SIZE = 100; // OpenAI allows batching
  const embeddings: number[][] = [];

  try {
    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      embeddings.push(...response.data.map((d) => d.embedding));
    }

    return embeddings;
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.status >= 500)) {
      // Rate limit or server error - retry
      console.log(
        `[Embeddings] Retrying after error (${retries} retries left)...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)));
      return generateEmbeddings(texts, retries - 1);
    }
    throw error;
  }
}

/**
 * Get cached or generate embedding for a single text
 */
async function getCachedEmbedding(text: string): Promise<number[]> {
  const normalized = normalizeForEmbedding(text);
  const cacheKey = `${CACHE_VERSION}:${normalized}`;

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const embeddings = await generateEmbeddings([normalized]);
  const embedding = embeddings[0];

  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Validate sports match - check if teams actually match
 */
function validateSportsMatch(m1: MarketResult, m2: MarketResult): boolean {
  const t1 = m1.title?.toLowerCase() || '';
  const t2 = m2.title?.toLowerCase() || '';

  // Extract potential team names (words before "at"/"vs")
  const team1Match = t1.match(/^([^@vs]+)(?:\s+(?:at|vs|@)\s+)([^@vs]+)$/i);
  const team2Match = t2.match(/^([^@vs]+)(?:\s+(?:at|vs|@)\s+)([^@vs]+)$/i);

  if (!team1Match || !team2Match) return true; // Can't validate, allow it

  const [_, t1a, t1b] = team1Match;
  const [__, t2a, t2b] = team2Match;

  // Check if team names overlap
  const teams1 = [t1a.trim(), t1b.trim()];
  const teams2 = [t2a.trim(), t2b.trim()];

  // Simple word overlap check
  const words1 = teams1.flatMap(t => t.toLowerCase().split(/\s+/));
  const words2 = teams2.flatMap(t => t.toLowerCase().split(/\s+/));
  const overlap = words1.filter(w => words2.includes(w) && w.length > 3).length;

  return overlap >= 1; // At least one team name overlaps
}

/**
 * Validate politics match - ensure same state and office
 */
function validatePoliticsMatch(m1: MarketResult, m2: MarketResult): boolean {
  const t1 = m1.title?.toLowerCase() || '';
  const t2 = m2.title?.toLowerCase() || '';

  // Extract office type
  const getOffice = (title: string): string | null => {
    if (/senate/i.test(title)) return 'senate';
    if (/house/i.test(title)) return 'house';
    if (/governor/i.test(title)) return 'governor';
    if (/presidential/i.test(title)) return 'president';
    return null;
  };

  // Extract state
  const getState = (title: string): string | null => {
    const states = [
      'nebraska', 'minnesota', 'virginia', 'ohio', 'michigan',
      'colorado', 'washington', 'california', 'new york', 'texas',
      'florida', 'pennsylvania', 'north carolina', 'south carolina',
      'georgia', 'arizona', 'wisconsin', 'nevada', 'new hampshire'
    ];

    for (const state of states) {
      if (title.toLowerCase().includes(state)) {
        return state;
      }
    }
    return null;
  };

  // Extract party/primary
  const getPrimary = (title: string): string | null => {
    if (/republican\s+(?:senate|house|gubernatorial)?\s*primary/i.test(title)) return 'republican';
    if (/democratic?\s+(?:senate|house|gubernatorial)?\s*primary/i.test(title)) return 'democratic';
    return null;
  };

  const office1 = getOffice(t1);
  const office2 = getOffice(t2);
  const state1 = getState(t1);
  const state2 = getState(t2);
  const primary1 = getPrimary(t1);
  const primary2 = getPrimary(t2);

  // MUST match on office (senate vs senate, NOT senate vs governor)
  if (office1 && office2 && office1 !== office2) {
    return false;
  }

  // MUST match on state (Nebraska vs Nebraska, NOT Nebraska vs Minnesota)
  if (state1 && state2 && state1 !== state2) {
    return false;
  }

  // If one is a primary and one isn't, check if they're the same party
  if ((primary1 && !primary2) || (!primary1 && primary2)) {
    // One is primary, one is general - these are different markets
    return false;
  }

  // If both are primaries, must be same party
  if (primary1 && primary2 && primary1 !== primary2) {
    return false;
  }

  return true; // Passed all checks
}

/**
 * Calculate price spread between two markets
 */
function calculatePriceSpread(m1: MarketResult, m2: MarketResult): number {
  // Find best buy and sell prices
  let bestBuyPrice = 1;
  let bestSellPrice = 0;
  let bestBuyMarket: MarketResult | null = null;
  let bestSellMarket: MarketResult | null = null;

  // Check market 1
  if (m1.outcomes && m1.outcomes.length > 0) {
    const yesPrice = m1.outcomes[0]?.price || m1.price || 0;
    if (yesPrice < bestBuyPrice) {
      bestBuyPrice = yesPrice;
      bestBuyMarket = m1;
    }
    if (yesPrice > bestSellPrice) {
      bestSellPrice = yesPrice;
      bestSellMarket = m1;
    }
  }

  // Check market 2
  if (m2.outcomes && m2.outcomes.length > 0) {
    const yesPrice = m2.outcomes[0]?.price || m2.price || 0;
    if (yesPrice < bestBuyPrice) {
      bestBuyPrice = yesPrice;
      bestBuyMarket = m2;
    }
    if (yesPrice > bestSellPrice) {
      bestSellPrice = yesPrice;
      bestSellMarket = m2;
    }
  }

  if (!bestBuyMarket || !bestSellMarket || bestBuyMarket === bestSellMarket) {
    return 0;
  }

  // Calculate spread percentage
  const spread = bestSellPrice - bestBuyPrice;
  return spread * 100; // Return as percentage
}

/**
 * Check if two markets are in the same category
 */
function categoriesMatch(m1: MarketResult, m2: MarketResult): boolean {
  const cat1 = detectCategory(m1.title);
  const cat2 = detectCategory(m2.title);
  return cat1 === cat2;
}

/**
 * Main function: Find arbitrage opportunities using embeddings
 */
export async function findArbitrageWithEmbeddings(
  limit: number = 100
): Promise<ArbitrageOpportunity[]> {
  const startTime = Date.now();

  try {
    // 1. Fetch markets from all platforms
    console.log(`[Embeddings] Fetching markets (limit: ${limit})...`);
    const markets = await getFrontPageMarkets(limit);
    console.log(`[Embeddings] Fetched ${markets.length} markets`);

    if (markets.length === 0) {
      return [];
    }

    // 2. Validate markets before processing
    function validateMarketTitle(market: MarketResult): boolean {
      const title = market.title || '';

      if (!title || title.length < 5) return false;
      if (title === 'Combo' || title === 'Unknown' || title === 'Unknown Market') return false;
      if (title.startsWith('Kalshi Market ') && title.length < 20) return false; // Skip generic fallbacks

      return true;
    }

    const validMarkets = markets.filter(validateMarketTitle);

    console.log(
      `[Embeddings] Valid markets: ${validMarkets.length}/${markets.length} (${((validMarkets.length / markets.length) * 100).toFixed(1)}%)`
    );

    if (validMarkets.length === 0) {
      console.warn('[Embeddings] No valid markets to process!');
      return [];
    }

    // 3. Normalize titles for valid markets only
    const normalizedTitles = validMarkets.map((m) => normalizeForEmbedding(m.title));

    // 5. Generate embeddings (with caching)
    console.log(`[Embeddings] Generating embeddings...`);
    const embeddingStartTime = Date.now();

    // Check cache first
    const uncachedIndices: number[] = [];
    const cachedEmbeddings: (number[] | null)[] = [];

    for (let i = 0; i < normalizedTitles.length; i++) {
      const normalized = normalizedTitles[i];
      const cacheKey = `${CACHE_VERSION}:${normalized}`;
      if (embeddingCache.has(cacheKey)) {
        cachedEmbeddings[i] = embeddingCache.get(cacheKey)!;
      } else {
        cachedEmbeddings[i] = null;
        uncachedIndices.push(i);
      }
    }

    // Generate embeddings for uncached titles
    if (uncachedIndices.length > 0) {
      const uncachedTitles = uncachedIndices.map((i) => normalizedTitles[i]);
      const newEmbeddings = await generateEmbeddings(uncachedTitles);

      // Store in cache and array
      for (let j = 0; j < uncachedIndices.length; j++) {
        const index = uncachedIndices[j];
        const embedding = newEmbeddings[j];
        cachedEmbeddings[index] = embedding;
        const cacheKey = `${CACHE_VERSION}:${normalizedTitles[index]}`;
        embeddingCache.set(cacheKey, embedding);
      }
    }

    const embeddings = cachedEmbeddings as number[][];
    const embeddingTime = Date.now() - embeddingStartTime;
    console.log(
      `[Embeddings] Generated ${uncachedIndices.length} new embeddings, ${embeddingTime}ms`
    );

    // 6. Pre-filter by category for efficiency (after validation)
    const categorized = validMarkets.reduce(
      (acc, m) => {
        const cat = detectCategory(m.title);
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(m);
        return acc;
      },
      {} as Record<string, MarketResult[]>
    );

    console.log(`[Embeddings] Markets by category:`);
    for (const [cat, catMarkets] of Object.entries(categorized)) {
      console.log(`  ${cat}: ${catMarkets.length} markets`);
    }

    // 7. Find matches by comparing within categories
    const matches: Array<{
      market1: MarketResult;
      market2: MarketResult;
      similarity: number;
    }> = [];

    let comparisons = 0;
    const allSimilarities: number[] = [];
    const topMatches: Array<{
      market1: MarketResult;
      market2: MarketResult;
      similarity: number;
    }> = [];

    // DEBUG: Sample embeddings to verify they're different
    console.log('\n🔍 DETAILED MATCHING DEBUG');
    console.log('\n📊 Input Summary:');
    console.log(`   Markets: ${validMarkets.length}`);
    console.log(`   Embeddings: ${embeddings.length}`);
    console.log(`   Embedding dimensions: ${embeddings[0]?.length || 0}`);

    // Check embedding magnitudes
    if (embeddings.length > 0) {
      console.log('\n🔢 Sample Embeddings (first 5 dimensions):');
      for (let i = 0; i < Math.min(5, embeddings.length); i++) {
        const emb = embeddings[i];
        const sample = emb.slice(0, 5);
        const magnitude = Math.sqrt(emb.reduce((sum, val) => sum + val * val, 0));
        console.log(`   ${i}. [${sample.map(v => v.toFixed(3)).join(', ')}...] mag=${magnitude.toFixed(3)}`);
      }

      // Check if all embeddings are identical (cache issue)
      const firstEmb = embeddings[0];
      const allSame = embeddings.length > 1 && embeddings.every(emb => 
        emb.every((val, idx) => Math.abs(val - firstEmb[idx]) < 0.0001)
      );
      if (allSame) {
        console.log('   ⚠️  WARNING: All embeddings are identical! Cache may be broken.');
      } else {
        console.log('   ✓ All different magnitudes');
      }
    }

    for (const [category, categoryMarkets] of Object.entries(categorized)) {
      const categoryIndices = categoryMarkets.map((m) => validMarkets.indexOf(m));

      for (let i = 0; i < categoryIndices.length; i++) {
        for (let j = i + 1; j < categoryIndices.length; j++) {
          const idx1 = categoryIndices[i];
          const idx2 = categoryIndices[j];
          
          if (idx1 === -1 || idx2 === -1) continue;
          
          const m1 = validMarkets[idx1];
          const m2 = validMarkets[idx2];

          // Only compare across platforms
          if (m1.platform === m2.platform) continue;

          comparisons++;

          const similarity = cosineSimilarity(embeddings[idx1], embeddings[idx2]);
          allSimilarities.push(similarity);

          // Track top matches regardless of threshold
          if (topMatches.length < 20 || similarity > topMatches[topMatches.length - 1].similarity) {
            topMatches.push({ market1: m1, market2: m2, similarity });
            topMatches.sort((a, b) => b.similarity - a.similarity);
            if (topMatches.length > 20) topMatches.pop();
          }

          // High confidence threshold - lowered to 0.70 to catch legitimate matches
          if (similarity > EMBEDDING_SIMILARITY_THRESHOLD) {
            // Category-specific validation
            const cat1 = detectCategory(m1.title);
            const cat2 = detectCategory(m2.title);

            // Must be same category
            if (cat1 !== cat2) continue;

            // Additional validation by category
            let valid = true;

            if (cat1 === 'sports') {
              valid = validateSportsMatch(m1, m2);
              if (!valid) {
                console.log(`[Validation] ✗ Rejected sports match at ${(similarity * 100).toFixed(1)}%: "${m1.title.substring(0, 40)}" vs "${m2.title.substring(0, 40)}"`);
              }
            }

            if (cat1 === 'politics') {
              valid = validatePoliticsMatch(m1, m2);
              if (!valid) {
                console.log(`[Validation] ✗ Rejected politics match at ${(similarity * 100).toFixed(1)}%: "${m1.title.substring(0, 40)}" vs "${m2.title.substring(0, 40)}"`);
              }
            }

            if (!valid) continue;

            // Check price spread
            const hasSpread = calculatePriceSpread(m1, m2) > 0.5;

            if (hasSpread) {
              matches.push({
                market1: m1,
                market2: m2,
                similarity,
              });
            }
          }
        }
      }
    }

    // DEBUG: Similarity statistics
    if (allSimilarities.length > 0) {
      const sorted = [...allSimilarities].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const avg = allSimilarities.reduce((sum, val) => sum + val, 0) / allSimilarities.length;
      const median = sorted[Math.floor(sorted.length / 2)];

      console.log('\n📏 Similarity Statistics:');
      console.log(`   Compared ${comparisons} pairs`);
      console.log(`   Min:  ${(min * 100).toFixed(1)}%`);
      console.log(`   Avg:  ${(avg * 100).toFixed(1)}%`);
      console.log(`   Median: ${(median * 100).toFixed(1)}%`);
      console.log(`   Max:  ${(max * 100).toFixed(1)}%`);

      // Distribution buckets
      const buckets = {
        '0-20%': 0,
        '20-40%': 0,
        '40-60%': 0,
        '60-80%': 0,
        '80-100%': 0,
      };

      allSimilarities.forEach(sim => {
        const pct = sim * 100;
        if (pct < 20) buckets['0-20%']++;
        else if (pct < 40) buckets['20-40%']++;
        else if (pct < 60) buckets['40-60%']++;
        else if (pct < 80) buckets['60-80%']++;
        else buckets['80-100%']++;
      });

      console.log('\n   Distribution:');
      Object.entries(buckets).forEach(([range, count]) => {
        const pct = ((count / allSimilarities.length) * 100).toFixed(1);
        const bar = '█'.repeat(Math.floor(count / allSimilarities.length * 30));
        console.log(`   ${range.padEnd(10)}: ${bar} ${count} (${pct}%)`);
      });

      // Show top matches
      console.log('\n🏆 TOP 20 MATCHES:');
      topMatches.slice(0, 20).forEach((match, idx) => {
        const cat1 = detectCategory(match.market1.title);
        const cat2 = detectCategory(match.market2.title);
        const catMatch = cat1 === cat2 ? '✓' : '✗';
        console.log(`   ${idx + 1}. ${(match.similarity * 100).toFixed(1)}% similarity`);
        console.log(`      ${match.market1.platform}: "${match.market1.title.substring(0, 60)}"`);
        console.log(`      ${match.market2.platform}: "${match.market2.title.substring(0, 60)}"`);
        console.log(`      Categories: ${cat1} vs ${cat2} ${catMatch}`);
        const spread = calculatePriceSpread(match.market1, match.market2);
        console.log(`      Spread: ${spread.toFixed(2)}% ${spread > 0.5 ? '✓' : '✗'}`);
        console.log('');
      });

      // Red flags
      if (max < 0.5) {
        console.log('🚨 RED FLAG: No similarities above 50% - normalization may be too aggressive OR no duplicate markets exist');
      }
      if (max > 0.95 && allSimilarities.filter(s => s > 0.9).length > allSimilarities.length * 0.5) {
        console.log('🚨 RED FLAG: Everything has high similarity - all titles normalized to same thing');
      }
      if (comparisons === 0) {
        console.log('🚨 RED FLAG: Zero comparisons made - all markets from same platform (filtering bug)');
      }

      // Normalization check - find pairs with high word overlap but low similarity
      console.log('\n🔍 Normalization Check (high word overlap, low similarity):');
      let normalizationIssues = 0;
      for (const match of topMatches.slice(0, 10)) {
        const title1 = match.market1.title.toLowerCase();
        const title2 = match.market2.title.toLowerCase();
        const words1 = new Set(title1.split(/\s+/));
        const words2 = new Set(title2.split(/\s+/));
        const overlap = [...words1].filter(w => words2.has(w)).length;
        const totalWords = Math.max(words1.size, words2.size);
        const overlapPct = (overlap / totalWords) * 100;
        
        if (overlapPct > 50 && match.similarity < 0.7) {
          normalizationIssues++;
          if (normalizationIssues <= 5) {
            console.log(`   ${normalizationIssues}. ${overlapPct.toFixed(0)}% word overlap, ${(match.similarity * 100).toFixed(1)}% similarity`);
            console.log(`      "${match.market1.title.substring(0, 50)}"`);
            console.log(`      "${match.market2.title.substring(0, 50)}"`);
            const norm1 = normalizeForEmbedding(match.market1.title);
            const norm2 = normalizeForEmbedding(match.market2.title);
            console.log(`      Normalized: "${norm1.substring(0, 50)}" vs "${norm2.substring(0, 50)}"`);
            console.log('');
          }
        }
      }
      if (normalizationIssues === 0) {
        console.log('   ✓ No obvious normalization issues detected');
      } else {
        console.log(`   ⚠️  Found ${normalizationIssues} pairs with high word overlap but low similarity`);
      }
    }

    console.log(
      `\n[Embeddings] Made ${comparisons} comparisons, found ${matches.length} potential matches above ${EMBEDDING_SIMILARITY_THRESHOLD} threshold`
    );

    // 6. Convert to ArbitrageOpportunity format
    const opportunities: ArbitrageOpportunity[] = [];

    for (const match of matches) {
      const spread = calculatePriceSpread(match.market1, match.market2);

      // Determine best buy and sell
      const m1YesPrice =
        match.market1.outcomes?.[0]?.price || match.market1.price || 0;
      const m2YesPrice =
        match.market2.outcomes?.[0]?.price || match.market2.price || 0;

      // Debug: Log price extraction
      if (opportunities.length < 3) {
        console.log(`[Debug] Match ${opportunities.length + 1} price extraction:`);
        console.log(`  Market 1: "${match.market1.title}"`);
        console.log(`    outcomes[0]?.price: ${match.market1.outcomes?.[0]?.price}`);
        console.log(`    market.price: ${match.market1.price}`);
        console.log(`    extracted: ${m1YesPrice}`);
        console.log(`  Market 2: "${match.market2.title}"`);
        console.log(`    outcomes[0]?.price: ${match.market2.outcomes?.[0]?.price}`);
        console.log(`    market.price: ${match.market2.price}`);
        console.log(`    extracted: ${m2YesPrice}`);
        console.log(`  Calculated spread: ${spread.toFixed(2)}%`);
      }

      let bestBuy: MarketResult;
      let bestSell: MarketResult;
      let bestBuyPrice: number;
      let bestSellPrice: number;

      if (m1YesPrice < m2YesPrice) {
        bestBuy = match.market1;
        bestSell = match.market2;
        bestBuyPrice = m1YesPrice;
        bestSellPrice = m2YesPrice;
      } else {
        bestBuy = match.market2;
        bestSell = match.market1;
        bestBuyPrice = m2YesPrice;
        bestSellPrice = m1YesPrice;
      }

      // Updated confidence tiers for new threshold (0.65)
      const confidenceTier: 'high' | 'medium' | 'low' =
        match.similarity > 0.75
          ? 'high'
          : match.similarity > 0.70
            ? 'medium'
            : match.similarity > 0.65
              ? 'low'
              : 'low';

      opportunities.push({
        id: `${bestBuy.id}-${bestSell.id}`,
        markets: [bestBuy, bestSell],
        title: match.market1.title,
        bestBuy: {
          market: bestBuy,
          price: bestBuyPrice,
          platform: bestBuy.platform,
          outcomeIndex: 0,
        },
        bestSell: {
          market: bestSell,
          price: bestSellPrice,
          platform: bestSell.platform,
          outcomeIndex: 0,
        },
        spread: spread,
        maxSpread: spread,
        totalVolume: parseVolume(bestBuy.volume || '0') + parseVolume(bestSell.volume || '0'),
        avgLiquidity: (parseVolume(bestBuy.liquidity || '0') + parseVolume(bestSell.liquidity || '0')) / 2,
        confidenceTier,
        similarityScore: match.similarity,
      });
    }

    // Sort by similarity (highest first)
    opportunities.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

    // Log top 5 matches
    console.log(`[Embeddings] Top 5 matches:`);
    for (let i = 0; i < Math.min(5, opportunities.length); i++) {
      const opp = opportunities[i];
      console.log(
        `  ${i + 1}. ${(opp.similarityScore || 0).toFixed(3)} similarity (${opp.confidenceTier}): "${opp.title.substring(0, 50)}"`
      );
      console.log(
        `     ${opp.bestBuy.platform} @ ${(opp.bestBuy.price * 100).toFixed(1)}% ↔ ${opp.bestSell.platform} @ ${(opp.bestSell.price * 100).toFixed(1)}% (${opp.spread.toFixed(2)}% spread)`
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `[Embeddings] Found ${opportunities.length} arbitrage opportunities in ${totalTime}ms`
    );

    // Debug: Log final opportunities before returning
    console.log(`\n🔍 EMBEDDING SERVICE FINAL CHECK:`);
    console.log(`  Total opportunities: ${opportunities.length}`);

    for (let i = 0; i < Math.min(opportunities.length, 10); i++) {
      const opp = opportunities[i];
      console.log(`\n  ${i + 1}. ${opp.title}`);
      console.log(`     Platforms: ${opp.bestBuy.platform} ↔ ${opp.bestSell.platform}`);
      console.log(`     Spread: ${opp.maxSpread.toFixed(2)}%`);
      console.log(`     Confidence: ${opp.confidenceTier}`);
      console.log(`     Similarity: ${((opp.similarityScore || 0) * 100).toFixed(1)}%`);
      if (opp.markets && opp.markets.length >= 2) {
        console.log(`     Markets:`);
        console.log(`       - "${opp.markets[0].title}"`);
        console.log(`       - "${opp.markets[1].title}"`);
      }
    }

    console.log(`\n🔍 FINAL: Returning ${opportunities.length} opportunities\n`);

    return opportunities;
  } catch (error: any) {
    console.error('[Embeddings] Error in findArbitrageWithEmbeddings:', error);
    // Return empty array on error (don't crash)
    return [];
  }
}

