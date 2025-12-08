'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { parseVolume } from '@/app/services/marketService';

interface ArbitrageOpportunity {
  id: string;
  markets: Array<{
    id: string;
    platform: string;
    title: string;
    volume: number | string;
    link: string;
  }>;
  spread: number;
  maxSpread: number;
  bestBuy: {
    market: any;
    price: number;
    platform: string;
    outcomeIndex?: number; // Index of the matched outcome
  };
  bestSell: {
    market: any;
    price: number;
    platform: string;
    outcomeIndex?: number; // Index of the matched outcome
  };
  totalVolume: number;
  avgLiquidity: number;
  title: string;
}

export default function ProphitLinePage() {
  const router = useRouter();
  const [isLiveMatching, setIsLiveMatching] = useState(true);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'spread' | 'volume'>('spread');
  const [minSpread, setMinSpread] = useState(0.5);
  const [isMobile, setIsMobile] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [liquidityFilter, setLiquidityFilter] = useState<number>(1); // Default $1 (no effective limit)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Only fetch on initial load, not automatically
    if (isLiveMatching) {
      fetchOpportunities();
    }
  }, [isLiveMatching]);

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/arbitrage?limit=500&minSpread=${minSpread}&source=embeddings`);
      const data = await response.json();
      
      // Debug logging
      console.log('[ProphitLine] API Response:', {
        hasOpportunities: !!data.opportunities,
        count: data.count,
        opportunitiesLength: data.opportunities?.length || 0,
        source: data.source,
        sample: data.opportunities?.[0],
      });
      
      setOpportunities(data.opportunities || []);
      
      if (data.opportunities && data.opportunities.length > 0) {
        console.log(`[ProphitLine] Loaded ${data.opportunities.length} opportunities`);
        console.log(`[ProphitLine] Sample opportunity:`, {
          id: data.opportunities[0].id,
          title: data.opportunities[0].title,
          maxSpread: data.opportunities[0].maxSpread,
          bestBuy: data.opportunities[0].bestBuy?.platform,
          bestSell: data.opportunities[0].bestSell?.platform,
          hasMarkets: !!data.opportunities[0].markets,
        });
      } else {
        console.log('[ProphitLine] No opportunities in response');
        console.log('[ProphitLine] Response data:', data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedOpportunities = [...opportunities]
    .filter(opp => {
      // Apply spread filter
      if (opp.maxSpread < minSpread) {
        if (opportunities.length <= 10) {
          console.log(`[ProphitLine] Filtered out: "${opp.title}" (spread ${opp.maxSpread.toFixed(2)}% < ${minSpread}%)`);
        }
        return false;
      }
      
      // Apply liquidity filter - at least one market should meet the threshold
      // For very low filters (0-1), be lenient and only require one market to have volume
      const buyVolume = parseVolume(opp.bestBuy.market?.volume || 0);
      const sellVolume = parseVolume(opp.bestSell.market?.volume || 0);
      
      // If filter is very low (0 or 1), only require at least one market to have volume
      let passesLiquidity: boolean;
      if (liquidityFilter <= 1) {
        passesLiquidity = buyVolume > 0 || sellVolume > 0;
      } else {
        // For higher filters, require at least one market to meet threshold
        passesLiquidity = buyVolume >= liquidityFilter || sellVolume >= liquidityFilter;
      }
      
      if (!passesLiquidity && opportunities.length <= 10) {
        console.log(`[ProphitLine] Filtered out: "${opp.title}" (liquidity: buy=${buyVolume}, sell=${sellVolume}, filter=${liquidityFilter})`);
      }
      
      return passesLiquidity;
    })
    .sort((a, b) => {
      if (sortBy === 'spread') {
        return b.maxSpread - a.maxSpread;
      } else {
        return b.totalVolume - a.totalVolume;
      }
    });

  // Debug: Log filtering results
  if (opportunities.length > 0) {
    console.log(`[ProphitLine] Filtering: ${opportunities.length} total → ${sortedOpportunities.length} after filters (minSpread=${minSpread}%, liquidity=${liquidityFilter})`);
  }

  // Calculate metrics
  const activePairs = opportunities.length;
  const maxSpread = opportunities.length > 0 
    ? Math.max(...opportunities.map(o => o.maxSpread))
    : 0;
  const spreads3Plus = opportunities.filter(o => o.maxSpread >= 3).length;
  const totalVolume = opportunities.reduce((sum, o) => sum + o.totalVolume, 0);

  const formatCurrency = (value: number): string => {
    // Ensure value is a valid number
    const numValue = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
    
    if (numValue >= 1_000_000_000) return `$${(numValue / 1_000_000_000).toFixed(1)}B`;
    if (numValue >= 1_000_000) return `$${(numValue / 1_000_000).toFixed(1)}M`;
    if (numValue >= 1_000) return `$${(numValue / 1_000).toFixed(1)}K`;
    return `$${Math.floor(numValue).toFixed(0)}`;
  };

  const formatPrice = (price: number): string => {
    return `${(price * 100).toFixed(1)}%`;
  };

  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'Polymarket': return '#6366f1';
      case 'Kalshi': return '#f59e0b';
      case 'PredictIt': return '#f97316';
      default: return '#64748b';
    }
  };

  const capitalizeTitle = (title: string): string => {
    if (!title) return title;
    
    // Common abbreviations and country codes that should be uppercase
    const abbreviations = new Set([
      'US', 'USA', 'UK', 'EU', 'NATO', 'UN', 'WHO', 'FDA', 'SEC', 'FBI', 'CIA',
      'AI', 'API', 'CEO', 'CFO', 'IPO', 'NFT', 'DeFi', 'BTC', 'ETH', 'USD',
      'GDP', 'CPI', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAA', 'UFC', 'FIFA'
    ]);
    
    // Split by spaces and process each word
    const words = title.split(/\s+/);
    
    return words.map((word, index) => {
      // Remove punctuation for checking, but keep it
      const cleanWord = word.replace(/[^\w]/g, '').toUpperCase();
      
      // If it's a known abbreviation, keep it uppercase
      if (abbreviations.has(cleanWord)) {
        return word.toUpperCase();
      }
      
      // Capitalize first letter of each word
      if (word.length === 0) return word;
      
      // Handle words with punctuation
      const firstChar = word[0];
      const rest = word.slice(1);
      
      // If first char is already uppercase or a number, keep as is (might be acronym)
      if (firstChar === firstChar.toUpperCase() && /[A-Z0-9]/.test(firstChar)) {
        // Check if whole word is uppercase (likely acronym)
        if (word === word.toUpperCase() && word.length > 1 && /^[A-Z]+$/.test(word)) {
          return word; // Keep acronyms as-is
        }
        return firstChar + rest.toLowerCase();
      }
      
      // Capitalize first letter, lowercase the rest
      return firstChar.toUpperCase() + rest.toLowerCase();
    }).join(' ');
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#050505',
        paddingBottom: '80px',
      }}
    >
      {/* Main Content */}
      <div
        style={{
          paddingTop: '80px',
          paddingLeft: '20px',
          paddingRight: '20px',
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* Live Matching Badge - Centered */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#131313',
              border: '1px solid #222',
              borderRadius: '20px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isLiveMatching ? '#10b981' : '#64748b',
                boxShadow: isLiveMatching
                  ? '0 0 6px rgba(16, 185, 129, 0.6)'
                  : 'none',
              }}
            />
            <span
              style={{
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              Live Matching
            </span>
          </div>
          {/* Beta Tag */}
          <div
            style={{
              padding: '4px 10px',
              backgroundColor: '#7c3aed',
              borderRadius: '12px',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.5px',
              }}
            >
              BETA
            </span>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '48px',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '20px',
            lineHeight: '1.2',
            letterSpacing: '-1px',
          }}
        >
          <span style={{ color: '#ffffff' }}>Cross-Platform </span>
          <span
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Arbitrage
          </span>{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Scanner
          </span>
        </h1>

        {/* Description - Two Lines */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '48px',
          }}
        >
          <p
            style={{
              color: '#94a3b8',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '4px',
            }}
          >
            AI identifies equivalent markets across exchanges.
          </p>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '16px',
              lineHeight: '1.6',
            }}
          >
            Spot price inefficiencies before they disappear.
          </p>
        </div>

        {/* Metric Cards - Single Row on Desktop, 2x2 on Mobile */}
        <div
          style={{
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : undefined,
            justifyContent: isMobile ? undefined : 'center',
            flexWrap: isMobile ? undefined : 'wrap',
            gap: isMobile ? '12px' : '16px',
            marginBottom: '48px',
          }}
        >
          {/* Active Pairs Card */}
          <div
            style={{
              backgroundColor: '#7c3aed',
              borderRadius: '12px',
              padding: isMobile ? '16px' : '16px 24px',
              border: '1px solid #8b5cf6',
              textAlign: 'center',
              minWidth: isMobile ? undefined : '140px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '6px',
              }}
            >
              {activePairs}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#e9d5ff',
                fontWeight: '500',
              }}
            >
              Active Pairs
            </div>
          </div>

          {/* Max Spread Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              borderRadius: '12px',
              padding: isMobile ? '16px' : '16px 24px',
              border: '1px solid #f97316',
              textAlign: 'center',
              minWidth: isMobile ? undefined : '140px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '6px',
              }}
            >
              {maxSpread.toFixed(1)}%
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#fef3c7',
                fontWeight: '500',
              }}
            >
              Max Spread
            </div>
          </div>

          {/* 3%+ Spreads Card */}
          <div
            style={{
              backgroundColor: '#10b981',
              borderRadius: '12px',
              padding: isMobile ? '16px' : '16px 24px',
              border: '1px solid #34d399',
              textAlign: 'center',
              minWidth: isMobile ? undefined : '140px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '6px',
              }}
            >
              {spreads3Plus}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#d1fae5',
                fontWeight: '500',
              }}
            >
              3%+ Spreads
            </div>
          </div>

          {/* Total Volume Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              borderRadius: '12px',
              padding: isMobile ? '16px' : '16px 24px',
              border: '1px solid #22d3ee',
              textAlign: 'center',
              minWidth: isMobile ? undefined : '140px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '6px',
                lineHeight: '1.1',
              }}
            >
              {formatCurrency(totalVolume)}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#cffafe',
                fontWeight: '500',
              }}
            >
              Total Volume
            </div>
          </div>
        </div>

        {/* Top Opportunities Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'row',
            justifyContent: isMobile ? 'space-between' : 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            position: 'relative',
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            Top Opportunities
          </h2>
          
          {isMobile ? (
            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              {/* Sort Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#131313',
                    border: showSortDropdown ? '1px solid #8b5cf6' : '1px solid #222',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!showSortDropdown) {
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.backgroundColor = '#1a1a1a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showSortDropdown) {
                      e.currentTarget.style.borderColor = '#222';
                      e.currentTarget.style.backgroundColor = '#131313';
                    }
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#94a3b8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  <svg
                    width="8"
                    height="8"
                    fill="none"
                    stroke="#94a3b8"
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
                
                {showSortDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '200px',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div
                      onClick={() => {
                        setSortBy('spread');
                        setShowSortDropdown(false);
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: sortBy === 'spread' ? '#7c3aed' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                          />
                        </svg>
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                            Highest Spread
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                            Largest price differences
                          </div>
                        </div>
                      </div>
                      {sortBy === 'spread' && (
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="#ffffff"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div
                      onClick={() => {
                        setSortBy('volume');
                        setShowSortDropdown(false);
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: sortBy === 'volume' ? '#7c3aed' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                            Total Volume
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                            Most traded markets
                          </div>
                        </div>
                      </div>
                      {sortBy === 'volume' && (
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="#ffffff"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#131313',
                    border: showFilterDropdown ? '1px solid #8b5cf6' : '1px solid #222',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!showFilterDropdown) {
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.backgroundColor = '#1a1a1a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showFilterDropdown) {
                      e.currentTarget.style.borderColor = '#222';
                      e.currentTarget.style.backgroundColor = '#131313';
                    }
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#94a3b8"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <svg
                    width="8"
                    height="8"
                    fill="none"
                    stroke="#94a3b8"
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
                
                {showFilterDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '12px',
                      padding: '16px',
                      minWidth: '240px',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="#8b5cf6"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                        Liquidity Filter
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                      Only shows matches where both platforms have at least this volume individually.
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '16px' }}>
                      Higher thresholds = more liquid market with reliable pricing.
                    </div>
                    {[1, 1000, 5000, 10000].map((threshold) => (
                      <div
                        key={threshold}
                        onClick={() => {
                          setLiquidityFilter(threshold);
                          setShowFilterDropdown(false);
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: liquidityFilter === threshold ? '#7c3aed' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                        }}
                      >
                        <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                          {threshold === 1 ? 'No Limit' : `$${threshold >= 1000 ? `${threshold / 1000}K` : threshold}+`}
                        </div>
                        {liquidityFilter === threshold && (
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="#ffffff"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchOpportunities}
                disabled={isLoading}
                title={isLoading ? 'Refreshing...' : 'Refresh opportunities'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#131313',
                  border: '1px solid #222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.borderColor = '#222';
                    e.currentTarget.style.backgroundColor = '#131313';
                  }
                }}
                title={isLoading ? 'Refreshing...' : 'Refresh opportunities'}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke={isLoading ? '#8b5cf6' : '#94a3b8'}
                  viewBox="0 0 24 24"
                  style={{
                    animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'nowrap',
              }}
            >
              {/* Desktop version - keep existing select dropdowns */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'spread' | 'volume')}
                style={{
                  padding: '8px 32px 8px 12px',
                  backgroundColor: '#131313',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="spread">Highest Spread</option>
                <option value="volume">Highest Volume</option>
              </select>
              <select
                value={minSpread.toString()}
                onChange={(e) => setMinSpread(parseFloat(e.target.value))}
                style={{
                  padding: '8px 32px 8px 12px',
                  backgroundColor: '#131313',
                  border: '1px solid #222',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                <option value="0.5">All Spreads</option>
                <option value="1">1%+</option>
                <option value="3">3%+</option>
                <option value="5">5%+</option>
              </select>
              <button
                onClick={fetchOpportunities}
                disabled={isLoading}
                title={isLoading ? 'Refreshing...' : 'Refresh opportunities'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#131313',
                  border: '1px solid #222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.backgroundColor = '#1a1a1a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.borderColor = '#222';
                    e.currentTarget.style.backgroundColor = '#131313';
                  }
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke={isLoading ? '#8b5cf6' : '#94a3b8'}
                  viewBox="0 0 24 24"
                  style={{
                    animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Click outside to close dropdowns */}
        {(showSortDropdown || showFilterDropdown) && (
          <div
            onClick={() => {
              setShowSortDropdown(false);
              setShowFilterDropdown(false);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
        )}

        {/* Experimental Feature Warning */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#f59e0b',
              }}
            >
              Experimental Feature
            </span>
          </div>
          <p
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.5',
              margin: 0,
            }}
          >
            AI-powered matching may have inaccuracies. Price gaps can reflect different terms, timing, or liquidity. Always verify independently before trading.
          </p>
        </div>

        {/* Opportunities List */}
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
            }}
          >
            <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '16px' }}>
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '80px',
                  height: '80px',
                  animation: 'spin 1s linear infinite',
                }}
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
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image
                  src="/final-logo.png"
                  alt="ProphitLine"
                  width={40}
                  height={40}
                  style={{ width: '40px', height: '40px' }}
                />
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading opportunities...</p>
          </div>
        ) : sortedOpportunities.length === 0 ? (
          <div
            style={{
              backgroundColor: '#131313',
              border: '1px solid #222',
              borderRadius: '16px',
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: '#94a3b8',
                fontSize: '14px',
                margin: 0,
              }}
            >
              No arbitrage opportunities found at the moment. Try adjusting the minimum spread filter.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: isMobile ? 'flex' : 'grid',
              flexDirection: isMobile ? 'column' : undefined,
              gridTemplateColumns: isMobile ? undefined : 'repeat(2, 1fr)',
              gap: isMobile ? '16px' : '20px',
            }}
          >
            {sortedOpportunities.map((opp) => {
              const buyMarket = opp.bestBuy.market;
              const sellMarket = opp.bestSell.market;
              // Use the matched outcome index if available, otherwise use first outcome
              const buyOutcomeIndex = opp.bestBuy.outcomeIndex !== undefined ? opp.bestBuy.outcomeIndex : 0;
              const sellOutcomeIndex = opp.bestSell.outcomeIndex !== undefined ? opp.bestSell.outcomeIndex : 0;
              const buyOutcome = buyMarket.outcomes?.[buyOutcomeIndex] || { name: 'Yes', percentage: opp.bestBuy.price * 100 };
              const sellOutcome = sellMarket.outcomes?.[sellOutcomeIndex] || { name: 'Yes', percentage: opp.bestSell.price * 100 };
              
              return (
                <div
                  key={opp.id}
                  style={{
                    backgroundColor: '#131313',
                    border: '1px solid #222',
                    borderRadius: '16px',
                    padding: isMobile ? '20px' : '24px',
                    position: 'relative',
                  }}
                >
                  {/* Spread Badge - Top Right */}
                  <div
                    style={{
                      position: 'absolute',
                      top: isMobile ? '20px' : '24px',
                      right: isMobile ? '20px' : '24px',
                      backgroundColor: '#fbbf24',
                      color: '#000000',
                      fontSize: isMobile ? '12px' : '14px',
                      fontWeight: '700',
                      padding: isMobile ? '5px 10px' : '6px 12px',
                      borderRadius: '8px',
                    }}
                  >
                    {opp.maxSpread.toFixed(1)}%
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: isMobile ? '14px' : '18px',
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: isMobile ? '20px' : '20px',
                      paddingRight: isMobile ? '70px' : '100px',
                      lineHeight: '1.3',
                    }}
                  >
                    {capitalizeTitle(opp.title)}
                  </h3>

                  {/* Platform Cards Side by Side */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: isMobile ? '12px' : '16px',
                      marginBottom: isMobile ? '16px' : '16px',
                    }}
                  >
                    {/* Buy Platform Card */}
                    <div
                      onClick={() => {
                        router.push(`/market/${encodeURIComponent(buyMarket.id)}`);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: getPlatformColor(opp.bestBuy.platform) + '15',
                        border: `2px solid ${getPlatformColor(opp.bestBuy.platform)}40`,
                        borderRadius: '12px',
                        padding: isMobile ? '14px' : '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getPlatformColor(opp.bestBuy.platform) + '25';
                        e.currentTarget.style.borderColor = getPlatformColor(opp.bestBuy.platform) + '60';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = getPlatformColor(opp.bestBuy.platform) + '15';
                        e.currentTarget.style.borderColor = getPlatformColor(opp.bestBuy.platform) + '40';
                      }}
                    >
                      <div
                        style={{
                          fontSize: isMobile ? '11px' : '12px',
                          fontWeight: '700',
                          color: getPlatformColor(opp.bestBuy.platform),
                          marginBottom: isMobile ? '10px' : '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {opp.bestBuy.platform}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '14px' : '16px',
                          fontWeight: '600',
                          color: '#ffffff',
                          marginBottom: isMobile ? '6px' : '8px',
                        }}
                      >
                        {buyOutcome.name}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '13px' : '14px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        {((opp.bestBuy.price * 100).toFixed(1))} ¢ YES
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '11px' : '12px',
                          color: '#64748b',
                        }}
                      >
                        {formatCurrency(parseVolume(buyMarket.volume))} vol
                      </div>
                    </div>

                    {/* Arrow */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '20px' : '24px',
                        color: '#64748b',
                      }}
                    >
                      →
                    </div>

                    {/* Sell Platform Card */}
                    <div
                      onClick={() => {
                        router.push(`/market/${encodeURIComponent(sellMarket.id)}`);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: getPlatformColor(opp.bestSell.platform) + '15',
                        border: `2px solid ${getPlatformColor(opp.bestSell.platform)}40`,
                        borderRadius: isMobile ? '10px' : '12px',
                        padding: isMobile ? '12px' : '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = getPlatformColor(opp.bestSell.platform) + '25';
                        e.currentTarget.style.borderColor = getPlatformColor(opp.bestSell.platform) + '60';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = getPlatformColor(opp.bestSell.platform) + '15';
                        e.currentTarget.style.borderColor = getPlatformColor(opp.bestSell.platform) + '40';
                      }}
                    >
                      <div
                        style={{
                          fontSize: isMobile ? '10px' : '12px',
                          fontWeight: '700',
                          color: getPlatformColor(opp.bestSell.platform),
                          marginBottom: isMobile ? '8px' : '12px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {opp.bestSell.platform}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '14px' : '16px',
                          fontWeight: '600',
                          color: '#ffffff',
                          marginBottom: isMobile ? '6px' : '8px',
                        }}
                      >
                        {sellOutcome.name}
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '13px' : '14px',
                          color: '#94a3b8',
                          marginBottom: isMobile ? '4px' : '4px',
                        }}
                      >
                        {((opp.bestSell.price * 100).toFixed(1))} ¢ YES
                      </div>
                      <div
                        style={{
                          fontSize: isMobile ? '11px' : '12px',
                          color: '#64748b',
                        }}
                      >
                        {formatCurrency(parseVolume(sellMarket.volume))} vol
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/market/${encodeURIComponent(opp.bestBuy.market.id)}`);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#fbbf24',
                      color: '#000000',
                      fontSize: isMobile ? '13px' : '14px',
                      fontWeight: '600',
                      padding: isMobile ? '10px 12px' : '12px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isMobile ? 'space-between' : 'center',
                      gap: isMobile ? '8px' : '8px',
                      marginBottom: isMobile ? '12px' : '16px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f59e0b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fbbf24';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg
                        width={isMobile ? '14' : '16'}
                        height={isMobile ? '14' : '16'}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>Buy {opp.bestBuy.platform} for {opp.maxSpread.toFixed(1)}% edge</span>
                    </div>
                    {isMobile && (
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Bottom Stats */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: isMobile ? '11px' : '12px',
                      color: '#64748b',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg
                        width={isMobile ? '12' : '14'}
                        height={isMobile ? '12' : '14'}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span>{formatCurrency(opp.totalVolume)}</span>
                    </div>
                    <span>N/A 24h</span>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>99% match</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
