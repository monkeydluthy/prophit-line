'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SearchResults, MarketResult } from '@/types';

const platformColors: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  Kalshi: {
    border: 'border-green-500/50',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
  },
  Polymarket: {
    border: 'border-green-500/50',
    bg: 'bg-gradient-to-r from-green-500/10 to-red-500/10',
    text: 'text-green-400',
  },
  'Manifold Markets': {
    border: 'border-green-500/50',
    bg: 'bg-gradient-to-r from-green-500/10 via-green-400/10 to-red-500/10',
    text: 'text-green-400',
  },
  PredictIt: {
    border: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
  },
};

function SkeletonCard() {
  return (
    <div
      className="w-full bg-slate-800/60 border border-slate-600/50 rounded-2xl"
      style={{ padding: '48px' }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: '32px' }}
      >
        <div className="skeleton h-7 w-24 rounded-lg" />
        <div className="skeleton h-6 w-20 rounded-lg" />
      </div>
      <div className="skeleton h-6 w-full rounded mb-2" />
      <div
        className="skeleton h-6 w-3/4 rounded"
        style={{ marginBottom: '36px' }}
      />
      <div
        className="skeleton h-32 w-full rounded-xl"
        style={{ marginBottom: '36px' }}
      />
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: '36px' }}
      >
        <div className="skeleton h-12 w-24 rounded" />
        <div className="skeleton h-12 w-24 rounded" />
      </div>
      <div className="skeleton h-14 w-full rounded-xl" />
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newQuery, setNewQuery] = useState('');

  useEffect(() => {
    if (!query) {
      setError('No search query provided');
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/parse-prediction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
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

  const handleNewSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;
    router.push(`/results?q=${encodeURIComponent(newQuery)}`);
    setNewQuery('');
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center"
        style={{ paddingTop: '120px', paddingBottom: '120px' }}
      >
        <div
          className="w-full text-center px-6"
          style={{ marginBottom: '70px' }}
        >
          <div
            className="skeleton h-12 w-96 rounded mx-auto"
            style={{ marginBottom: '30px' }}
          />
          <div className="skeleton h-4 w-64 rounded mx-auto" />
        </div>
        <div
          className="w-full flex justify-center px-6"
          style={{ marginBottom: '90px' }}
        >
          <div className="skeleton h-16 w-full max-w-2xl rounded-2xl" />
        </div>
        <div className="w-full max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-red-400 mb-4 font-semibold">{error}</p>
          <Link
            href="/"
            className="text-green-400 hover:text-red-400 transition-colors inline-flex items-center gap-2"
          >
            Return to search
          </Link>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ paddingTop: '120px', paddingBottom: '120px' }}
    >
      {/* Prediction Summary */}
      <div className="w-full text-center px-6" style={{ marginBottom: '70px' }}>
        <h1
          className="text-5xl font-bold text-white font-heading"
          style={{ marginBottom: '30px' }}
        >
          {results.query}
        </h1>
        <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
          <span>
            Found {results.markets.length}{' '}
            {results.markets.length === 1 ? 'market' : 'markets'}
          </span>
          <span>•</span>
          <span>Sorted by best odds</span>
          <span>•</span>
          <button
            onClick={copyLink}
            className="text-slate-400 hover:text-green-400 transition-colors inline-flex items-center gap-1"
          >
            {copiedLink ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Bar - Centered */}
      <div
        className="w-full flex justify-center px-6"
        style={{ marginBottom: '90px' }}
      >
        <form onSubmit={handleNewSearch} className="w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder="Search for another prediction..."
              className="w-full h-16 px-6 pr-36 text-base bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-400 placeholder:text-center focus:border-green-500/50 focus:bg-slate-800/60 focus:outline-none transition-all duration-300"
            />
            <button
              type="submit"
              disabled={!newQuery.trim()}
              className="absolute right-2 top-2 h-12 px-8 bg-linear-to-r from-green-500 to-red-500 hover:from-green-600 hover:to-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results Grid */}
      <div className="w-full max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {results.markets.map((market, index) => (
            <MarketCard
              key={index}
              market={market}
              isBestOdds={index === 0}
              animationDelay={index * 50}
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
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 mx-auto mb-4"></div>
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
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const platformColor =
    platformColors[market.platform] || platformColors['Kalshi'];

  return (
    <div
      className="w-full bg-slate-800/60 border border-slate-600/50 rounded-2xl hover:bg-slate-700/70 hover:border-slate-500/60 hover:shadow-xl hover:shadow-slate-900/50 transition-all duration-300"
      style={{
        animation: `fadeInUp 0.6s ease-out forwards`,
        animationDelay: `${animationDelay}ms`,
        opacity: 0,
        padding: '48px',
      }}
    >
      {/* Platform and Badge */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: '32px' }}
      >
        <span
          className={`px-4 py-2 rounded-lg text-xs font-semibold ${platformColor.bg} ${platformColor.text} border ${platformColor.border}`}
        >
          {market.platform}
        </span>
        {isBestOdds && (
          <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-semibold border border-green-500/30">
            ⭐ Best Odds
          </span>
        )}
      </div>

      {/* Market Title */}
      <h3
        className="text-xl font-semibold text-white leading-relaxed min-h-[56px]"
        style={{ marginBottom: '36px' }}
      >
        {market.marketTitle}
      </h3>

      {/* Main Odds - Centered and Prominent */}
      <div
        className="text-center bg-slate-900/50 rounded-xl border border-slate-600/40"
        style={{ marginBottom: '36px', padding: '28px 24px' }}
      >
        <div className="text-5xl font-bold text-green-400 font-heading mb-2">
          {formatOdds(market.odds)}x
        </div>
        <div className="text-sm text-slate-400">
          {formatPrice(market.price)}% probability
        </div>
      </div>

      {/* Stats - Clean Row */}
      <div
        className="flex items-center justify-between text-sm"
        style={{ marginBottom: '36px' }}
      >
        <div>
          <div className="text-slate-500 text-xs mb-2">Liquidity</div>
          <div className="text-white font-semibold">
            {formatCurrency(market.liquidity)}
          </div>
        </div>
        <div className="h-8 w-px bg-slate-700/50"></div>
        <div>
          <div className="text-slate-500 text-xs mb-2">Volume</div>
          <div className="text-white font-semibold">
            {formatCurrency(market.volume)}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <a
        href={market.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-linear-to-r from-green-500 to-red-500 hover:from-green-600 hover:to-red-600 text-white font-semibold rounded-xl transition-all duration-300 text-center text-base"
        style={{ padding: '18px 24px' }}
      >
        Place Bet →
      </a>
    </div>
  );
}
