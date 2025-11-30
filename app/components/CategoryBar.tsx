'use client';

import { useState, useRef, useEffect } from 'react';

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

const platforms = [
  { name: 'Polymarket', color: 'bg-blue-500' },
  { name: 'Kalshi', color: 'bg-green-500' },
  { name: 'Manifold', color: 'bg-purple-500' },
  { name: 'PredictIt', color: 'bg-red-500' },
];

const volumeOptions = [
  { label: 'Total Volume', value: 'all' },
  { label: 'High ($10K+)', value: 'high' },
  { label: 'Medium ($1K-$10K)', value: 'medium' },
  { label: 'Low (<$1K)', value: 'low' },
];

interface CategoryBarProps {
  activeCategory?: string;
  selectedPlatforms?: string[];
  volumeFilter?: string;
  onCategoryChange?: (category: string) => void;
  onPlatformToggle?: (platform: string) => void;
  onVolumeChange?: (volume: string) => void;
}

export default function CategoryBar({
  activeCategory = 'All',
  selectedPlatforms = [],
  volumeFilter = 'all',
  onCategoryChange,
  onPlatformToggle,
  onVolumeChange,
}: CategoryBarProps) {
  const [showVolumeDropdown, setShowVolumeDropdown] = useState(false);
  const volumeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeDropdownRef.current &&
        !volumeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowVolumeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Desktop Category Bar - Hidden on Mobile */}
      <div className="hidden md:block sticky top-16 z-40 bg-[#050505] border-b border-[#1f1f1f] h-14 w-full">
        <div className="w-full h-full px-12 flex items-center justify-between gap-4">
          {/* Left: Categories */}
          <div
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide no-scrollbar h-full"
            style={{ marginLeft: '100px' }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange?.(category)}
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
            className="flex items-center gap-3 shrink-0 h-full"
            style={{ marginRight: '100px' }}
          >
          <div className="flex items-center gap-3">
            {platforms.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.name);
              return (
                <button
                  type="button"
                  key={platform.name}
                  onClick={() => {
                    onPlatformToggle?.(platform.name);
                  }}
                  style={{ padding: '8px 14px' }}
                  className={`rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#2a2a2a] text-white border-2 border-blue-500/50 shadow-sm'
                      : 'text-slate-300 hover:text-white bg-[#111] border border-[#222] hover:border-[#333]'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${platform.color}`}></div>
                  {platform.name}
                </button>
              );
            })}
          </div>

          <div className="relative" ref={volumeDropdownRef}>
            <button
              onClick={() => setShowVolumeDropdown(!showVolumeDropdown)}
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
              {volumeOptions.find((opt) => opt.value === volumeFilter)?.label || 'Total Volume'}
              <svg
                className={`w-3 h-3 text-slate-600 transition-transform ${
                  showVolumeDropdown ? 'rotate-180' : ''
                }`}
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

            {showVolumeDropdown && (
              <div
                className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-lg z-50"
                style={{ top: '100%' }}
              >
                {volumeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onVolumeChange?.(option.value);
                      setShowVolumeDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-medium transition-colors ${
                      volumeFilter === option.value
                        ? 'bg-[#2d2b3b] text-[#a78bfa]'
                        : 'text-slate-300 hover:bg-[#222] hover:text-white'
                    } ${option.value === 'all' ? 'rounded-t-xl' : ''} ${
                      option.value === volumeOptions[volumeOptions.length - 1].value
                        ? 'rounded-b-xl'
                        : 'border-b border-[#222]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

    </>
  );
}
