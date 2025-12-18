/**
 * Sports Arbitrage Service
 * 
 * Finds arbitrage opportunities in sports markets by matching events
 * across platforms and identifying opposing outcomes.
 */

import { MarketResult } from '@/types';
import { getFrontPageMarkets, parseVolume } from './marketService';
import { extractTeams, extractDate, isSameEvent, areOpposingOutcomes, extractTeamFromOutcome } from './eventExtraction';
import { ArbitrageOpportunity } from './arbitrageService';
import { searchPolymarket, getPolymarketEvent } from './polymarket';

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
  minSpread: number = 0.5 // Minimum spread % to consider (used as minimum ROI threshold)
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
  // Fetch markets for this sport from both platforms
  const arbitrageLimit = Math.max(limit, 1000);
  const allMarkets = await getFrontPageMarkets(arbitrageLimit);
  
  // Filter to this sport only from both platforms
  const sportMarkets = allMarkets.filter((market) => {
    // Must be from Kalshi or Polymarket
    if (market.platform !== 'Kalshi' && market.platform !== 'Polymarket') {
      return false;
    }
    
    // Extract teams
    const teams = extractTeams(market.title);
    if (teams.length !== 2) return false;
    
    // Determine sport context
    const marketLink = (market.link || '').toLowerCase();
    const title = (market.title || '').toLowerCase();
    const eventTicker = (market.id || '').replace(/^kalshi:/i, '').toUpperCase();
    
    let marketSport = '';
    
    // Sport detection logic (same as before)
    if (sport === 'nfl') {
      if (/\b(nfl|football)\b/i.test(title) && !/\b(college|ncaa|cfb)\b/i.test(title) || 
          /KXMVENFLSINGLEGAME|KXMVENFLGAME/i.test(eventTicker) || 
          /\/sports\/nfl\//i.test(marketLink) ||
          /\/event\/nfl-/i.test(marketLink)) {
        marketSport = 'nfl';
      }
    } else if (sport === 'nba') {
      if (/\b(nba|basketball)\b/i.test(title) && !/\b(college|ncaa)\b/i.test(title) || 
          /KXMVENBASINGLEGAME|KXMVENBAGAME/i.test(eventTicker) || 
          /\/sports\/nba\//i.test(marketLink) ||
          /\/event\/nba-/i.test(marketLink)) {
        marketSport = 'nba';
      }
    } else if (sport === 'nhl') {
      if (/\b(nhl|hockey)\b/i.test(title) || 
          /KXMVENHL|KXMVENHLGAME/i.test(eventTicker) || 
          /\/sports\/nhl\//i.test(marketLink) ||
          /\/event\/nhl-/i.test(marketLink)) {
        marketSport = 'nhl';
      }
    } else if (sport === 'cfb') {
      if (/\/sports\/cfb\//i.test(marketLink) || 
          /\/event\/cfb-/i.test(marketLink) ||
          /\b(cfb|college football)\b/i.test(title)) {
        marketSport = 'cfb';
      }
    } else if (sport === 'cbb') {
      if (/\/sports\/cbb\//i.test(marketLink) || 
          /\/event\/cbb-/i.test(marketLink) ||
          /\/event\/cwbb-/i.test(marketLink) ||
          /\b(cbb|college basketball)\b/i.test(title) || 
          /\(w\)/i.test(title)) {
        marketSport = 'cbb';
      }
    }
    
    // Only include if it matches this sport
    return marketSport === sport;
  });
  
  console.log(`[SportsArb] ${sport.toUpperCase()}: Found ${sportMarkets.length} markets (${sportMarkets.filter(m => m.platform === 'Kalshi').length} Kalshi, ${sportMarkets.filter(m => m.platform === 'Polymarket').length} Polymarket)`);
  
  if (sportMarkets.length === 0) {
    return [];
  }
  
  // Assign sport context to all markets (they're already filtered, but assign for consistency)
  for (const market of sportMarkets) {
    (market as any).sportContext = sport;
  }
  
  // Group markets by event signature (within this sport only)
  const eventGroups = new Map<string, MarketResult[]>();
  
  for (const market of sportMarkets) {
    // Extract teams
    let teams = extractTeams(market.title);
    
    // Refine teams based on sport context if needed
    if (sport === 'nba' && teams.includes('vikings')) {
      teams = teams.map(t => t === 'vikings' ? 'timberwolves' : t);
    } else if (sport === 'nhl' && teams.includes('vikings')) {
      teams = teams.map(t => t === 'vikings' ? 'wild' : t);
    }
    
    // Extract date
    const date = extractDate(market.link || '') || 
                 extractDate(market.id) || 
                 extractDate(market.title) ||
                 extractDate(market.date || '');
    
    if (teams.length !== 2) continue;
    
    // Create signature
    const sortedTeams = teams.sort();
    const signature = date 
      ? `${sortedTeams[0]}-${sortedTeams[1]}-${date}`
      : `${sortedTeams[0]}-${sortedTeams[1]}`;
    
    if (!eventGroups.has(signature)) {
      eventGroups.set(signature, []);
    }
    eventGroups.get(signature)!.push(market);
  }
  
  console.log(`[SportsArb] ${sport.toUpperCase()}: Found ${eventGroups.size} unique events`);
  
  // Now find arbitrage opportunities within this sport
  const opportunities: ArbitrageOpportunity[] = [];
  
  for (const [signature, eventMarkets] of eventGroups.entries()) {
    const kalshiMarkets = eventMarkets.filter(m => m.platform === 'Kalshi');
    const polymarketMarkets = eventMarkets.filter(m => m.platform === 'Polymarket');
    
    // Need both platforms
    if (kalshiMarkets.length === 0 || polymarketMarkets.length === 0) {
      continue;
    }
    
    // Filter to team win markets only (exclude player props, totals, etc.)
    const isTeamWinMarket = (market: MarketResult): boolean => {
      const title = (market.title || '').toLowerCase();
      const outcomes = market.outcomes || [];
      
      // Exclude markets with prop keywords
      const propKeywords = ['player', 'yards', 'touchdowns', 'points', 'rebounds', 'assists', 'goals', 'saves', 'over', 'under', 'spread'];
      if (propKeywords.some(keyword => title.includes(keyword))) {
        return false;
      }
      
      // Exclude outcomes with numbers (e.g., "80+", "Over 45.5")
      if (outcomes.some(o => /\d/.test(o.name))) {
        return false;
      }
      
      // Allow "Yes"/"No" outcomes for binary team win markets
      // Allow team name outcomes
      return true;
    };
    
    const kalshiTeamWinMarkets = kalshiMarkets.filter(isTeamWinMarket);
    const polyTeamWinMarkets = polymarketMarkets.filter(isTeamWinMarket);
    
    if (kalshiTeamWinMarkets.length === 0 || polyTeamWinMarkets.length === 0) {
      continue;
    }
    
    // Try to find opposing outcomes
    for (const kalshiMarket of kalshiTeamWinMarkets) {
      for (const polyMarket of polyTeamWinMarkets) {
        // Find opposing outcomes
        for (const kOutcome of kalshiMarket.outcomes || []) {
          for (const pOutcome of polyMarket.outcomes || []) {
            // Check if outcomes are opposing
            const kTeam = extractTeamFromOutcome(kOutcome.name, kalshiMarket.title);
            const pTeam = extractTeamFromOutcome(pOutcome.name, polyMarket.title);
            
            // Must be different teams
            if (kTeam === pTeam || !kTeam || !pTeam) {
              continue;
            }
            
            // Check if teams match the event signature
            const sigTeams = signature.split('-').slice(0, 2);
            if (!sigTeams.includes(kTeam) || !sigTeams.includes(pTeam)) {
              continue;
            }
            
            // Calculate arbitrage
            const price1 = kOutcome.price;
            const price2 = pOutcome.price;
            const investment = 1000; // Default investment
            
            const calc = calculateArbitrage(price1, price2, investment, KALSHI_FEE, POLYMARKET_FEE);
            
            // Filter by minimum ROI
            if (calc.isValid && calc.roi >= minSpread) {
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
            }
          }
        }
      }
    }
  }
  
  return opportunities;
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
