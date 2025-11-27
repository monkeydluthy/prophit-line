export interface ParsedPrediction {
  event: string;
  outcome: string;
  timeframe?: string;
  conditions?: string[];
}

export interface MarketOutcome {
  name: string;
  percentage: number; // 0-100
  color?: string; // 'green' | 'red' | 'blue'
  price: number; // 0-1
}

export interface MarketResult {
  id: string; // Unique ID (or slug)
  platform: 'Polymarket' | 'Manifold' | 'Kalshi' | 'PredictIt';
  title: string;
  icon?: string;
  outcomes: MarketOutcome[];
  volume: number | string;
  liquidity?: number | string;
  date: string; // End date
  link: string;
  markets?: Array<{
    name: string;
    shortName?: string;
    yesPrice?: number;
    noPrice?: number;
    probability?: number;
    volume?: number | string;
    liquidity?: number | string;
    ticker?: string;
    icon?: string;
  }>;
}

export interface SearchResults {
  query: string;
  parsedPrediction: ParsedPrediction;
  markets: MarketResult[];
}
