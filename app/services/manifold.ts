import { MarketResult } from "@/types";

export async function searchManifoldMarkets(query: string): Promise<MarketResult[]> {
  try {
    // Manifold Markets Public API
    // https://docs.manifold.markets/api#get-v0search-markets
    const response = await fetch(
      `https://api.manifold.markets/v0/search-markets?term=${encodeURIComponent(query)}&limit=5`
    );
    
    if (!response.ok) {
        console.error("Manifold API error:", response.statusText);
        return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];

    return data.map((market: any) => ({
      platform: "Manifold",
      marketTitle: market.question,
      outcome: "Yes", // Simplified for now
      odds: market.probability ? (1 / market.probability) : 2.0,
      price: market.probability || 0.5,
      liquidity: market.liquidity || 0,
      volume: market.volume || 0,
      link: market.url,
    }));
  } catch (error) {
    console.error("Manifold search error:", error);
    return [];
  }
}

