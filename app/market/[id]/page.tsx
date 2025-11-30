'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getPlatformStyles } from '../../data/mockMarkets';
import { MarketResult } from '@/types';

export default function MarketPage() {
  const params = useParams();
  const [market, setMarket] = useState<MarketResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedTimeframe, setTimeframe] = useState('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState('Yes');
  const [selectedOutcomeIdx, setSelectedOutcomeIdx] = useState(0);
  const [selectedMarketIdx, setSelectedMarketIdx] = useState(0);
  const [tradeTab, setTradeTab] = useState('Buy');
  const [amount, setAmount] = useState('');
  const [volumeFilter, setVolumeFilter] = useState('all');
  const [topMargin, setTopMargin] = useState(0);
  const [outcomeOptionsMarginBottom, setOutcomeOptionsMarginBottom] = useState(0);
  const [chartSectionMarginTop, setChartSectionMarginTop] = useState(0);
  const [chartSectionMarginBottom, setChartSectionMarginBottom] = useState(0);
  const [chartSectionMarginRight, setChartSectionMarginRight] = useState(0);
  const [tradePanelMargin, setTradePanelMargin] = useState(0);
  const [tradePanelMarginLeft, setTradePanelMarginLeft] = useState(0);
  const [activeMarketsMargin, setActiveMarketsMargin] = useState(0);
  const [activeMarketsMarginRight, setActiveMarketsMarginRight] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fetchMarket = async () => {
      if (!params.id) return;

      try {
        setLoading(true);
        const res = await fetch(`/api/market/${params.id}`);
        const data = await res.json();
        if (!data.error) {
          setMarket(data);
        }
      } catch (error) {
        console.error('Error fetching market:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = async () => {
      if (!params.id) return;
      try {
        setLoadingHistory(true);
        // Fetch history - could be enhanced to filter by selected outcome/market
        const res = await fetch(`/api/market/${params.id}/history`);
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`Fetched history: ${data.length} points`);
          // Sort by time to prevent chart artifacts
          data.sort((a: any, b: any) => a.time - b.time);
          
          // Filter by timeframe if needed
          let filteredData = data;
          const now = Date.now();
          if (selectedTimeframe === '1H') {
            filteredData = data.filter((d: any) => d.time >= now - 60 * 60 * 1000);
          } else if (selectedTimeframe === '24H') {
            filteredData = data.filter((d: any) => d.time >= now - 24 * 60 * 60 * 1000);
          } else if (selectedTimeframe === '7D') {
            filteredData = data.filter((d: any) => d.time >= now - 7 * 24 * 60 * 60 * 1000);
          } else if (selectedTimeframe === '30D') {
            filteredData = data.filter((d: any) => d.time >= now - 30 * 24 * 60 * 60 * 1000);
          }
          // 'ALL' uses all data
          
          setHistory(filteredData);
        } else {
          console.warn('History API returned non-array:', data);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchMarket();
    fetchHistory();
  }, [params.id, selectedTimeframe]);

  useEffect(() => {
    setSelectedMarketIdx(0);
    setSelectedOutcomeIdx(0);
  }, [market?.id]);

  useEffect(() => {
    // Reset selected market index when filter changes
    setSelectedMarketIdx(0);
  }, [volumeFilter]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const desktop = window.innerWidth >= 1024;
      setIsMobile(mobile);
      setTopMargin(mobile ? 60 : 0);
      setOutcomeOptionsMarginBottom(mobile ? 40 : 0);
      setChartSectionMarginTop(mobile ? 12 : 0);
      setChartSectionMarginBottom(mobile ? 12 : 0);
      setChartSectionMarginRight(desktop ? 24 : 0);
      setTradePanelMargin(mobile ? 12 : 0);
      setTradePanelMarginLeft(desktop ? 4 : 0);
      setActiveMarketsMargin(mobile ? 32 : 0);
      setActiveMarketsMarginRight(desktop ? 24 : 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse volume string to number (handles "$1.2M", "M$500K", etc.)
  const parseVolumeToNumber = (vol: number | string | undefined): number => {
    if (typeof vol === 'number') return vol;
    if (!vol || vol === 'N/A') return 0;
    
    const str = vol.toString().trim();
    // Extract number and suffix (K, M, B)
    const match = str.match(/([\d.]+)\s*([KMB]?)/i);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    if (isNaN(num)) return 0;
    
    const suffix = match[2].toUpperCase();
    let multiplier = 1;
    if (suffix === 'B') multiplier = 1e9;
    else if (suffix === 'M') multiplier = 1e6;
    else if (suffix === 'K') multiplier = 1e3;
    
    return num * multiplier;
  };

  // Filter active markets by volume
  const getFilteredActiveMarkets = () => {
    if (!market?.markets) return [];
    let filtered = [...market.markets];
    
    if (volumeFilter === 'high') {
      filtered = filtered.filter((m) => {
        const vol = parseVolumeToNumber(m.volume);
        return vol >= 10000; // $10K+
      });
    } else if (volumeFilter === 'medium') {
      filtered = filtered.filter((m) => {
        const vol = parseVolumeToNumber(m.volume);
        return vol >= 1000 && vol < 10000; // $1K-$10K
      });
    } else if (volumeFilter === 'low') {
      filtered = filtered.filter((m) => {
        const vol = parseVolumeToNumber(m.volume);
        return vol < 1000 && vol > 0; // <$1K but > 0
      });
    }
    
    return filtered;
  };

  const generateSmoothPath = (
    dataPoints: any[],
    width: number,
    height: number,
    isArea: boolean = false
  ) => {
    if (!dataPoints || dataPoints.length < 2) return '';

    const maxY = 100;
    const minY = 0;

    // Find min/max time for X scaling
    const minTime = dataPoints[0].time;
    const maxTime = dataPoints[dataPoints.length - 1].time;
    const timeRange = maxTime - minTime || 1;

    const paddingLeft = 50;
    const paddingRight = 50;
    const paddingBottom = 20;
    const chartHeight = height - paddingBottom;
    const chartWidth = width - paddingLeft - paddingRight;

    const scalePoint = (p: any) => {
      const valueNormalized =
        typeof p.value === 'number'
          ? p.value > 1
            ? p.value
            : p.value * 100
          : 0;
      const x = paddingLeft + ((p.time - minTime) / timeRange) * chartWidth;
      const y =
        chartHeight -
        (valueNormalized - minY) * (chartHeight / (maxY - minY));
      return [x, y];
    };

    const scaledPoints = dataPoints.map(scalePoint);

    let d = `M ${scaledPoints[0][0]} ${scaledPoints[0][1]}`;

    for (let i = 0; i < scaledPoints.length - 1; i++) {
      const p0 = i > 0 ? scaledPoints[i - 1] : scaledPoints[0];
      const p1 = scaledPoints[i];
      const p2 = scaledPoints[i + 1];
      const p3 = i < scaledPoints.length - 2 ? scaledPoints[i + 2] : p2;

      // Bezier control points
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
    }

    if (isArea) {
      d += ` L ${
        scaledPoints[scaledPoints.length - 1][0]
      } ${chartHeight} L ${paddingLeft} ${chartHeight} Z`;
    }
    return d;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
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
        <p className="text-sm text-slate-400 animate-pulse">Loading market data...</p>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-slate-500">
        Market not found.
      </div>
    );
  }

  const platformStyles = getPlatformStyles(market.platform);
  const allActiveMarkets = market.markets || [];
  const filteredActiveMarkets = getFilteredActiveMarkets();
  const selectedMarket =
    filteredActiveMarkets[selectedMarketIdx] || filteredActiveMarkets[0] || null;
  
  // Get selected outcome
  const selectedOutcomeObj = market.outcomes[selectedOutcomeIdx] || market.outcomes[0];
  const topOutcome = market.outcomes[0];
  const defaultYes = selectedOutcomeObj ? selectedOutcomeObj.percentage : (topOutcome ? topOutcome.percentage : 50);
  
  const yesPrice =
    typeof selectedMarket?.yesPrice === 'number'
      ? Math.round(selectedMarket.yesPrice)
      : defaultYes;
  const noPrice =
    typeof selectedMarket?.noPrice === 'number'
      ? Math.round(selectedMarket.noPrice)
      : 100 - defaultYes;

  const formatCurrency = (value: number | string | undefined) => {
    if (typeof value === 'string') return value;
    if (typeof value !== 'number') return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatValueLabel = (value?: number | string) => {
    if (typeof value === 'string') return value;
    return formatCurrency(value || 0);
  };

  const simplifyLabel = (name: string) => {
    if (!name) return '';
    const match = name.match(/Will (?:the )?(.+?) win/i);
    if (match?.[1]) {
      return match[1].trim();
    }
    return name.length > 38 ? `${name.slice(0, 35)}…` : name;
  };

  const selectedVolumeLabel = selectedMarket
    ? formatValueLabel(selectedMarket.volume)
    : market.volume;
  const selectedLiquidityLabel = selectedMarket
    ? formatValueLabel(selectedMarket.liquidity)
    : market.liquidity || '$0';

  return (
    <div
      className="fixed inset-0 bg-[#050505] flex flex-col items-center lg:overflow-hidden overflow-y-auto"
      style={{ paddingTop: '80px' }}
    >
      <div className="w-full max-w-[1600px] px-4 md:px-12 flex flex-col h-full">
        {/* Top Bar */}
        <div
          className="flex-none"
          style={isMobile ? {
            marginBottom: '20px',
            paddingTop: '8px',
            marginTop: `${topMargin}px`,
            paddingLeft: '16px',
            paddingRight: '16px',
          } : {
            marginBottom: '20px',
            paddingTop: '8px',
            marginTop: `${topMargin}px`
          }}
        >
          <div
            className="bg-[#131313] border border-[#222] rounded-xl px-4 lg:px-6 py-3 lg:py-4 relative"
            style={isMobile ? {
              paddingTop: '16px',
              paddingBottom: '16px',
            } : undefined}
          >
            <Link
              href="/"
              className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#222] hover:border-[#333] transition-colors"
            >
              <svg
                style={{ width: '16px', height: '16px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <div className="flex items-center gap-3 lg:gap-4 pr-10">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#1c1c1c',
                  border: '1px solid #2a2a2a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
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
                <h1
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '4px',
                    lineHeight: '1.3',
                  }}
                  className="line-clamp-2"
                >
                  {market.title}
                </h1>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                    className={`${platformStyles.bg} ${platformStyles.border}`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-[2px] flex items-center justify-center ${platformStyles.iconBg} ${platformStyles.shadow}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-1.5 h-1.5 text-white transform rotate-45"
                        fill="currentColor"
                      >
                        <path d="M12 2L2 12l10 10 10-10L12 2z" />
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        letterSpacing: '0.5px',
                      }}
                      className={`uppercase ${platformStyles.text}`}
                    >
                      {market.platform}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {market.volume} Vol
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>•</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Ends {market.date}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Outcome Options - Mobile only - Between title and chart - 2x2 Grid */}
        {market.outcomes && market.outcomes.length > 0 && (
          <div 
            className="lg:hidden w-full"
            style={{ 
              marginBottom: '12px',
              marginTop: '8px',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
          >
            <div className="bg-[#131313] border border-[#222] rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                {market.outcomes.slice(0, 4).map((outcome, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedOutcomeIdx(idx);
                      setSelectedOutcome(outcome.name);
                    }}
                    className="flex items-center gap-2 w-full"
                    style={{
                      padding: '8px 12px',
                    }}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        idx === 0
                          ? 'bg-emerald-500'
                          : idx === 1
                          ? 'bg-blue-500'
                          : idx === 2
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                      }`}
                    ></span>
                    <span
                      className="font-medium text-white flex-1 text-left"
                      style={{ fontSize: '14px', lineHeight: '1.2' }}
                    >
                      {simplifyLabel(outcome.name)}
                    </span>
                    <span
                      className="font-bold text-slate-300 shrink-0"
                      style={{ fontSize: '14px', lineHeight: '1.2' }}
                    >
                      {outcome.percentage || 0}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Mobile stacked, Desktop two-column grid */}
        <div 
          className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 gap-6 pb-8"
          style={isMobile ? {
            paddingLeft: '16px',
            paddingRight: '16px',
          } : undefined}
        >

          {/* Left Column - Desktop: Contains Chart + Active Markets. Mobile: Just Chart */}
          <div 
            className="lg:col-span-1 lg:overflow-y-auto lg:custom-scrollbar overflow-visible order-2 lg:order-none w-full relative lg:max-h-full"
            style={isMobile ? { 
              marginTop: '12px',
              marginBottom: '12px',
              zIndex: 1
            } : { paddingRight: '24px' }}
          >
            <div className="flex flex-col gap-6 lg:gap-10" style={isMobile ? {} : { paddingBottom: '160px' }}>
              {/* Chart - Desktop: Header with outcomes + timeframe. Mobile: Different structure */}
              <div className="bg-[#131313] border border-[#222] rounded-xl overflow-hidden shrink-0 w-full relative">
                {/* Desktop Chart Header - Outcomes and Timeframe */}
                <div className="hidden lg:flex items-center justify-between" style={{ padding: '24px', paddingBottom: '24px', borderBottom: '1px solid #222' }}>
                  <div className="flex flex-wrap gap-3">
                    {market.outcomes.slice(0, 4).map((outcome, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedOutcomeIdx(idx);
                          setSelectedOutcome(outcome.name);
                        }}
                        className={`flex items-center gap-2 bg-[#1a1a1a] border border-[#333] hover:border-[#444] transition-all ${
                          idx === selectedOutcomeIdx
                            ? 'bg-[#1a2f23] border-emerald-500/50'
                            : idx > 0 ? 'opacity-60 hover:opacity-100' : ''
                        }`}
                        style={{ padding: '8px 14px', borderRadius: '10px' }}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            idx === selectedOutcomeIdx
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                              : idx === 0
                              ? 'bg-emerald-500'
                              : idx === 1
                              ? 'bg-blue-500'
                              : idx === 2
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        <span
                          className={`font-medium ${
                            idx === selectedOutcomeIdx ? 'text-white' : idx === 0 ? 'text-white' : 'text-slate-300'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {simplifyLabel(outcome.name)}
                        </span>
                        <span
                          className={`font-bold ${
                            idx === selectedOutcomeIdx ? 'text-emerald-500' : idx === 0 ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {outcome.percentage}%
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-[#1a1a1a] rounded-xl p-1 border border-[#333]">
                    {['1H', '24H', '7D', '30D', 'ALL'].map((time) => (
                      <button
                        key={time}
                        onClick={() => setTimeframe(time)}
                        className={`text-xs font-bold transition-all ${
                          selectedTimeframe === time
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        style={{ padding: '8px 16px', borderRadius: '8px' }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Desktop Chart Body */}
                <div className="hidden lg:block">
                  <div className="p-8 pb-12">
                    <div className="h-[450px] w-full relative">
                      {loadingHistory ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                          Loading chart data...
                        </div>
                      ) : history.length > 0 ? (
                        <svg
                          viewBox="0 0 1000 450"
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {/* Y-axis labels */}
                          <g className="text-[10px] fill-[#666] font-medium select-none">
                            <text x="10" y="0%">100%</text>
                            <text x="10" y="25%">75%</text>
                            <text x="10" y="50%">50%</text>
                            <text x="10" y="75%">25%</text>
                            <text x="10" y="93%">0%</text>
                          </g>
                          {/* Grid lines */}
                          <g stroke="#222" strokeDasharray="4 4">
                            <line x1="50" y1="0%" x2="950" y2="0%" />
                            <line x1="50" y1="25%" x2="950" y2="25%" />
                            <line x1="50" y1="50%" x2="950" y2="50%" />
                            <line x1="50" y1="75%" x2="950" y2="75%" />
                            <line x1="50" y1="93%" x2="950" y2="93%" />
                          </g>
                          {/* X-axis labels */}
                          <g transform="translate(0, 445)" className="text-[10px] fill-[#666] font-medium select-none">
                            <text x="50" y="0">Start</text>
                            <text x="950" y="0" textAnchor="end">Now</text>
                          </g>
                          {/* Chart paths */}
                          <g transform="scale(1, 1)">
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                            <path
                              d={generateSmoothPath(history, 1000, 450, true)}
                              fill="url(#chartGradient)"
                              stroke="none"
                              vectorEffect="non-scaling-stroke"
                            />
                            <path
                              d={generateSmoothPath(history, 1000, 450)}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                              className="hover:stroke-[3px] transition-all cursor-pointer"
                            />
                          </g>
                        </svg>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                          No history data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Mobile Chart - Different structure */}
                <div className="lg:hidden">
                  <div className="p-4">
                    {/* Chart */}
                    <div className="h-[400px] w-full relative">
                      {loadingHistory ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
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
                          <p className="text-sm text-slate-400 animate-pulse">Loading chart data...</p>
                        </div>
                      ) : history.length > 0 ? (
                        <svg
                          viewBox="0 0 1000 400"
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {/* Y-axis labels */}
                          <g className="text-[11px] fill-[#666] font-medium select-none">
                            <text x="10" y="15">
                              100%
                            </text>
                            <text x="10" y="105">
                              75%
                            </text>
                            <text x="10" y="205">
                              50%
                            </text>
                            <text x="10" y="305">
                              25%
                            </text>
                            <text x="10" y="390">
                              0%
                            </text>
                          </g>
                          {/* Grid lines */}
                          <g stroke="#222" strokeDasharray="4 4" strokeWidth="1">
                            <line x1="50" y1="0" x2="950" y2="0" />
                            <line x1="50" y1="100" x2="950" y2="100" />
                            <line x1="50" y1="200" x2="950" y2="200" />
                            <line x1="50" y1="300" x2="950" y2="300" />
                            <line x1="50" y1="380" x2="950" y2="380" />
                          </g>
                          {/* X-axis date labels */}
                          <g
                            transform="translate(0, 385)"
                            className="text-[10px] fill-[#666] font-medium select-none"
                          >
                            {(() => {
                              const minTime = history[0]?.time || Date.now();
                              const maxTime = history[history.length - 1]?.time || Date.now();
                              const timeRange = maxTime - minTime || 1;
                              const numLabels = 6;
                              const labels = [];
                              
                              for (let i = 0; i <= numLabels; i++) {
                                const time = minTime + (timeRange * i) / numLabels;
                                const date = new Date(time);
                                const month = date.toLocaleDateString('en-US', { month: 'short' });
                                const day = date.getDate();
                                const x = 50 + ((i / numLabels) * 900);
                                labels.push(
                                  <text key={i} x={x} y="0" textAnchor={i === 0 ? 'start' : i === numLabels ? 'end' : 'middle'}>
                                    {month}
                                  </text>
                                );
                              }
                              return labels;
                            })()}
                          </g>
                          {/* Chart paths */}
                          <g transform="scale(1, 1)">
                            <linearGradient
                              id="chartGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#10b981"
                                stopOpacity="0.2"
                              />
                              <stop
                                offset="100%"
                                stopColor="#10b981"
                                stopOpacity="0"
                              />
                            </linearGradient>
                            <path
                              d={generateSmoothPath(history, 1000, 400, true)}
                              fill="url(#chartGradient)"
                              stroke="none"
                              vectorEffect="non-scaling-stroke"
                            />
                            <path
                              d={generateSmoothPath(history, 1000, 400)}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                              className="hover:stroke-[3px] transition-all cursor-pointer"
                            />
                          </g>
                        </svg>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                          No history data available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Horizontal separator line */}
                  <div
                    style={{
                      width: '100%',
                      height: '1px',
                      backgroundColor: '#222',
                      marginTop: '16px',
                    }}
                  />
                  
                  {/* Time Filters - Centered and stretched below chart */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                      paddingTop: '16px',
                      paddingBottom: '16px',
                      paddingLeft: '24px',
                      paddingRight: '24px',
                    }}
                  >
                    <div 
                      className="flex bg-[#1a1a1a] rounded-xl p-1.5 border border-[#333]"
                      style={{ width: '100%', maxWidth: '100%' }}
                    >
                      {['1H', '24H', '7D', '30D', 'ALL'].map((time) => (
                        <button
                          key={time}
                          onClick={() => setTimeframe(time)}
                          className={`font-bold transition-all ${
                            selectedTimeframe === time
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          style={{ 
                            padding: '10px 0px',
                            borderRadius: '8px',
                            flex: 1,
                            textAlign: 'center',
                            margin: '0 2px',
                            fontSize: '13px',
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Active Markets - Desktop: Inside left column. Mobile: Separate below */}
              <div className="hidden lg:block">
                <div
                  className="bg-[#131313] border border-[#222] rounded-xl shrink-0"
                  style={{ padding: '20px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#1c1c1c',
                          border: '1px solid #333',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <svg
                          className="w-4 h-4 text-emerald-500"
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
                      </div>
                      <span
                        style={{
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '15px',
                        }}
                      >
                        Active Markets
                      </span>
                      <span
                        style={{
                          backgroundColor: '#222',
                          color: '#94a3b8',
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #333',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {filteredActiveMarkets.length || 0}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <select
                        value={volumeFilter}
                        onChange={(e) => {
                          setVolumeFilter(e.target.value);
                          setSelectedMarketIdx(0);
                        }}
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          color: '#94a3b8',
                          fontSize: '12px',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                        className="hover:border-[#444] transition-all"
                      >
                        <option value="all">All Volume</option>
                        <option value="high">High ($10K+)</option>
                        <option value="medium">Medium ($1K-$10K)</option>
                        <option value="low">Low (&lt;$1K)</option>
                      </select>
                    </div>
                  </div>

                  {filteredActiveMarkets.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 border border-dashed border-[#222] rounded-xl">
                      {volumeFilter === 'all' 
                        ? 'No active markets surfaced for this event yet.'
                        : `No markets found with ${volumeFilter} volume.`}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredActiveMarkets.map((child, idx) => {
                        const isSelected = idx === selectedMarketIdx;
                        
                        return (
                          <button
                            key={`${child.ticker || child.name}-${idx}`}
                            onClick={() => {
                              setSelectedMarketIdx(idx);
                              setSelectedOutcome('Yes');
                            }}
                            className={`flex items-center justify-between rounded-2xl border transition-all text-left ${
                              isSelected
                                ? 'border-emerald-500/40 bg-[#0f1b15]'
                                : 'border-[#222] bg-[#0a0a0a] hover:border-[#333]'
                            }`}
                            style={{ padding: '16px 18px' }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900 flex items-center justify-center text-xs text-white font-bold">
                                  {(child.shortName || child.name)
                                    ?.substring(0, 2)
                                    .toUpperCase() || '??'}
                                </div>
                              </div>
                              <div>
                                <div className="text-white font-bold text-sm line-clamp-1">
                                  {simplifyLabel(child.shortName || child.name)}
                                </div>
                                <div className="text-slate-500 text-xs font-medium flex items-center gap-2">
                                  <span>{formatValueLabel(child.volume)} Vol</span>
                                  <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                                  <span>
                                    {child.liquidity
                                      ? `${formatValueLabel(child.liquidity)} Liq`
                                      : 'Click to trade'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-emerald-400 text-sm font-semibold">
                                  YES {Math.round(child.yesPrice || 0)}¢
                                </div>
                                <div className="text-slate-400 text-xs">
                                  NO {Math.round(child.noPrice || 0)}¢
                                </div>
                              </div>
                              <span
                                style={{
                                  color: '#34d399',
                                  fontSize: '28px',
                                  fontWeight: 'bold',
                                }}
                              >
                                {Math.round(child.probability || child.yesPrice || 0)}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Desktop: Trade + About. Mobile: Order-4 */}
          <div 
            className="lg:col-span-1 lg:overflow-y-auto overflow-visible lg:pl-1 pl-0 order-4 lg:order-none w-full relative z-0 lg:max-h-full"
            style={isMobile ? { 
              marginTop: '12px',
              zIndex: 0
            } : undefined}
          >
            <div className="flex flex-col gap-6 lg:gap-4 pb-0 lg:pb-10">
              {/* Trade Interface */}
              <div
                className="bg-[#131313] border border-[#222] rounded-xl overflow-hidden"
                style={{ padding: '20px' }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    Trade
                  </h3>

                  {selectedMarket && (
                    <div
                      style={{
                        marginTop: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      <span className="line-clamp-1">
                        {selectedMarket.name}
                      </span>
                      <span>{formatCurrency(selectedMarket.volume)} Vol</span>
                    </div>
                  )}
                </div>

                {/* Buy/Sell */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: '#0a0a0a',
                      borderRadius: '8px',
                      padding: '2px',
                      border: '1px solid #2a2a2a',
                    }}
                  >
                    <button
                      onClick={() => setTradeTab('Buy')}
                      style={{
                        padding: '4px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                        backgroundColor:
                          tradeTab === 'Buy' ? '#1a2f23' : 'transparent',
                        color: tradeTab === 'Buy' ? '#4ade80' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeTab('Sell')}
                      style={{
                        padding: '4px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                        backgroundColor:
                          tradeTab === 'Sell' ? '#2f1a1a' : 'transparent',
                        color: tradeTab === 'Sell' ? '#f87171' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      Sell
                    </button>
                  </div>
                  {/* Market/Limit tabs... */}
                </div>

                <div
                  style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}
                >
                  <button
                    onClick={() => setSelectedOutcome('Yes')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedOutcome === 'Yes' ? '#1a2f23' : '#111',
                      border:
                        selectedOutcome === 'Yes'
                          ? '1px solid #22c55e'
                          : '1px solid #222',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        color: '#22c55e',
                        fontSize: '13px',
                        fontWeight: 'bold',
                      }}
                    >
                      YES
                    </span>
                    <span
                      style={{
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold',
                      }}
                    >
                      {yesPrice}¢
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedOutcome('No')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedOutcome === 'No' ? '#2f1a1a' : '#111',
                      border:
                        selectedOutcome === 'No'
                          ? '1px solid #ef4444'
                          : '1px solid #222',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        color: '#ef4444',
                        fontSize: '13px',
                        fontWeight: 'bold',
                      }}
                    >
                      NO
                    </span>
                    <span
                      style={{
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold',
                      }}
                    >
                      {noPrice}¢
                    </span>
                  </button>
                </div>

                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #2a2a2a',
                      borderRadius: '10px',
                      padding: '14px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontWeight: 'bold',
                      fontSize: '14px',
                    }}
                  >
                    USDC
                  </div>
                </div>

                <button
                  style={{
                    width: '100%',
                    backgroundColor: '#22c55e',
                    color: 'black',
                    padding: '14px',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    marginBottom: '16px',
                  }}
                >
                  Place Market Order
                </button>

                <div
                  style={{
                    textAlign: 'center',
                    paddingBottom: '20px',
                    borderBottom: '1px solid #1f1f1f',
                    marginBottom: '20px',
                  }}
                >
                  <a
                    href={market.link}
                    target="_blank"
                    style={{
                      fontSize: '11px',
                      color: '#64748b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    Trade on {market.platform}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </div>
              </div>

              {/* About */}
              <div
                className="bg-[#131313] border border-[#222] rounded-xl"
                style={{ padding: '20px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                  >
                    <path
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: 'white',
                    }}
                  >
                    About
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#94a3b8',
                  }}
                >
                  This market predicts the outcome of "{market.title}".
                </p>
              </div>
            </div>
          </div>

          {/* Active Markets - Mobile only (Desktop version is inside left column) */}
          <div 
            className="lg:hidden overflow-visible order-5 w-full"
            style={isMobile ? { 
              marginTop: `${activeMarketsMargin}px`,
              zIndex: 0
            } : undefined}
          >
            <div
              className="bg-[#131313] border border-[#222] rounded-xl shrink-0"
              style={{ padding: '20px' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '24px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#1c1c1c',
                      border: '1px solid #333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      className="w-4 h-4 text-emerald-500"
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
                  </div>
                  <span
                    style={{
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '15px',
                    }}
                  >
                    Active Markets
                  </span>
                  <span
                    style={{
                      backgroundColor: '#222',
                      color: '#94a3b8',
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid #333',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {filteredActiveMarkets.length || 0}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <select
                    value={volumeFilter}
                    onChange={(e) => {
                      setVolumeFilter(e.target.value);
                      setSelectedMarketIdx(0);
                    }}
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#94a3b8',
                      fontSize: '12px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    className="hover:border-[#444] transition-all"
                  >
                    <option value="all">All Volume</option>
                    <option value="high">High ($10K+)</option>
                    <option value="medium">Medium ($1K-$10K)</option>
                    <option value="low">Low (&lt;$1K)</option>
                  </select>
                </div>
              </div>

              {filteredActiveMarkets.length === 0 ? (
                <div className="text-center text-slate-500 py-12 border border-dashed border-[#222] rounded-xl">
                  {volumeFilter === 'all' 
                    ? 'No active markets surfaced for this event yet.'
                    : `No markets found with ${volumeFilter} volume.`}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredActiveMarkets.map((child, idx) => {
                    const isSelected = idx === selectedMarketIdx;
                    
                    return (
                      <button
                        key={`${child.ticker || child.name}-${idx}`}
                        onClick={() => {
                          setSelectedMarketIdx(idx);
                          setSelectedOutcome('Yes');
                        }}
                        className={`flex items-center justify-between rounded-2xl border transition-all text-left ${
                          isSelected
                            ? 'border-emerald-500/40 bg-[#0f1b15]'
                            : 'border-[#222] bg-[#0a0a0a] hover:border-[#333]'
                        }`}
                        style={{ padding: '16px 18px' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900 flex items-center justify-center text-xs text-white font-bold">
                              {(child.shortName || child.name)
                                ?.substring(0, 2)
                                .toUpperCase() || '??'}
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm line-clamp-1">
                              {simplifyLabel(child.shortName || child.name)}
                            </div>
                            <div className="text-slate-500 text-xs font-medium flex items-center gap-2">
                              <span>{formatValueLabel(child.volume)} Vol</span>
                              <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                              <span>
                                {child.liquidity
                                  ? `${formatValueLabel(child.liquidity)} Liq`
                                  : 'Click to trade'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-emerald-400 text-sm font-semibold">
                              YES {Math.round(child.yesPrice || 0)}¢
                            </div>
                            <div className="text-slate-400 text-xs">
                              NO {Math.round(child.noPrice || 0)}¢
                            </div>
                          </div>
                          <span
                            style={{
                              color: '#34d399',
                              fontSize: '28px',
                              fontWeight: 'bold',
                            }}
                          >
                            {Math.round(child.probability || child.yesPrice || 0)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
