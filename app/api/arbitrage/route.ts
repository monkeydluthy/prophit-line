import { NextResponse } from 'next/server';
import { findArbitrageOpportunities } from '@/app/services/arbitrageService';
import { findArbitrageWithEmbeddings } from '@/app/services/embeddingArbitrageService';
import { getMatchrOpportunities, convertMatchrToOpportunity } from '@/app/services/matchrService';
import { findSportsArbitrage } from '@/app/services/sportsArbitrageService';

// Configure route for longer execution time
export const maxDuration = 26; // Maximum duration for serverless function (26s for Netlify Pro, 10s for free tier)
export const runtime = 'nodejs'; // Use Node.js runtime

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '200');
  const minSpread = parseFloat(searchParams.get('minSpread') || '0.01');
  const source = searchParams.get('source') || 'sports'; // 'sports', 'embeddings', 'structured', or 'matchr'
  
  try {
    let opportunities;
    
    if (source === 'sports') {
      // Use new sports arbitrage service (event-based, opposing outcomes)
      // Reduce limit for production to avoid timeouts (serverless functions have ~10-26s timeout)
      const sportsLimit = Math.min(Math.max(limit, 500), 1000); // Cap at 1000 to prevent timeouts
      console.log(`[API] Calling findSportsArbitrage with limit=${sportsLimit}, minSpread=${minSpread}`);
      opportunities = await findSportsArbitrage(sportsLimit, minSpread);
    } else if (source === 'matchr') {
      // Use Matchr's API directly
      try {
        const matchrData = await getMatchrOpportunities(
          limit,
          minSpread,
          5000, // min volume
          'spread'
        );
        
        opportunities = matchrData.data.matches
          .map(convertMatchrToOpportunity)
          .filter((opp): opp is NonNullable<typeof opp> => opp !== null);
      } catch (error) {
        console.error('Error fetching from Matchr API:', error);
        // Fallback to embeddings
        opportunities = await findArbitrageWithEmbeddings(limit);
      }
    } else if (source === 'embeddings') {
      // Use new OpenAI embeddings-based matching
      opportunities = await findArbitrageWithEmbeddings(limit);
    } else {
      // Use our structured matching system (legacy)
      opportunities = await findArbitrageOpportunities(limit);
    }
    
    // Debug: Log what we received from the service
    console.log(`\n🔍 API ROUTE DEBUG:`);
    console.log(`  Opportunities from service: ${opportunities.length}`);
    console.log(`  minSpread filter: ${minSpread}%`);

    if (opportunities.length > 0) {
      console.log(`  Sample opportunity:`);
      console.log(`    Title: ${opportunities[0].title}`);
      console.log(`    maxSpread: ${opportunities[0].maxSpread}%`);
      console.log(`    spread: ${opportunities[0].spread}%`);
      console.log(`    Buy: ${opportunities[0].bestBuy.platform} @ ${(opportunities[0].bestBuy.price * 100).toFixed(1)}%`);
      console.log(`    Sell: ${opportunities[0].bestSell.platform} @ ${(opportunities[0].bestSell.price * 100).toFixed(1)}%`);
      console.log(`    Confidence: ${opportunities[0].confidenceTier}`);
    }
    
    // Filter by minimum spread
    const filtered = opportunities.filter(opp => {
      const keep = opp.maxSpread >= minSpread;
      if (!keep && opportunities.length <= 10) {
        console.log(`  ✗ Rejected: "${opp.title}" (spread ${opp.maxSpread.toFixed(2)}% < ${minSpread}%)`);
      }
      return keep;
    });
    
    console.log(`  After filtering: ${filtered.length}`);
    console.log(`\n🔍 API: Returning ${filtered.length} opportunities to frontend\n`);
    
    return NextResponse.json({
      opportunities: filtered,
      count: filtered.length,
      source: source,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[API] Error fetching arbitrage opportunities:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[API] Error details:', {
      message: errorMessage,
      stack: errorStack,
      source,
      limit,
      minSpread,
    });
    
    // Return more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch arbitrage opportunities',
        errorType: error instanceof Error ? error.constructor.name : 'Error',
        errorMessage: errorMessage,
        source,
      },
      { status: 500 }
    );
  }
}




