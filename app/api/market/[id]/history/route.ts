import { NextRequest, NextResponse } from "next/server";
import { getMarketHistory } from "@/app/services/marketService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Parse timeframe from query params if needed? Default to 'ALL' or '7D'.
    // For now, we fetch standard history.
    const history = await getMarketHistory(id);
    
    if (!history) {
        return NextResponse.json([], { status: 200 }); // Return empty array instead of 404 for better UI handling
    }
    
    return NextResponse.json(history);
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}



