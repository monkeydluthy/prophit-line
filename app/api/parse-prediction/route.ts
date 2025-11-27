import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedPrediction, MarketResult, SearchResults } from "@/types";
import { searchMarkets } from "@/app/services/marketService";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

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
      const fallbackParsed: ParsedPrediction = {
        event: query,
        outcome: query,
        timeframe: undefined,
        conditions: [],
      };

      const markets = await searchMarkets(fallbackParsed);

      return NextResponse.json({
        query,
        parsedPrediction: fallbackParsed,
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

    // Search for real markets
    const markets = await searchMarkets(parsedPrediction);

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

