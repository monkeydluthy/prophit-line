import { NextResponse } from 'next/server';
import { findArbitrageOpportunities } from '@/app/services/arbitrageService';
import { findArbitrageWithEmbeddings } from '@/app/services/embeddingArbitrageService';
import { getMatchrOpportunities, convertMatchrToOpportunity } from '@/app/services/matchrService';
import { findSportsArbitrage } from '@/app/services/sportsArbitrageService';

// Configure route for longer execution time
// Note: On Netlify with Next.js, this may be handled differently
// If this doesn't work, we may need to use background functions or increase Netlify plan limits
export const maxDuration = 120; // Request 2 minutes (120 seconds) - may need Netlify Enterprise for this
export const runtime = 'nodejs'; // Use Node.js runtime

// Catch unhandled promise rejections to prevent crashes
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[API] Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '200');
  const minSpread = parseFloat(searchParams.get('minSpread') || '0.01');
  const source = searchParams.get('source') || 'sports'; // 'sports', 'embeddings', 'structured', or 'matchr'
  
  try {
    console.log(`[API] ===== STARTING ARBITRAGE REQUEST =====`);
    console.log(`[API] source=${source}, limit=${limit}, minSpread=${minSpread}`);
    console.log(`[API] Request URL: ${request.url}`);
    
    let opportunities;
    
    if (source === 'sports') {
      // Use new sports arbitrage service (event-based, opposing outcomes)
      // For sports arbitrage, use a higher limit to find more matches
      const sportsLimit = Math.max(limit, 2000);
      console.log(`[API] ===== CALLING findSportsArbitrage =====`);
      console.log(`[API] limit=${sportsLimit}, minSpread=${minSpread}`);
      
      try {
        const sportsStartTime = Date.now();
        opportunities = await findSportsArbitrage(sportsLimit, minSpread);
        const sportsDuration = ((Date.now() - sportsStartTime) / 1000).toFixed(2);
        
        // Ensure opportunities is always an array
        if (!Array.isArray(opportunities)) {
          console.error('[API] ERROR: findSportsArbitrage returned non-array:', typeof opportunities, opportunities);
          opportunities = [];
        }
        
        console.log(`[API] ===== findSportsArbitrage COMPLETED =====`);
        console.log(`[API] Duration: ${sportsDuration}s, Opportunities: ${opportunities.length}`);
      } catch (sportsError) {
        console.error('[API] ===== ERROR in findSportsArbitrage =====');
        console.error('[API] Error type:', sportsError instanceof Error ? sportsError.constructor.name : typeof sportsError);
        console.error('[API] Error message:', sportsError instanceof Error ? sportsError.message : String(sportsError));
        console.error('[API] Error stack:', sportsError instanceof Error ? sportsError.stack : 'No stack');
        // Return empty array instead of crashing
        opportunities = [];
        throw sportsError; // Re-throw to be caught by outer catch
      }
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
    
    // Ensure opportunities is always an array
    if (!Array.isArray(opportunities)) {
      console.error('[API] Opportunities is not an array:', typeof opportunities, opportunities);
      opportunities = [];
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
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🔍 API: Preparing response (total time: ${totalTime}s)\n`);
    
    // Ensure we always return a valid JSON response
    const response = {
      opportunities: Array.isArray(filtered) ? filtered : [],
      count: Array.isArray(filtered) ? filtered.length : 0,
      source: source,
      timestamp: Date.now(),
      executionTime: totalTime,
    };
    
    // Check response size before serialization
    const responseString = JSON.stringify(response);
    const responseSize = responseString.length;
    console.log(`[API] Response size: ${responseSize} bytes (${(responseSize / 1024).toFixed(2)} KB)`);
    
    // Netlify has a 6MB response limit, warn if approaching
    if (responseSize > 5 * 1024 * 1024) {
      console.warn(`[API] WARNING: Response size (${(responseSize / 1024 / 1024).toFixed(2)} MB) approaching Netlify's 6MB limit`);
    }
    
    console.log(`[API] ===== SENDING RESPONSE =====`);
    const jsonResponse = NextResponse.json(response);
    console.log(`[API] Response created successfully`);
    
    return jsonResponse;
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
    
    // Always return a valid JSON response, even on error
    try {
      return NextResponse.json(
        { 
          error: 'Failed to fetch arbitrage opportunities',
          errorType: error instanceof Error ? error.constructor.name : 'Error',
          errorMessage: errorMessage,
          source,
          opportunities: [], // Always include opportunities array
          count: 0,
        },
        { status: 500 }
      );
    } catch (jsonError) {
      // If even JSON serialization fails, return minimal response
      console.error('[API] Failed to serialize error response:', jsonError);
      return new NextResponse(
        JSON.stringify({ 
          error: 'An unknown error has occurred',
          opportunities: [],
          count: 0,
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}




