import { NextRequest, NextResponse } from "next/server";
import { getMarketHistory, getMarketHistoryMultiOutcome } from "@/app/services/marketService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Try to get multi-outcome history first
    const multiOutcomeHistory = await getMarketHistoryMultiOutcome(id);
    
    if (multiOutcomeHistory && multiOutcomeHistory.outcomes && multiOutcomeHistory.outcomes.length > 0) {
      // Return multi-outcome format
      return NextResponse.json(multiOutcomeHistory);
    }
    
    // Fallback to single-outcome history for backward compatibility
    const history = await getMarketHistory(id);
    
    if (!history || history.length === 0) {
        return NextResponse.json({ outcomes: [] }, { status: 200 });
    }
    
    // Convert single-outcome format to multi-outcome format
    return NextResponse.json({
      outcomes: [{
        index: 0,
        name: 'Primary',
        data: history,
      }],
    });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ error: "Failed to fetch history", outcomes: [] }, { status: 500 });
  }
}



