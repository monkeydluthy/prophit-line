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
  };
  bestSell: {
    market: MarketResult;
    price: number;
    platform: string;
  };
  totalVolume: number;
  avgLiquidity: number;
  title: string; // Normalized title
}

/**
 * Calculate text similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Tokenize and check for common words
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  
  // If more than 50% of words match, consider it similar
  const wordSimilarity = (commonWords.length * 2) / (words1.length + words2.length);
  
  // Also check substring matching for key terms
  const keyTerms1 = words1.filter(w => w.length > 3);
  const keyTerms2 = words2.filter(w => w.length > 3);
  const matchingKeyTerms = keyTerms1.filter(t1 => 
    keyTerms2.some(t2 => t1.includes(t2) || t2.includes(t1))
  );
  const keyTermSimilarity = matchingKeyTerms.length / Math.max(keyTerms1.length, keyTerms2.length, 1);
  
  return Math.max(wordSimilarity, keyTermSimilarity * 0.8);
}

/**
 * Normalize market title for matching
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract key terms from title for matching
 */
function extractKeyTerms(title: string): string[] {
  const normalized = normalizeTitle(title);
  const words = normalized.split(/\s+/);
  
  // Filter out common stop words and short words
  const stopWords = new Set(['will', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from']);
  return words.filter(w => w.length > 3 && !stopWords.has(w));
}

/**
 * Check if two markets are equivalent (similar enough to be the same event)
 */
function areMarketsEquivalent(m1: MarketResult, m2: MarketResult): boolean {
  // Must be different platforms
  if (m1.platform === m2.platform) return false;
  
  // Check title similarity
  const titleSimilarity = calculateSimilarity(m1.title, m2.title);
  if (titleSimilarity < 0.4) return false; // Need at least 40% similarity
  
  // Check if they have similar outcomes
  if (m1.outcomes.length > 0 && m2.outcomes.length > 0) {
    const outcomes1 = m1.outcomes.map(o => o.name.toLowerCase());
    const outcomes2 = m2.outcomes.map(o => o.name.toLowerCase());
    
    // Check if they have binary outcomes (Yes/No)
    const m1IsBinary = outcomes1.some(o => o.includes('yes') || o.includes('no')) || 
                       outcomes1.length === 2;
    const m2IsBinary = outcomes2.some(o => o.includes('yes') || o.includes('no')) || 
                       outcomes2.length === 2;
    
    if (m1IsBinary && m2IsBinary) {
      // For binary markets, just check title similarity
      return titleSimilarity >= 0.4;
    }
    
    // For multi-outcome markets, check if outcomes overlap
    const commonOutcomes = outcomes1.filter(o => 
      outcomes2.some(o2 => calculateSimilarity(o, o2) > 0.6)
    );
    if (commonOutcomes.length === 0) return false;
  }
  
  return titleSimilarity >= 0.4;
}

/**
 * Get the best price for a "yes" outcome (probability)
 */
function getBestYesPrice(market: MarketResult): number | null {
  if (!market.outcomes || market.outcomes.length === 0) return null;
  
  // For binary markets, find the "yes" or first outcome
  const yesOutcome = market.outcomes.find(o => 
    o.name.toLowerCase().includes('yes') || 
    o.name.toLowerCase().includes('true') ||
    o.name.toLowerCase().includes('will')
  ) || market.outcomes[0];
  
  // Return as probability (0-1)
  return yesOutcome.percentage / 100;
}

/**
 * Calculate potential spread between two markets
 */
function calculateSpread(m1: MarketResult, m2: MarketResult): {
  spread: number;
  maxSpread: number;
  bestBuy: { market: MarketResult; price: number };
  bestSell: { market: MarketResult; price: number };
} | null {
  const price1 = getBestYesPrice(m1);
  const price2 = getBestYesPrice(m2);
  
  if (price1 === null || price2 === null) return null;
  
  // Find the best buy (lowest price) and best sell (highest price)
  let bestBuy, bestSell;
  if (price1 < price2) {
    bestBuy = { market: m1, price: price1 };
    bestSell = { market: m2, price: price2 };
  } else {
    bestBuy = { market: m2, price: price2 };
    bestSell = { market: m1, price: price1 };
  }
  
  const spread = bestSell.price - bestBuy.price;
  const maxSpread = spread / bestBuy.price; // Percentage spread
  
  return {
    spread: spread * 100, // Convert to percentage points
    maxSpread: maxSpread * 100, // Percentage
    bestBuy,
    bestSell,
  };
}


/**
 * Find arbitrage opportunities across all platforms
 */
export async function findArbitrageOpportunities(
  limit: number = 300
): Promise<ArbitrageOpportunity[]> {
  // Fetch markets from all platforms
  const allMarkets = await getFrontPageMarkets(limit);
  
  // Group markets by similarity
  const opportunities: ArbitrageOpportunity[] = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < allMarkets.length; i++) {
    if (processed.has(allMarkets[i].id)) continue;
    
    const market1 = allMarkets[i];
    const matchedMarkets: MarketResult[] = [market1];
    
    // Find all equivalent markets
    for (let j = i + 1; j < allMarkets.length; j++) {
      const market2 = allMarkets[j];
      
      if (processed.has(market2.id)) continue;
      if (areMarketsEquivalent(market1, market2)) {
        matchedMarkets.push(market2);
        processed.add(market2.id);
      }
    }
    
    // Only create opportunity if we have at least 2 markets from different platforms
    const uniquePlatforms = new Set(matchedMarkets.map(m => m.platform));
    if (matchedMarkets.length >= 2 && uniquePlatforms.size >= 2) {
      // Calculate spreads between all pairs
      let bestSpread = 0;
      let bestBuy: { market: MarketResult; price: number } | null = null;
      let bestSell: { market: MarketResult; price: number } | null = null;
      let maxSpread = 0;
      
      for (let a = 0; a < matchedMarkets.length; a++) {
        for (let b = a + 1; b < matchedMarkets.length; b++) {
          const spreadResult = calculateSpread(matchedMarkets[a], matchedMarkets[b]);
          if (spreadResult && spreadResult.maxSpread > maxSpread) {
            maxSpread = spreadResult.maxSpread;
            bestSpread = spreadResult.spread;
            bestBuy = spreadResult.bestBuy;
            bestSell = spreadResult.bestSell;
          }
        }
      }
      
      if (bestBuy && bestSell && maxSpread > 0.1) { // At least 0.1% spread (lowered threshold)
        const totalVolume = matchedMarkets.reduce((sum, m) => {
          const vol = typeof m.volume === 'string' || typeof m.volume === 'number' ? m.volume : '0';
          return sum + parseVolume(vol);
        }, 0);
        
        const avgLiquidity = matchedMarkets.reduce((sum, m) => {
          const liq = typeof m.liquidity === 'string' || typeof m.liquidity === 'number' ? m.liquidity : '0';
          const vol = typeof m.volume === 'string' || typeof m.volume === 'number' ? m.volume : '0';
          const liqValue = parseVolume(liq);
          return sum + (liqValue > 0 ? liqValue : parseVolume(vol) * 0.1); // Fallback to 10% of volume
        }, 0) / matchedMarkets.length;
        
        opportunities.push({
          id: `arb-${market1.id}-${Date.now()}`,
          markets: matchedMarkets,
          spread: bestSpread,
          maxSpread: maxSpread,
          bestBuy: {
            market: bestBuy.market,
            price: bestBuy.price,
            platform: bestBuy.market.platform,
          },
          bestSell: {
            market: bestSell.market,
            price: bestSell.price,
            platform: bestSell.market.platform,
          },
          totalVolume,
          avgLiquidity,
          title: normalizeTitle(market1.title),
        });
      }
      
      processed.add(market1.id);
    }
  }
  
  // Sort by spread (highest first)
  return opportunities.sort((a, b) => b.maxSpread - a.maxSpread);
}

