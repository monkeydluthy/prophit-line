export interface ParsedPrediction {
  event: string;
  outcome: string;
  timeframe?: string;
  conditions?: string[];
}

export interface MarketResult {
  platform: string;
  marketTitle: string;
  outcome: string;
  odds: number; // as decimal odds (e.g., 2.5 = 2.5x return)
  price: number; // as percentage (e.g., 0.4 = 40% probability)
  liquidity: number;
  volume: number;
  link: string;
}

export interface SearchResults {
  query: string;
  parsedPrediction: ParsedPrediction;
  markets: MarketResult[];
}

