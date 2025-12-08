import { NextRequest, NextResponse } from 'next/server';
import { getFrontPageMarkets } from '@/app/services/marketService';
import { MarketResult } from '@/types';

const PLATFORM_PRIORITY = ['Polymarket', 'Kalshi', 'PredictIt'];

function interleaveTopPlatforms(
  markets: MarketResult[],
  rounds: number = 50
): MarketResult[] {
  const buckets = new Map<string, MarketResult[]>();

  markets.forEach((market) => {
    if (!buckets.has(market.platform)) {
      buckets.set(market.platform, []);
    }
    buckets.get(market.platform)!.push(market);
  });

  // Calculate how many markets we want to interleave (aim for most of the list)
  const maxMarkets = Math.max(...Array.from(buckets.values()).map(b => b.length));
  const interleaveRounds = Math.min(rounds, Math.ceil(maxMarkets / PLATFORM_PRIORITY.length));

  const selected: MarketResult[] = [];
  const selectedIds = new Set<string>();

  // Interleave markets round-robin style
  for (let round = 0; round < interleaveRounds; round++) {
    for (const platform of PLATFORM_PRIORITY) {
      const bucket = buckets.get(platform);
      if (bucket && bucket.length > round) {
        const market = bucket[round];
        if (!selectedIds.has(market.id)) {
          selected.push(market);
          selectedIds.add(market.id);
        }
      }
    }
  }

  // Add any remaining markets that weren't interleaved, but still try to mix them
  const remaining = markets.filter((m) => !selectedIds.has(m.id));
  
  // For remaining markets, interleave them too instead of just appending
  const remainingBuckets = new Map<string, MarketResult[]>();
  remaining.forEach((market) => {
    if (!remainingBuckets.has(market.platform)) {
      remainingBuckets.set(market.platform, []);
    }
    remainingBuckets.get(market.platform)!.push(market);
  });

  const remainingInterleaved: MarketResult[] = [];
  const maxRemaining = Math.max(...Array.from(remainingBuckets.values()).map(b => b.length), 0);
  
  for (let round = 0; round < maxRemaining; round++) {
    for (const platform of PLATFORM_PRIORITY) {
      const bucket = remainingBuckets.get(platform);
      if (bucket && bucket.length > round) {
        remainingInterleaved.push(bucket[round]);
      }
    }
  }

  return [...selected, ...remainingInterleaved];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const perPlatform = Number(searchParams.get('perPlatform') || '150');

    // getFrontPageMarkets already interleaves markets by platform
    const markets = await getFrontPageMarkets(
      Number.isFinite(perPlatform) && perPlatform > 0 ? perPlatform : 150
    );

    return NextResponse.json(markets);
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending markets' },
      { status: 500 }
    );
  }
}
