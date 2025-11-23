'use client';

import { useState } from 'react';

const categories = [
  'All',
  'Politics',
  'Sports',
  'Entertainment',
  'Crypto',
  'World',
  'Technology',
  'Economy',
];

export default function CategoryBar() {
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div className="sticky top-16 z-40 bg-[#050505] border-b border-[#1f1f1f] h-14 w-full">
      <div className="w-full h-full px-12 flex items-center justify-between gap-4">
        {/* Left: Categories */}
        <div
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar h-full"
          style={{ marginLeft: '100px' }}
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{ padding: '12px 20px', fontSize: '11px' }}
              className={`rounded-xl font-medium transition-all whitespace-nowrap ${
                activeCategory === category
                  ? 'bg-[#2d2b3b] text-[#a78bfa] border border-[#4c1d95]/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#151515]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Right: Filters */}
        <div
          className="hidden md:flex items-center gap-3 shrink-0 h-full"
          style={{ marginRight: '100px' }}
        >
          <div className="flex items-center gap-3">
            <button
              style={{ padding: '8px 14px' }}
              className="rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#111] border border-[#222] hover:border-[#333] transition-all flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Polymarket
            </button>
            <button
              style={{ padding: '8px 14px' }}
              className="rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#111] border border-[#222] hover:border-[#333] transition-all flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Kalshi
            </button>
            <button
              style={{ padding: '8px 14px' }}
              className="rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#111] border border-[#222] hover:border-[#333] transition-all flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              Manifold
            </button>
            <button
              style={{ padding: '8px 14px' }}
              className="rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-[#111] border border-[#222] hover:border-[#333] transition-all flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              PredictIt
            </button>
          </div>

          <button
            style={{ padding: '8px 14px' }}
            className="flex items-center gap-2 rounded-xl border border-[#222] bg-[#111] text-xs font-medium text-slate-300 hover:text-white transition-colors hover:border-[#333]"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
            Total Volume
            <svg
              className="w-3 h-3 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
