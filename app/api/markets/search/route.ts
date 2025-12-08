import { NextRequest, NextResponse } from 'next/server';
import {
  searchMarkets,
  parseVolume,
  getFrontPageMarkets,
} from '@/app/services/marketService';
import { ParsedPrediction, MarketResult } from '@/types';

// Helper function to detect market category
function getMarketCategory(market: MarketResult): string {
  const title = (market.title || '').toLowerCase();
  const outcomes = (market.outcomes || [])
    .map((o) => o.name.toLowerCase())
    .join(' ');
  const text = `${title} ${outcomes}`;

  if (
    text.includes('president') ||
    text.includes('election') ||
    text.includes('senate') ||
    text.includes('congress') ||
    text.includes('trump') ||
    text.includes('biden') ||
    text.includes('democrat') ||
    text.includes('republican') ||
    text.includes('vote') ||
    text.includes('poll') ||
    text.includes('political')
  ) {
    return 'Politics';
  }

  if (
    text.includes('nfl') ||
    text.includes('nba') ||
    text.includes('mlb') ||
    text.includes('nhl') ||
    text.includes('soccer') ||
    text.includes('football') ||
    text.includes('basketball') ||
    text.includes('baseball') ||
    text.includes('hockey') ||
    text.includes('super bowl') ||
    text.includes('championship') ||
    text.includes('playoff') ||
    text.includes('win') ||
    text.includes('team') ||
    text.includes('game') ||
    // NFL teams
    text.includes('chiefs') ||
    text.includes('bills') ||
    text.includes('cowboys') ||
    text.includes('eagles') ||
    text.includes('patriots') ||
    text.includes('packers') ||
    text.includes('49ers') ||
    text.includes('ravens') ||
    text.includes('dolphins') ||
    text.includes('steelers') ||
    text.includes('browns') ||
    text.includes('bengals') ||
    text.includes('jets') ||
    text.includes('giants') ||
    text.includes('commanders') ||
    text.includes('bears') ||
    text.includes('lions') ||
    text.includes('vikings') ||
    text.includes('falcons') ||
    text.includes('panthers') ||
    text.includes('saints') ||
    text.includes('buccaneers') ||
    text.includes('cardinals') ||
    text.includes('rams') ||
    text.includes('seahawks') ||
    text.includes('titans') ||
    text.includes('colts') ||
    text.includes('jaguars') ||
    text.includes('texans') ||
    text.includes('broncos') ||
    text.includes('raiders') ||
    text.includes('chargers')
  ) {
    return 'Sports';
  }

  if (
    text.includes('bitcoin') ||
    text.includes('btc') ||
    text.includes('ethereum') ||
    text.includes('eth') ||
    text.includes('crypto') ||
    text.includes('blockchain') ||
    text.includes('defi') ||
    text.includes('nft') ||
    text.includes('coin') ||
    text.includes('token')
  ) {
    return 'Crypto';
  }

  return 'Other';
}

// Keyword synonyms and expansions
const KEYWORD_SYNONYMS: Record<string, string[]> = {
  nfl: [
    'football',
    'nfl game',
    'national football league',
    'nfl team',
    'nfl championship',
    'super bowl',
  ],
  football: ['nfl', 'nfl game', 'football game', 'nfl team'],
  nba: ['basketball', 'nba game', 'national basketball association'],
  basketball: ['nba', 'nba game'],
  mlb: ['baseball', 'mlb game', 'major league baseball'],
  baseball: ['mlb', 'mlb game'],
  nhl: ['hockey', 'nhl game', 'national hockey league'],
  hockey: ['nhl', 'nhl game'],
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency'],
  bitcoin: ['btc', 'crypto', 'cryptocurrency'],
  btc: ['bitcoin', 'crypto'],
  ethereum: ['eth', 'crypto'],
  eth: ['ethereum', 'crypto'],
  politics: ['election', 'president', 'senate', 'congress', 'trump', 'biden'],
  election: ['politics', 'president', 'senate', 'congress'],
};

const PLATFORM_ORDER: Array<MarketResult['platform']> = [
  'Polymarket',
  'Kalshi',
  'PredictIt',
];

function mixPlatforms(markets: MarketResult[], limit: number): MarketResult[] {
  const buckets = new Map<MarketResult['platform'], MarketResult[]>();
  markets.forEach((m) => {
    if (!buckets.has(m.platform)) buckets.set(m.platform, []);
    buckets.get(m.platform)!.push(m);
  });

  const mixed: MarketResult[] = [];
  let round = 0;
  while (mixed.length < limit) {
    let addedInRound = false;
    for (const platform of PLATFORM_ORDER) {
      const bucket = buckets.get(platform);
      if (!bucket || bucket.length <= round) continue;
      const candidate = bucket[round];
      if (candidate) {
        mixed.push(candidate);
        addedInRound = true;
        if (mixed.length === limit) break;
      }
    }
    if (!addedInRound) break;
    round += 1;
  }

  if (mixed.length < limit) {
    const seen = new Set(mixed.map((m) => m.id));
    for (const market of markets) {
      if (mixed.length === limit) break;
      if (!seen.has(market.id)) {
        mixed.push(market);
      }
    }
  }

  return mixed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const parsed: ParsedPrediction = {
      event: q,
      outcome: q,
      timeframe: undefined,
      conditions: [],
    };

    let markets = await searchMarkets(parsed);
    const lowerQ = q.toLowerCase().trim();

    console.log(`[Search] searchMarkets returned ${markets.length} markets`);

    // Calculate query category early to check if we need a fallback
    const queryCategoryForFallback = getMarketCategory({
      id: '',
      platform: 'Polymarket',
      title: lowerQ,
      outcomes: [],
      volume: '0',
      liquidity: '0',
      link: '',
    } as MarketResult);

    // If searchMarkets returned very few results and query has a specific category,
    // try fetching trending markets and filtering by category as fallback
    if (markets.length < 10 && queryCategoryForFallback !== 'Other') {
      console.log(
        `[Search] Few results (${markets.length}), trying category-based fallback for "${queryCategoryForFallback}"`
      );
      try {
        const trendingMarkets = await getFrontPageMarkets(200);
        const categoryFiltered = trendingMarkets.filter((m) => {
          const mktCat = getMarketCategory(m);
          return mktCat === queryCategoryForFallback;
        });
        console.log(
          `[Search] Fallback found ${categoryFiltered.length} markets in category "${queryCategoryForFallback}"`
        );
        // Combine with original results, prioritizing original search results
        const originalIds = new Set(markets.map((m) => m.id));
        const newMarkets = categoryFiltered.filter(
          (m) => !originalIds.has(m.id)
        );
        markets = [...markets, ...newMarkets];
        console.log(
          `[Search] Combined: ${markets.length} total markets (${
            markets.length - newMarkets.length
          } from search, ${newMarkets.length} from category fallback)`
        );
      } catch (error) {
        console.error('[Search] Fallback error:', error);
      }
    }

    // Extract key terms from query (remove common words)
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
      'before',
      'after',
      'when',
    ]);
    const queryTerms = lowerQ
      .split(/\s+/)
      .filter((term) => term.length > 1 && !stopWords.has(term))
      .map((term) => term.replace(/[^a-z0-9]/g, '')) // Remove punctuation
      .filter((term) => term.length > 0);

    // Expand query terms with synonyms
    const expandedTerms = new Set<string>();
    queryTerms.forEach((term) => {
      expandedTerms.add(term);
      // Add synonyms if they exist
      if (KEYWORD_SYNONYMS[term]) {
        KEYWORD_SYNONYMS[term].forEach((synonym) => {
          expandedTerms.add(synonym.toLowerCase().replace(/[^a-z0-9\s]/g, ''));
        });
      }
    });

    // If no meaningful terms after filtering, use the whole query
    const searchTerms = Array.from(expandedTerms).filter((t) => t.length > 0);
    const originalTerms =
      queryTerms.length > 0
        ? queryTerms
        : [lowerQ.replace(/[^a-z0-9\s]/g, '')].filter((t) => t.length > 0);

    if (searchTerms.length === 0 && originalTerms.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate query category ONCE before the loop
    const queryCategory = getMarketCategory({
      id: '',
      platform: 'Polymarket',
      title: lowerQ,
      outcomes: [],
      volume: '0',
      liquidity: '0',
      link: '',
    } as MarketResult);

    console.log(
      `[Search] Query: "${q}", Original Terms: [${originalTerms.join(
        ', '
      )}], Expanded: [${Array.from(expandedTerms).join(
        ', '
      )}], Query Category: "${queryCategory}"`
    );

    // Score and filter markets based on relevance - WITH CATEGORY MATCHING
    const scoredMarkets = markets.map((market) => {
      const title = (market.title || '').toLowerCase();
      const outcomes = (market.outcomes || [])
        .map((o) => o.name.toLowerCase())
        .join(' ');
      const allText = `${title} ${outcomes}`;
      const marketCategory = getMarketCategory(market);

      let score = 0;
      let hasMatch = false;

      // Exact query match in title (highest priority)
      if (title.includes(lowerQ)) {
        score += 200;
        hasMatch = true;
      }

      // Check original terms first (user's actual query)
      const originalTermMatches = originalTerms.map((term) => {
        const isShortTerm = term.length <= 3;

        if (isShortTerm) {
          // Short terms MUST match as whole words only (prevents "agi" matching "Jagiellonia")
          const wordBoundaryRegex = new RegExp(
            `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'i'
          );
          const matches = wordBoundaryRegex.test(allText);
          return { term, matches, isWholeWord: true };
        } else {
          // Longer terms can match as substring, but whole word is better
          const wordBoundaryRegex = new RegExp(
            `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'i'
          );
          const wholeWordMatch = wordBoundaryRegex.test(allText);
          const substringMatch = allText.includes(term);
          return {
            term,
            matches: wholeWordMatch || substringMatch,
            isWholeWord: wholeWordMatch,
          };
        }
      });

      // Check expanded terms (synonyms)
      type TermMatch = {
        term: string;
        matches: boolean;
        isWholeWord: boolean;
        isSynonym?: boolean;
      };
      const expandedTermMatches: TermMatch[] = Array.from(expandedTerms)
        .filter((term) => !originalTerms.includes(term)) // Skip if already checked
        .map((term) => {
          const isShortTerm = term.length <= 3;

          if (isShortTerm) {
            const wordBoundaryRegex = new RegExp(
              `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
              'i'
            );
            const matches = wordBoundaryRegex.test(allText);
            return { term, matches, isWholeWord: true, isSynonym: true };
          } else {
            const wordBoundaryRegex = new RegExp(
              `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
              'i'
            );
            const wholeWordMatch = wordBoundaryRegex.test(allText);
            const substringMatch = allText.includes(term);
            return {
              term,
              matches: wholeWordMatch || substringMatch,
              isWholeWord: wholeWordMatch,
              isSynonym: true,
            };
          }
        });

      const allTermMatches: TermMatch[] = [
        ...originalTermMatches.map((t) => ({ ...t, isSynonym: false })),
        ...expandedTermMatches,
      ];
      const matchingTerms = allTermMatches.filter((t) => t.matches);
      const wholeWordMatches = allTermMatches.filter(
        (t) => t.matches && t.isWholeWord
      );
      const synonymMatches = allTermMatches.filter(
        (t) => t.matches && t.isSynonym
      );

      // Match logic: Check category first, then terms
      const allOriginalTermsMatch = originalTermMatches.every((t) => t.matches);
      const allShortTermsAreWholeWords = originalTerms
        .filter((t) => t.length <= 3)
        .every((shortTerm) => {
          const match = originalTermMatches.find((t) => t.term === shortTerm);
          return match && match.isWholeWord;
        });

      // Check if category matches
      const categoryMatches =
        queryCategory !== 'Other' && marketCategory === queryCategory;

      // Priority 1: Category match (most important for broad searches like "nfl")
      if (categoryMatches) {
        hasMatch = true;
        score += 100; // Base score for category match

        // Bonus if terms also match
        if (allOriginalTermsMatch && allShortTermsAreWholeWords) {
          score += 100; // Both category and all terms match perfectly
        } else if (allOriginalTermsMatch) {
          score += 80; // All terms match (even if not whole words)
        } else if (matchingTerms.length > 0) {
          score += matchingTerms.length * 20; // Some terms match
        }

        // Synonym bonus
        if (synonymMatches.length > 0) {
          score += synonymMatches.length * 10;
        }
      }
      // Priority 2: All terms match exactly (for specific searches)
      else if (allOriginalTermsMatch && allShortTermsAreWholeWords) {
        hasMatch = true;
        score += 150;
        score += wholeWordMatches.length * 20;
        if (synonymMatches.length > 0) {
          score += synonymMatches.length * 10;
        }
      }
      // Priority 3: All terms match (but not as whole words)
      else if (
        allOriginalTermsMatch &&
        originalTerms.every((t) => t.length > 3)
      ) {
        hasMatch = true;
        score += 120;
        score += wholeWordMatches.length * 15;
        if (synonymMatches.length > 0) {
          score += synonymMatches.length * 10;
        }
      }
      // Priority 4: Most terms match (70%+)
      else if (matchingTerms.length >= Math.ceil(originalTerms.length * 0.7)) {
        hasMatch = true;
        score += matchingTerms.length * 15;
        if (synonymMatches.length > 0) {
          score += synonymMatches.length * 5;
        }
      }
      // Priority 5: Single word query with any match
      else if (originalTerms.length === 1 && matchingTerms.length > 0) {
        hasMatch = true;
        score += 50;
        if (synonymMatches.length > 0) {
          score += synonymMatches.length * 5;
        }
      }

      // Penalize if no match at all
      if (!hasMatch) {
        return { market, score: 0, hasMatch: false };
      }

      // Boost score for volume (more popular = more relevant, but cap it)
      const volume = parseVolume(market.volume);
      score += Math.min(volume / 10000, 5); // Smaller volume boost

      return { market, score, hasMatch: true };
    });

    // Debug: Log category match stats
    const categoryMatchCount = scoredMarkets.filter((e) => {
      const mktCat = getMarketCategory(e.market);
      return queryCategory !== 'Other' && mktCat === queryCategory;
    }).length;
    console.log(
      `[Search] Markets with matching category (${queryCategory}): ${categoryMatchCount} out of ${markets.length}`
    );
    console.log(
      `[Search] Markets with hasMatch=true: ${
        scoredMarkets.filter((e) => e.hasMatch).length
      }`
    );
    console.log(
      `[Search] Markets with score>0: ${
        scoredMarkets.filter((e) => e.score > 0).length
      }`
    );

    // STRICT FILTERING: Only return markets that actually match
    const relevantMarkets = scoredMarkets
      .filter((entry) => entry.hasMatch && entry.score > 0)
      .sort((a, b) => {
        // Sort by score first, then by volume
        if (b.score !== a.score) return b.score - a.score;
        return parseVolume(b.market.volume) - parseVolume(a.market.volume);
      })
      .map((entry) => entry.market);

    console.log(
      `[Search] Found ${relevantMarkets.length} relevant markets out of ${markets.length} total`
    );
    if (relevantMarkets.length > 0) {
      console.log(
        `[Search] Top 3 results:`,
        relevantMarkets.slice(0, 3).map((m) => m.title)
      );
    } else {
      // Debug: Show why no results
      console.log(`[Search] No results found. Debug info:`);
      console.log(`  Query: "${q}"`);
      console.log(`  Query Category: "${queryCategory}"`);
      console.log(`  Total markets from searchMarkets: ${markets.length}`);
      if (markets.length > 0) {
        const sampleCategories = markets.slice(0, 5).map((m) => ({
          title: m.title.substring(0, 40),
          category: getMarketCategory(m),
        }));
        console.log(`  Sample market categories:`, sampleCategories);
      }
    }

    // Only return results if we have meaningful matches
    if (relevantMarkets.length === 0) {
      return NextResponse.json([]);
    }

    const mixed = mixPlatforms(relevantMarkets, 50);
    return NextResponse.json(mixed);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}
