import { NextResponse } from 'next/server';
import { findArbitrageOpportunities } from '@/app/services/arbitrageService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const minSpread = parseFloat(searchParams.get('minSpread') || '0.5');
    
    const opportunities = await findArbitrageOpportunities(limit);
    
    // Filter by minimum spread
    const filtered = opportunities.filter(opp => opp.maxSpread >= minSpread);
    
    return NextResponse.json({
      opportunities: filtered,
      count: filtered.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching arbitrage opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch arbitrage opportunities' },
      { status: 500 }
    );
  }
}

