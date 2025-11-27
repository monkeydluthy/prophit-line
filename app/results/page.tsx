'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { SearchResults } from '@/types';
import MarketCard from '../components/MarketCard';

function SkeletonCard() {
  return (
    <div
      className="w-full border rounded-xl"
      style={{
        padding: '24px',
        backgroundColor: '#1a1a1a',
        borderColor: '#2a2a2a',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-6 w-20 rounded-md" />
        <div className="skeleton h-6 w-16 rounded-md" />
      </div>
      <div className="skeleton h-5 w-full rounded mb-2" />
      <div className="skeleton h-5 w-3/4 rounded mb-4" />
      <div className="space-y-3 mb-4">
        <div className="skeleton h-8 w-full rounded" />
        <div className="skeleton h-8 w-full rounded" />
      </div>
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: '#2a2a2a' }}
      >
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton h-4 w-16 rounded" />
      </div>
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div className="w-full max-w-[1600px] mx-auto px-12">
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

  const hasMarkets = results.markets && results.markets.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        paddingTop: '140px',
        paddingBottom: '120px',
        backgroundColor: '#0a0a0a',
      }}
    >
      <div
        className="w-full max-w-[1600px] mx-auto mb-10"
        style={{ paddingLeft: '5%', paddingRight: '5%' }}
      >
        <div className="text-left">
          <p className="text-slate-400 text-sm uppercase tracking-[0.4em] mb-2">
            Search
          </p>
          <h1 className="text-white text-3xl font-bold mb-2">
            Results for &quot;{results.query}&quot;
          </h1>
          <p className="text-slate-500 text-sm">
            {results.markets.length} markets found • Sorted by best return
          </p>
        </div>
      </div>

      {/* Results Grid */}
      <div
        className="w-full max-w-[1600px] mx-auto"
        style={{ paddingLeft: '5%', paddingRight: '5%' }}
      >
        {hasMarkets ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.markets.map((market, index) => (
              <MarketCard key={market.id} market={market} index={index} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-4 border border-dashed border-[#1f1f1f] rounded-2xl">
            <p className="text-white text-xl font-semibold">
              No active markets match “{results.query}”
            </p>
            <p className="text-slate-400 text-sm max-w-lg">
              Try searching for another topic or broaden your terms—we scan
              Polymarket, Kalshi, Manifold, and PredictIt for you.
            </p>
            <Link
              href="/"
              className="text-green-400 hover:text-red-400 transition-colors text-sm font-semibold"
            >
              Back to Trending
            </Link>
          </div>
        )}
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

// MarketCard component is reused from the homepage via components/MarketCard.tsx
