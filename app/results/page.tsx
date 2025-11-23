'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SearchResults, MarketResult } from '@/types';

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
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        paddingTop: '100px',
        paddingBottom: '120px',
        backgroundColor: '#0a0a0a',
      }}
    >
      {/* Search Bar - Centered */}
      <div
        className="w-full flex flex-col items-center px-6 border-b border-[#1f1f1f] bg-[#0a0a0a] sticky top-[80px] z-30 pt-12 pb-12"
        style={{ marginBottom: '60px' }}
      >
        <h1 className="text-3xl font-bold text-white mb-6 font-heading text-center">
          Results for &quot;{results.query}&quot;
        </h1>

        <form
          onSubmit={handleNewSearch}
          className="w-full max-w-3xl relative z-20"
        >
          <div className="relative group">
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-green-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder="Search for another prediction..."
              className="w-full pl-14 pr-32 py-4 bg-[#111] border border-[#222] rounded-xl text-white text-base placeholder:text-slate-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 focus:outline-none transition-all shadow-xl shadow-black/50"
            />
            <button
              type="submit"
              disabled={!newQuery.trim()}
              className="absolute right-2 top-2 bottom-2 px-5 bg-[#222] hover:bg-white hover:text-black text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex items-center gap-6 mt-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {results.markets.length} Markets Found
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Sorted by Best Return
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="w-full max-w-[1600px] mx-auto px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
  const router = useRouter();
  const formatPrice = (price: number) => (price * 100).toFixed(1);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const yesPercentage = formatPrice(market.price);
  const noPercentage = (100 - parseFloat(yesPercentage)).toFixed(1);

  const icon =
    market.marketTitle.toLowerCase().includes('bitcoin') ||
    market.marketTitle.toLowerCase().includes('btc')
      ? '₿'
      : market.marketTitle.toLowerCase().includes('president') ||
        market.marketTitle.toLowerCase().includes('election')
      ? '🇺🇸'
      : market.marketTitle.toLowerCase().includes('fed') ||
        market.marketTitle.toLowerCase().includes('rate')
      ? '🏦'
      : market.marketTitle.toLowerCase().includes('movie')
      ? '🎬'
      : '📈';

  return (
    <div
      className="bg-[#131313] border border-[#222] rounded-xl p-8 hover:border-[#333] transition-all cursor-pointer group flex flex-col h-full relative shadow-sm min-h-[440px]"
      style={{
        animation: `fadeInUp 0.6s ease-out forwards`,
        animationDelay: `${animationDelay}ms`,
        opacity: 0,
      }}
      onClick={() =>
        router.push(`/market/${encodeURIComponent(market.marketTitle)}`)
      }
    >
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        {/* Icon Box */}
        <div className="w-16 h-16 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-5xl shrink-0 shadow-sm group-hover:border-[#333] transition-colors">
          {icon}
        </div>

        {/* Title & Platform */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-1.5 mb-3">
            <div
              className="flex items-center gap-1.5 rounded bg-[#1d283a] border border-blue-900/30"
              style={{ padding: '6px 12px' }}
            >
              <div className="w-3.5 h-3.5 bg-blue-500 rounded-[2px] flex items-center justify-center shadow-[0_0_6px_rgba(59,130,246,0.5)]">
                <svg
                  viewBox="0 0 24 24"
                  className="w-2.5 h-2.5 text-white transform rotate-45"
                  fill="currentColor"
                >
                  <path d="M12 2L2 12l10 10 10-10L12 2z" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-blue-400 tracking-wide uppercase">
                {market.platform}
              </span>
            </div>
            {isBestOdds && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wide">
                Best Odds
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-[19px] leading-snug line-clamp-2 group-hover:text-slate-200 transition-colors tracking-tight min-h-[56px]">
            {market.marketTitle}
          </h3>
        </div>
      </div>

      {/* Outcomes List */}
      <div className="space-y-6 mb-8 grow">
        {/* Yes Outcome */}
        <div className="bg-[#18181b] rounded-xl p-6 min-h-[88px] flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold text-[16px] tracking-tight leading-none">
              Yes
            </span>
            <span className="font-mono text-[18px] font-bold text-white tracking-tight leading-none">
              {yesPercentage}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#27272a] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm bg-emerald-500 transition-all duration-500"
              style={{ width: `${yesPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* No Outcome */}
        <div className="bg-[#18181b] rounded-xl p-6 min-h-[88px] flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold text-[16px] tracking-tight leading-none">
              No
            </span>
            <span className="font-mono text-[18px] font-bold text-white tracking-tight leading-none">
              {noPercentage}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#27272a] rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm bg-rose-500 transition-all duration-500"
              style={{ width: `${noPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10">
        <div className="flex items-center justify-between pt-4 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-[#666]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-[11px] text-[#777] font-bold tracking-tight">
              {formatCurrency(market.volume)} vol
            </span>
          </div>
          <a
            href={market.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#777] font-bold tracking-tight hover:text-white transition-colors flex items-center gap-1"
          >
            Trade <span className="text-[10px]">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
