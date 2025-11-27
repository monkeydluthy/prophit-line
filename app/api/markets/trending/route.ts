import { NextRequest, NextResponse } from 'next/server';
import { getFrontPageMarkets } from '@/app/services/marketService';
import { MarketResult } from '@/types';

const PLATFORM_PRIORITY = ['Polymarket', 'Kalshi', 'PredictIt', 'Manifold'];

function interleaveTopPlatforms(
  markets: MarketResult[],
  rounds: number = 8
): MarketResult[] {
  const buckets = new Map<string, MarketResult[]>();

  markets.forEach((market) => {
    if (!buckets.has(market.platform)) {
      buckets.set(market.platform, []);
    }
    buckets.get(market.platform)!.push(market);
  });

  const selected: MarketResult[] = [];

  for (let round = 0; round < rounds; round++) {
    for (const platform of PLATFORM_PRIORITY) {
      const bucket = buckets.get(platform);
      if (bucket && bucket.length > round) {
        selected.push(bucket[round]);
      }
    }
  }

  const selectedIds = new Set(selected.map((m) => m.id));
  const remaining = markets.filter((m) => !selectedIds.has(m.id));

  return [...selected, ...remaining];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const perPlatform = Number(searchParams.get('perPlatform') || '150');

    const merged = await getFrontPageMarkets(
      Number.isFinite(perPlatform) && perPlatform > 0 ? perPlatform : 150
    );
    const balanced = interleaveTopPlatforms(merged);

    return NextResponse.json(balanced);
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending markets' },
      { status: 500 }
    );
  }
}
