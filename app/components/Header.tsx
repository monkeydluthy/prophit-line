'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/results?q=${encodeURIComponent(query)}`);
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
        <div className="flex-1 max-w-[460px] mx-8">
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets..."
              style={{ paddingLeft: '60px', height: '50px' }}
              className="w-full bg-[#151515] border border-[#2a2a2a] text-sm rounded-xl focus:outline-none focus:border-[#444] text-slate-200 placeholder:text-slate-600"
            />
          </form>
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
