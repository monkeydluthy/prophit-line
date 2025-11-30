'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CategoryBar from './components/CategoryBar';
import MarketCard from './components/MarketCard';
import { MarketResult } from '@/types';
import { parseVolume } from './services/marketService';

// Helper function to categorize markets
function getMarketCategory(market: MarketResult): string {
  const title = (market.title || '').toLowerCase();
  const outcomes = (market.outcomes || []).map((o) => o.name.toLowerCase()).join(' ');

  const text = `${title} ${outcomes}`;

  if (
    text.includes('president') ||
    text.includes('election') ||
    text.includes('senate') ||
    text.includes('congress') ||
    text.includes('trump') ||
    text.includes('biden') ||
    text.includes('democrat') ||
    text.includes('republican') ||
    text.includes('vote') ||
    text.includes('poll') ||
    text.includes('political')
  ) {
    return 'Politics';
  }

  if (
    text.includes('nfl') ||
    text.includes('nba') ||
    text.includes('mlb') ||
    text.includes('nhl') ||
    text.includes('soccer') ||
    text.includes('football') ||
    text.includes('basketball') ||
    text.includes('baseball') ||
    text.includes('hockey') ||
    text.includes('super bowl') ||
    text.includes('championship') ||
    text.includes('playoff') ||
    text.includes('win') ||
    text.includes('team') ||
    text.includes('game')
  ) {
    return 'Sports';
  }

  if (
    text.includes('bitcoin') ||
    text.includes('btc') ||
    text.includes('ethereum') ||
    text.includes('eth') ||
    text.includes('crypto') ||
    text.includes('blockchain') ||
    text.includes('defi') ||
    text.includes('nft') ||
    text.includes('coin') ||
    text.includes('token')
  ) {
    return 'Crypto';
  }

  if (
    text.includes('movie') ||
    text.includes('film') ||
    text.includes('oscar') ||
    text.includes('award') ||
    text.includes('celebrity') ||
    text.includes('actor') ||
    text.includes('actress') ||
    text.includes('music') ||
    text.includes('album') ||
    text.includes('tv') ||
    text.includes('show')
  ) {
    return 'Entertainment';
  }

  if (
    text.includes('tech') ||
    text.includes('ai') ||
    text.includes('artificial intelligence') ||
    text.includes('apple') ||
    text.includes('google') ||
    text.includes('microsoft') ||
    text.includes('meta') ||
    text.includes('tesla') ||
    text.includes('software') ||
    text.includes('hardware')
  ) {
    return 'Technology';
  }

  if (
    text.includes('economy') ||
    text.includes('gdp') ||
    text.includes('inflation') ||
    text.includes('unemployment') ||
    text.includes('fed') ||
    text.includes('federal reserve') ||
    text.includes('stock') ||
    text.includes('market') ||
    text.includes('recession')
  ) {
    return 'Economy';
  }

  if (
    text.includes('war') ||
    text.includes('ukraine') ||
    text.includes('russia') ||
    text.includes('china') ||
    text.includes('europe') ||
    text.includes('asia') ||
    text.includes('middle east') ||
    text.includes('international') ||
    text.includes('global')
  ) {
    return 'World';
  }

  return 'All';
}

export default function Home() {
  const router = useRouter();
  const [allMarkets, setAllMarkets] = useState<MarketResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [volumeFilter, setVolumeFilter] = useState('all');
  const [contentMarginTop, setContentMarginTop] = useState('140px');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateMargin = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setContentMarginTop(mobile ? '140px' : '24px');
    };
    updateMargin();
    window.addEventListener('resize', updateMargin);
    return () => window.removeEventListener('resize', updateMargin);
  }, []);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/markets/trending');
        const data = await res.json();
        if (Array.isArray(data)) {
          // Debug: Check platform distribution
          const platformCounts = data.reduce((acc: Record<string, number>, m: MarketResult) => {
            acc[m.platform] = (acc[m.platform] || 0) + 1;
            return acc;
          }, {});
          console.log('Fetched markets by platform:', platformCounts);
          console.log('Total markets fetched:', data.length);
          setAllMarkets(data);
        }
      } catch (error) {
        console.error('Error fetching markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  // Filter and sort markets
  const filteredMarkets = useMemo(() => {
    let filtered = [...allMarkets];

    // Filter by category
    if (activeCategory !== 'All') {
      filtered = filtered.filter(
        (market) => getMarketCategory(market) === activeCategory
      );
    }

    // Filter by platform
    if (selectedPlatforms.length > 0) {
      filtered = filtered.filter((market) => {
        // Normalize platform names for comparison
        const marketPlatform = (market.platform || '').trim();
        return selectedPlatforms.some(
          (selected) => selected.trim() === marketPlatform
        );
      });
    }

    // Filter by volume
    if (volumeFilter !== 'all') {
      filtered = filtered.filter((market) => {
        const vol = parseVolume(market.volume);
        if (volumeFilter === 'high') return vol >= 10000;
        if (volumeFilter === 'medium') return vol >= 1000 && vol < 10000;
        if (volumeFilter === 'low') return vol < 1000 && vol > 0;
        return true;
      });
    }

    // Sort by volume (descending)
    filtered.sort((a, b) => {
      const volA = parseVolume(a.volume);
      const volB = parseVolume(b.volume);
      return volB - volA;
    });

    return filtered;
  }, [allMarkets, activeCategory, selectedPlatforms, volumeFilter]);

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-[132px] md:pt-16 flex flex-col items-center">
      {/* Category Bar - Full Width */}
      <CategoryBar
        activeCategory={activeCategory}
        selectedPlatforms={selectedPlatforms}
        volumeFilter={volumeFilter}
        onCategoryChange={setActiveCategory}
        onPlatformToggle={handlePlatformToggle}
        onVolumeChange={setVolumeFilter}
      />

      {/* Spacer to separate category bar from content */}
      <div className="hidden md:block h-20 w-full" />

      {/* Main Content Grid - Centered */}
      <div 
        className="w-full max-w-[1600px] mx-auto md:px-12 pb-8"
        style={isMobile ? {
          marginTop: contentMarginTop,
          paddingLeft: '16px',
          paddingRight: '16px',
        } : {
          marginTop: contentMarginTop,
        }}
      >
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="relative w-20 h-20 mb-4">
              {/* Circular loader */}
              <svg
                className="absolute inset-0 w-20 h-20 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="rgba(16, 185, 129, 0.3)"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="60"
                  strokeDashoffset="30"
                  strokeLinecap="round"
                />
              </svg>
              {/* Logo in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/final-logo.png"
                  alt="ProphitLine"
                  width={40}
                  height={40}
                  className="w-10 h-10"
                />
              </div>
            </div>
            <p className="text-sm text-slate-400 animate-pulse">Loading markets...</p>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <p className="text-lg mb-2">No markets found</p>
            <p className="text-sm text-slate-600">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredMarkets.map((market, index) => (
              <MarketCard
                key={market.id}
                market={market}
                index={index}
                onNavigate={() =>
                  router.push(`/market/${encodeURIComponent(market.id)}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
