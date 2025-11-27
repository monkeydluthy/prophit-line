'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CategoryBar from './components/CategoryBar';
import MarketCard from './components/MarketCard';
import { MarketResult } from '@/types';

export default function Home() {
  const router = useRouter();
  const [markets, setMarkets] = useState<MarketResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/markets/trending');
        const data = await res.json();
        if (Array.isArray(data)) {
          setMarkets(data);
        }
      } catch (error) {
        console.error('Error fetching markets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] pt-16 flex flex-col items-center">
      {/* Category Bar - Full Width */}
      <CategoryBar />

      {/* Spacer to separate category bar from content */}
      <div style={{ height: '80px', width: '100%' }} />

      {/* Main Content Grid - Centered */}
      <div className="w-full max-w-[1600px] mx-auto px-12 pb-8">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-500">
            Loading live markets...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {markets.map((market, index) => (
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
