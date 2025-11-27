'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MarketResult } from '@/types';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MarketResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (value: string) => {
    try {
      if (!value.trim()) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      setLoadingSuggestions(true);
      const res = await fetch(`/api/markets/search?q=${encodeURIComponent(value)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data = await res.json();
      setSuggestions(data);
      setShowDropdown(true);
    } catch (error) {
      console.error('Search suggestions error:', error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowDropdown(false);
    router.push(`/results?q=${encodeURIComponent(query)}`);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const handleSelectMarket = (marketId: string) => {
    setShowDropdown(false);
    router.push(`/market/${encodeURIComponent(marketId)}`);
  };

  const formatVolumeLabel = (volume: number | string) => {
    if (typeof volume === 'number') {
      if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
      if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
      return `$${volume.toFixed(0)}`;
    }
    return volume;
  };

  const formatOutcomeBadge = (market: MarketResult) => {
    const value = market.outcomes?.[0]?.percentage;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—';
    }
    return `${Math.round(value)}%`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]">
      <div className="w-full max-w-[1600px] mx-auto px-12 h-16 flex items-center justify-between">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-8">
          <div style={{ marginLeft: '100px' }}>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/final-logo.png"
                alt="ProphitLine"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="text-xl font-bold text-white">ProphitLine</span>
            </Link>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 flex justify-center px-8">
          <div className="w-full max-w-[520px] relative" ref={wrapperRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <svg
                  className="w-4 h-4 text-slate-500"
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
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search markets..."
                style={{ paddingLeft: '60px', height: '50px' }}
                className="w-full bg-[#151515] border border-[#2a2a2a] text-sm rounded-xl focus:outline-none focus:border-[#444] text-slate-200 placeholder:text-slate-600"
              />
            </form>
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-3 w-full bg-[#111] border border-[#222] rounded-3xl shadow-2xl max-h-[420px] overflow-y-auto z-50 px-4 py-4">
                {loadingSuggestions ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    Searching markets...
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No markets found. Try another query.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3">
                      {suggestions.map((market) => (
                        <button
                          key={market.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[#181818] text-left rounded-2xl border border-[#161616] hover:border-[#2a2a2a] transition-colors"
                          style={{ marginLeft: '4px', marginRight: '8px' }}
                          onClick={() => handleSelectMarket(market.id)}
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] flex items-center justify-center text-2xl overflow-hidden">
                            {market.icon && market.icon.startsWith('http') ? (
                              <img
                                src={market.icon}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              market.icon || '📈'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-slate-200 font-semibold line-clamp-1">
                              {market.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                              <span className="uppercase font-bold">
                                {market.platform}
                              </span>
                              <span>•</span>
                              <span>{formatVolumeLabel(market.volume)} vol</span>
                            </div>
                          </div>
                          <div className="text-[12px] text-emerald-400 font-mono">
                            {formatOutcomeBadge(market)}
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      className="w-full text-center text-[12px] text-slate-300 py-3 mt-3 rounded-xl border border-[#1f1f1f] hover:text-white hover:border-[#2a2a2a] transition-colors"
                      onClick={() => {
                        setShowDropdown(false);
                        router.push(`/results?q=${encodeURIComponent(query)}`);
                      }}
                    >
                      See all results for “{query}”
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sign In */}
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Sign In
        </button>
      </div>
    </header>
  );
}
