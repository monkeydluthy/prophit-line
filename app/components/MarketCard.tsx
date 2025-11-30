'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MarketResult } from '@/types';
import { getPlatformStyles } from '../data/mockMarkets';

const formatPriceLabel = (price?: number) => {
  if (price === undefined || price === null || Number.isNaN(price)) return '—';
  const cents = Math.round(price * 100);
  return `${cents}¢`;
};

const formatVolumeLabel = (volume: number | string) => {
  if (typeof volume === 'number') {
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  }
  return volume;
};

interface MarketCardProps {
  market: MarketResult;
  index?: number;
  onNavigate?: () => void;
  className?: string;
}

export default function MarketCard({
  market,
  index = 0,
  onNavigate,
  className = '',
}: MarketCardProps) {
  const router = useRouter();
  const styles = getPlatformStyles(market.platform);

  const navigateToMarket = () => {
    if (onNavigate) {
      onNavigate();
      return;
    }
    
    const path = `/market/${encodeURIComponent(market.id)}`;
    // Always use window.location on mobile for immediate, reliable navigation
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.location.href = path;
    } else {
      router.push(path);
    }
  };

  const handleInteraction = () => {
    navigateToMarket();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`bg-[#131313] border border-[#222] rounded-xl hover:border-[#333] transition-all cursor-pointer group flex flex-col h-full relative shadow-sm min-h-[440px] ${className}`}
      onClick={handleInteraction}
      onTouchEnd={(e) => {
        // Don't prevent default - let it work naturally
        handleInteraction();
      }}
      style={{ 
        padding: '32px',
        cursor: 'pointer',
      }}
    >
      <div className="flex items-start gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-3xl shrink-0 shadow-sm group-hover:border-[#333] transition-colors overflow-hidden">
          {market.icon && market.icon.startsWith('http') ? (
            <img src={market.icon} alt="" className="w-full h-full object-cover" />
          ) : (
            market.icon || '📈'
          )}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex items-center gap-1.5 rounded ${styles.bg} border ${styles.border}`}
              style={{ padding: '6px 12px' }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-[2px] flex items-center justify-center ${styles.shadow} ${styles.iconBg}`}
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white transform rotate-45" fill="currentColor">
                  <path d="M12 2L2 12l10 10 10-10L12 2z" />
                </svg>
              </div>
              <span className={`text-[11px] font-bold tracking-wide uppercase ${styles.text}`}>
                {market.platform}
              </span>
            </div>
          </div>

          <div style={{ height: '12px' }} />

          <h3 className="text-white font-bold text-[12px] leading-snug line-clamp-3 group-hover:text-slate-200 transition-colors tracking-tight min-h-[36px]">
            {market.title}
          </h3>
        </div>
      </div>

      <div className="grow flex flex-col" style={{ gap: '16px' }}>
        {market.outcomes.slice(0, 4).map((outcome, idx) => (
          <div
            key={`${outcome.name}-${idx}`}
            style={{
              padding: '16px 20px',
              backgroundColor: '#18181b',
              borderRadius: '8px',
              border: 'none',
            }}
            className="flex flex-col justify-center w-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-[16px] tracking-tight leading-none line-clamp-1 mr-2">
                {outcome.name}
              </span>
              <div className="flex items-center gap-2 text-white">
                <span className="font-mono text-[15px] font-bold text-white tracking-tight leading-none opacity-80">
                  {formatPriceLabel(outcome.price)}
                </span>
                <span className="font-mono text-[18px] font-bold text-white tracking-tight leading-none">
                  {outcome.percentage}%
                </span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-[#27272a] rounded-sm overflow-hidden" style={{ marginTop: '8px' }}>
              <div
                className={`h-full rounded-sm transition-all duration-500 ${
                  outcome.color === 'green'
                    ? 'bg-emerald-500'
                    : outcome.color === 'red'
                    ? 'bg-rose-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${outcome.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
        {market.outcomes.length > 4 && (
          <div className="text-[11px] text-[#555] font-medium text-center hover:text-slate-400 transition-colors">
            +{market.outcomes.length - 4} more options
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-[#1f1f1f]" style={{ marginTop: '32px', paddingTop: '20px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-[11px] text-[#777] font-bold tracking-tight">
              {formatVolumeLabel(market.volume)} vol
            </span>
          </div>
          <span className="text-[11px] text-[#777] font-bold tracking-tight flex items-center gap-1">
            {market.date}
          </span>
        </div>
      </div>
    </motion.div>
  );
}


