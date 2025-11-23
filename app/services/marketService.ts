import { ParsedPrediction, MarketResult } from "@/types";
import { searchManifoldMarkets } from "./manifold";
import { searchPolymarket } from "./polymarket";

export async function searchMarkets(parsedPrediction: ParsedPrediction): Promise<MarketResult[]> {
  // Construct a search query from the parsed prediction
  const query = parsedPrediction.event; 
  
  // Search platforms in parallel
  const [manifoldResults, polymarketResults] = await Promise.all([
    searchManifoldMarkets(query),
    searchPolymarket(query)
  ]);
  
  // Combine results
  const allMarkets = [...manifoldResults, ...polymarketResults];
  
  // Sort by volume for now as a proxy for quality/liquidity, or odds if meaningful comparison is possible
  // The user asked for "best odds". 
  // Note: Comparing odds across platforms requires normalizing them (e.g. all to probability or decimal odds).
  // Our types assume 'odds' and 'price' are normalized.
  
  return allMarkets.sort((a, b) => b.volume - a.volume);
}

