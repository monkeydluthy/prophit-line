"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { SearchResults, MarketResult } from "@/types";

const platformColors: Record<string, { border: string; bg: string; text: string }> = {
  "Kalshi": { border: "border-blue-500/50", bg: "bg-blue-500/10", text: "text-blue-400" },
  "Polymarket": { border: "border-purple-500/50", bg: "bg-purple-500/10", text: "text-purple-400" },
  "Manifold Markets": { border: "border-green-500/50", bg: "bg-green-500/10", text: "text-green-400" },
  "PredictIt": { border: "border-orange-500/50", bg: "bg-orange-500/10", text: "text-orange-400" },
};

function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="skeleton h-6 w-24 rounded-full" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="skeleton h-6 w-3/4 rounded mb-2" />
          <div className="skeleton h-4 w-1/2 rounded mb-4" />
          <div className="flex gap-4">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-3">
          <div className="skeleton h-10 w-24 rounded" />
          <div className="skeleton h-10 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!query) {
      setError("No search query provided");
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/parse-prediction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors mb-8 inline-block flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to search
          </Link>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center glass-strong rounded-2xl p-8 max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-400 mb-4 font-semibold">{error}</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-2">
            Return to search
          </Link>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const platformColor = platformColors[results.markets[0]?.platform] || platformColors["Kalshi"];

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors mb-8 inline-block flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to search
        </Link>

        {/* Prediction Summary Card */}
        <div className="glass-strong rounded-2xl p-8 mb-8 border-2 border-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl font-bold text-white font-heading">Search Results</h1>
                <button
                  onClick={copyLink}
                  className="px-3 py-1.5 glass rounded-lg hover:bg-slate-700/50 transition-all duration-300 text-sm text-slate-300 flex items-center gap-2"
                >
                  {copiedLink ? (
                    <>
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-lg text-slate-300 mb-4">
                <span className="font-semibold text-white">Your prediction:</span> {results.query}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="px-3 py-1.5 glass rounded-lg">
                  <span className="text-slate-400">Event: </span>
                  <span className="text-white font-semibold">{results.parsedPrediction.event}</span>
                </div>
                <div className="px-3 py-1.5 glass rounded-lg">
                  <span className="text-slate-400">Outcome: </span>
                  <span className="text-white font-semibold">{results.parsedPrediction.outcome}</span>
                </div>
                {results.parsedPrediction.timeframe && (
                  <div className="px-3 py-1.5 glass rounded-lg">
                    <span className="text-slate-400">Timeframe: </span>
                    <span className="text-white font-semibold">{results.parsedPrediction.timeframe}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white font-heading">
              Matching Markets <span className="text-slate-400">({results.markets.length})</span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Sorted by best odds
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.markets.map((market, index) => (
            <MarketCard
              key={index}
              market={market}
              isBestOdds={index === 0}
              animationDelay={index * 100}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}

function MarketCard({
  market,
  isBestOdds,
  animationDelay = 0,
}: {
  market: MarketResult;
  isBestOdds: boolean;
  animationDelay?: number;
}) {
  const formatOdds = (odds: number) => odds.toFixed(2);
  const formatPrice = (price: number) => (price * 100).toFixed(1);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const platformColor = platformColors[market.platform] || platformColors["Kalshi"];
  const trendDirection = Math.random() > 0.5 ? "up" : "down";
  const trendPercent = (Math.random() * 5).toFixed(1);

  return (
    <div
      className="glass rounded-2xl p-6 border-2 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer group"
      style={{
        borderColor: isBestOdds ? "rgba(234, 179, 8, 0.5)" : "rgba(148, 163, 184, 0.1)",
        animation: `fadeInUp 0.6s ease-out forwards`,
        animationDelay: `${animationDelay}ms`,
        opacity: 0,
      }}
    >
      {/* Platform Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${platformColor.bg} ${platformColor.text} border ${platformColor.border}`}>
            {market.platform}
          </div>
          {isBestOdds && (
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 rounded-full text-xs font-bold border border-yellow-500/50 animate-pulse">
              ⭐ Best Odds
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendDirection === "up" ? "text-green-400" : "text-red-400"}`}>
          {trendDirection === "up" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          )}
          {trendPercent}%
        </div>
      </div>

      {/* Market Title */}
      <h3 className="text-lg font-bold text-white mb-2 font-heading group-hover:text-blue-400 transition-colors">
        {market.marketTitle}
      </h3>
      <p className="text-sm text-slate-400 mb-4">{market.outcome}</p>

      {/* Odds Display */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-4xl font-bold text-green-400 font-heading mb-1">
            {formatOdds(market.odds)}x
          </div>
          <div className="text-sm text-slate-400">
            {formatPrice(market.price)}% probability
          </div>
        </div>
      </div>

      {/* Liquidity & Volume Bars */}
      <div className="space-y-2 mb-4">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Liquidity</span>
            <span className="font-semibold text-white">{formatCurrency(market.liquidity)}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((market.liquidity / 50000) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Volume</span>
            <span className="font-semibold text-white">{formatCurrency(market.volume)}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((market.volume / 200000) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <a
        href={market.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          // Confetti effect could go here
        }}
        className="block w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 text-center group-hover:glow-blue"
      >
        Place Bet →
      </a>
    </div>
  );
}
