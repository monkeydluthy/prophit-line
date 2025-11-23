'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export default function MarketPage() {
  const params = useParams();
  const [selectedTimeframe, setTimeframe] = useState('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState('Yes');
  const [tradeTab, setTradeTab] = useState('Buy');
  const [orderType, setOrderType] = useState('Market');
  const [amount, setAmount] = useState('');

  // Mock chart points for SVG path
  const chartPoints = [
    [0, 80], [10, 82], [20, 78], [30, 85], [40, 83], [50, 90], [60, 88], [70, 92], 
    [80, 91], [90, 95], [100, 94], [110, 96], [120, 93], [130, 97], [140, 95], [150, 98],
    [160, 96], [170, 97], [180, 95], [190, 96], [200, 95]
  ];
  
  const generatePath = (points: number[][], width: number, height: number) => {
    const maxY = 100;
    const minY = 0;
    const maxX = 200;
    
    const scaleX = width / maxX;
    const scaleY = height / (maxY - minY);
    
    return points.map((p, i) => {
      const x = p[0] * scaleX;
      const y = height - ((p[1] - minY) * scaleY);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 pb-20">
      <div className="w-full max-w-[1600px] mx-auto px-6 lg:px-12">
        
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-6 text-sm font-medium transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          
          {/* Left Column: Main Content */}
          <div className="flex flex-col gap-6">
            
            {/* Market Header Card */}
            <div className="bg-[#131313] border border-[#222] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-4xl shadow-sm">
                    ♠️
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">2025 National Heads-Up Poker Championship Winner</h1>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1d283a] border border-blue-900/30">
                        <div className="w-3.5 h-3.5 bg-blue-500 rounded-[2px] flex items-center justify-center shadow-[0_0_6px_rgba(59,130,246,0.5)]">
                          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white transform rotate-45" fill="currentColor">
                            <path d="M12 2L2 12l10 10 10-10L12 2z" />
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-blue-400 tracking-wide uppercase">POLYMARKET</span>
                      </div>
                      <span className="text-slate-500 text-sm">$178.3M Vol</span>
                      <span className="text-slate-500 text-sm">•</span>
                      <span className="text-slate-500 text-sm">Ends Dec 31</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outcomes / Chart Header */}
              <div className="flex items-center justify-between mb-6 bg-[#0a0a0a] rounded-xl p-2 border border-[#222]">
                <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-white font-bold">Sam Soverel</span>
                    <span className="text-emerald-500 font-bold">71%</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Doug Polk &lt;1%</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>Erik Seidel &lt;1%</span>
                  </div>
                </div>
                <div className="flex bg-[#131313] rounded-lg p-1 border border-[#2a2a2a]">
                  {['1H', '24H', '7D', '30D', 'ALL'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setTimeframe(time)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        selectedTimeframe === time 
                          ? 'bg-[#222] text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Area */}
              <div className="h-[400px] w-full relative bg-[#0a0a0a] rounded-xl border border-[#222] p-4 overflow-hidden">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#222" strokeDasharray="4 4" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#222" strokeDasharray="4 4" />
                  <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#222" strokeDasharray="4 4" />
                  
                  {/* Chart Path */}
                  <path
                    d={generatePath(chartPoints, 1000, 400)} // Mock width, will scale with SVG
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                  
                  {/* Area Gradient */}
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <path
                    d={`${generatePath(chartPoints, 1000, 400)} L 1000 400 L 0 400 Z`}
                    fill="url(#chartGradient)"
                    stroke="none"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>

            {/* Positions / Activity Tabs */}
            <div className="bg-[#131313] border border-[#222] rounded-2xl p-6 min-h-[300px]">
              <div className="flex items-center gap-6 border-b border-[#2a2a2a] pb-4 mb-6">
                {['Your Positions', 'Your Orders', 'History', 'Activity', 'Holders'].map((tab) => (
                  <button
                    key={tab}
                    className={`text-sm font-medium transition-colors relative ${
                      tab === 'Your Positions' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab}
                    {tab === 'Your Positions' && (
                      <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-white rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <div className="w-12 h-12 mb-4 opacity-20">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p>Connect your wallet to view positions</p>
              </div>
            </div>

          </div>

          {/* Right Column: Sidebar */}
          <div className="flex flex-col gap-6">
            
            {/* Trade Interface */}
            <div className="bg-[#131313] border border-[#222] rounded-2xl p-6">
              {/* Buy/Sell Tabs */}
              <div className="flex bg-[#0a0a0a] p-1 rounded-lg mb-6 border border-[#2a2a2a]">
                <button 
                  onClick={() => setTradeTab('Buy')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    tradeTab === 'Buy' ? 'bg-[#222] text-green-400 shadow-sm' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button 
                  onClick={() => setTradeTab('Sell')}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    tradeTab === 'Sell' ? 'bg-[#222] text-red-400 shadow-sm' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Outcome Selector */}
              <div className="flex gap-3 mb-6">
                <button 
                  onClick={() => setSelectedOutcome('Yes')}
                  className={`flex-1 p-3 rounded-xl border transition-all flex justify-between items-center ${
                    selectedOutcome === 'Yes' 
                      ? 'bg-[#1a2f23] border-green-500/50 ring-1 ring-green-500/20' 
                      : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]'
                  }`}
                >
                  <span className="text-green-400 font-bold">YES</span>
                  <span className="text-white font-mono">71.4¢</span>
                </button>
                <button 
                  onClick={() => setSelectedOutcome('No')}
                  className={`flex-1 p-3 rounded-xl border transition-all flex justify-between items-center ${
                    selectedOutcome === 'No' 
                      ? 'bg-[#2f1a1a] border-red-500/50 ring-1 ring-red-500/20' 
                      : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]'
                  }`}
                >
                  <span className="text-red-400 font-bold">NO</span>
                  <span className="text-white font-mono">28.6¢</span>
                </button>
              </div>

              {/* Order Type & Input */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-xs text-slate-500 font-medium px-1">
                  <button className="text-white">Market</button>
                  <button className="hover:text-white">Limit</button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-4 text-white text-lg font-mono focus:outline-none focus:border-slate-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">USDC</span>
                </div>
                <div className="flex justify-between text-xs px-1">
                  <span className="text-slate-500">Balance: $0.00</span>
                  <button className="text-blue-400 hover:text-blue-300">Max</button>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 rounded-xl transition-colors mb-4">
                Place Market Order
              </button>
              
              <div className="text-center">
                <a href="#" className="text-xs text-slate-500 hover:text-white flex items-center justify-center gap-1.5 transition-colors">
                  Trade on Polymarket
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* About */}
            <div className="bg-[#131313] border border-[#222] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The 2025 National Heads-Up Poker Championship will premiere on Peacock this fall. This market predicts which player will win the 2025 National Heads-Up Poker Championship. This market will resolve to "Yes" if the listed player wins.
              </p>
            </div>

            {/* Statistics */}
            <div className="bg-[#131313] border border-[#222] rounded-2xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Total Volume</span>
                  <span className="text-white font-mono">$178.3M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">24h Volume</span>
                  <span className="text-white font-mono">$91K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Active Markets</span>
                  <span className="text-white font-mono">64</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

