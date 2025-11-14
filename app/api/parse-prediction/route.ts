import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedPrediction, MarketResult, SearchResults } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Mock data generator for demonstration
function generateMockMarkets(parsedPrediction: ParsedPrediction): MarketResult[] {
  const platforms = [
    { name: "Kalshi", baseOdds: 2.1 },
    { name: "Polymarket", baseOdds: 2.3 },
    { name: "Manifold Markets", baseOdds: 2.0 },
    { name: "PredictIt", baseOdds: 2.4 },
  ];

  return platforms.map((platform, index) => ({
    platform: platform.name,
    marketTitle: `${parsedPrediction.event} - ${parsedPrediction.outcome}`,
    outcome: parsedPrediction.outcome,
    odds: platform.baseOdds + (Math.random() * 0.4 - 0.2), // Add some variation
    price: 1 / (platform.baseOdds + (Math.random() * 0.4 - 0.2)),
    liquidity: Math.floor(Math.random() * 50000) + 10000,
    volume: Math.floor(Math.random() * 200000) + 50000,
    link: `https://${platform.name.toLowerCase().replace(/\s+/g, "")}.com/market/${index + 1}`,
  })).sort((a, b) => b.odds - a.odds); // Sort by best odds first
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Check if API key is set
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return mock parsed prediction if no API key
      const mockParsed: ParsedPrediction = {
        event: query.includes("Bitcoin") ? "Bitcoin price" : "Market event",
        outcome: query.includes("under") ? "Price goes under threshold" : "Predicted outcome",
        timeframe: query.includes("end of year") ? "End of year" : undefined,
        conditions: [],
      };
      const markets = generateMockMarkets(mockParsed);
      return NextResponse.json({
        query,
        parsedPrediction: mockParsed,
        markets,
      } as SearchResults);
    }

    // Use Claude to parse the prediction
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Parse the following prediction and extract structured information. Return ONLY valid JSON with this exact structure:
{
  "event": "the main event or topic being predicted",
  "outcome": "the specific outcome being predicted",
  "timeframe": "any time constraints mentioned (or null if none)",
  "conditions": ["any specific conditions mentioned"]
}

Prediction: "${query}"

Return only the JSON object, no other text.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse the JSON response
    let parsedPrediction: ParsedPrediction;
    try {
      // Extract JSON from the response (in case Claude adds markdown formatting)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedPrediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      // Fallback to mock data
      parsedPrediction = {
        event: query,
        outcome: "Predicted outcome",
        timeframe: undefined,
        conditions: [],
      };
    }

    // Generate mock market results
    const markets = generateMockMarkets(parsedPrediction);

    const results: SearchResults = {
      query,
      parsedPrediction,
      markets,
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error parsing prediction:", error);
    return NextResponse.json(
      { error: "Failed to parse prediction" },
      { status: 500 }
    );
  }
}

