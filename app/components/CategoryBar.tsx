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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const volumeDropdownRef = useRef<HTMLDivElement>(null);

  // Listen for custom event from Header's hamburger button
  useEffect(() => {
    const handleMenuToggle = () => {
      setMobileMenuOpen((prev) => !prev);
    };

    document.addEventListener('toggleMobileMenu', handleMenuToggle);
    
    return () => {
      document.removeEventListener('toggleMobileMenu', handleMenuToggle);
    };
  }, []);

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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 transition-opacity duration-300 ease-out"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              animation: 'fadeIn 0.3s ease-out',
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-l border-[#1f1f1f] overflow-y-auto"
            style={{
              animation: 'slideInFromRight 0.3s ease-out',
            }}
          >
            <div className="p-6" style={{ paddingLeft: '24px', paddingTop: '20px' }}>
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-lg font-bold text-white">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  style={{ marginRight: '8px' }}
                >
                  <svg
                    className="w-5 h-5"
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
                </button>
              </div>

              {/* Sign In - Mobile */}
              <button className="w-full flex items-center gap-3 px-6 py-4 text-base text-slate-300 hover:text-white hover:bg-[#151515] rounded-xl transition-colors border border-[#1f1f1f]" style={{ marginTop: '24px' }}>
                <svg
                  className="w-5 h-5"
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

              {/* Categories Section */}
              <div style={{ marginTop: '32px' }}>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-5" style={{ paddingLeft: '0px', letterSpacing: '0.05em' }}>
                  Categories
                </h3>
                <div className="flex flex-col gap-2.5">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        onCategoryChange?.(category);
                        setMobileMenuOpen(false);
                      }}
                      className="text-left py-3.5 text-base rounded-xl transition-all font-medium"
                      style={{
                        paddingLeft: '0px',
                        paddingRight: '24px',
                        backgroundColor: activeCategory === category ? '#2d2b3b' : 'transparent',
                        color: activeCategory === category ? '#a78bfa' : '#e2e8f0',
                        border: activeCategory === category ? '1px solid rgba(124, 29, 149, 0.3)' : '1px solid transparent',
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Filters Section */}
              <div style={{ marginTop: '32px' }}>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-5" style={{ paddingLeft: '0px', letterSpacing: '0.05em' }}>
                  Platforms
                </h3>
                <div className="flex flex-col gap-2.5">
                  {platforms.map((platform, index) => {
                    const isSelected = selectedPlatforms.includes(platform.name);
                    return (
                      <button
                        key={platform.name}
                        onClick={() => {
                          onPlatformToggle?.(platform.name);
                        }}
                        className="flex items-center gap-3 py-3.5 text-base rounded-xl transition-all text-left font-medium"
                        style={{
                          paddingLeft: '0px',
                          paddingRight: '24px',
                          marginTop: index === 0 ? '12px' : '0px',
                          backgroundColor: isSelected ? '#2a2a2a' : 'transparent',
                          color: isSelected ? 'white' : '#e2e8f0',
                          border: isSelected ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid #1f1f1f',
                        }}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${platform.color}`}></div>
                        {platform.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume Filter Section */}
              <div style={{ marginTop: '32px' }}>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-5" style={{ paddingLeft: '0px', letterSpacing: '0.05em' }}>
                  Volume
                </h3>
                <div className="flex flex-col gap-2.5">
                  {volumeOptions.map((option, index) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onVolumeChange?.(option.value);
                        setShowVolumeDropdown(false);
                      }}
                      className="text-left py-3.5 text-base rounded-xl transition-all font-medium"
                      style={{
                        paddingLeft: '0px',
                        paddingRight: '24px',
                        marginTop: index === 0 ? '12px' : '0px',
                        backgroundColor: volumeFilter === option.value ? '#2d2b3b' : 'transparent',
                        color: volumeFilter === option.value ? '#a78bfa' : '#e2e8f0',
                        border: volumeFilter === option.value ? '1px solid rgba(124, 29, 149, 0.3)' : '1px solid transparent',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
