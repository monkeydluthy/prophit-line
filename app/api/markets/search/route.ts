import { NextRequest, NextResponse } from 'next/server';
import { searchMarkets } from '@/app/services/marketService';
import { ParsedPrediction, MarketResult } from '@/types';

const PLATFORM_ORDER: Array<MarketResult['platform']> = [
  'Polymarket',
  'Kalshi',
  'PredictIt',
  'Manifold',
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

    const markets = await searchMarkets(parsed);
    const lowerQ = q.toLowerCase();
    const filtered = markets.filter((market) => {
      const matchesTitle = market.title.toLowerCase().includes(lowerQ);
      const matchesPlatform = market.platform.toLowerCase().includes(lowerQ);
      const matchesOutcome = market.outcomes?.some((o) =>
        o.name.toLowerCase().includes(lowerQ)
      );
      return matchesTitle || matchesPlatform || matchesOutcome;
    });

    const source = filtered.length > 0 ? filtered : markets;
    const mixed = mixPlatforms(source, 12);
    return NextResponse.json(mixed);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}

