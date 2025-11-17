'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const placeholders = [
  'Bitcoin hits $100k by end of year',
  'Trump wins 2024 election',
  'AI achieves AGI by 2025',
  'Lakers win NBA championship',
  'Ethereum flips Bitcoin',
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    router.push(`/results?q=${encodeURIComponent(query)}`);
  };

  const examplePredictions = [
    {
      platform: 'Kalshi',
      odds: '2.4x',
      prediction: 'Bitcoin > $100k',
      color: 'green',
    },
    {
      platform: 'Polymarket',
      odds: '3.1x',
      prediction: 'AI AGI by 2025',
      color: 'purple',
    },
    {
      platform: 'Manifold',
      odds: '1.8x',
      prediction: 'Lakers Win NBA',
      color: 'teal',
    },
  ];

  // Find the highest odds for "BEST ODDS" badge
  const highestOdds = Math.max(
    ...examplePredictions.map((c) => parseFloat(c.odds))
  );

  return (
    <div className="min-h-screen w-full bg-slate-950">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
          {/* Group 1: Headlines */}
          <div
            style={{ marginBottom: '60px' }}
            className="flex flex-col items-center"
          >
            <h1
              style={{ marginBottom: '16px' }}
              className="text-6xl md:text-8xl font-bold text-slate-500/80 font-heading"
            >
              Find Your Edge
            </h1>
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-green-400 via-green-500 to-red-500 bg-clip-text text-transparent font-heading">
              Across Every Market
            </h1>
          </div>

          {/* Group 2: Subtitle */}
          <p
            style={{ marginBottom: '64px' }}
            className="text-xl text-slate-300 max-w-3xl mx-auto"
          >
            Compare odds from Kalshi, Polymarket, Manifold Markets, and
            PredictIt
          </p>

          {/* Group 3: Search input + button */}
          <div
            style={{ marginBottom: '48px' }}
            className="w-full max-w-2xl mx-auto"
          >
            <form onSubmit={handleSearch} className="flex flex-col">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ height: '72px', marginBottom: '20px' }}
                className="w-full px-8 text-lg bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none hover:border-green-500/30 transition-all duration-300 text-center animate-[fadeIn_0.5s_ease-in-out]"
                placeholder={placeholders[placeholderIndex]}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                style={{ height: '56px' }}
                className="w-full bg-gradient-to-r from-green-500 to-red-500 hover:from-green-600 hover:to-red-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2"
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {isLoading ? 'Searching...' : 'Search Markets'}
              </button>
            </form>
          </div>

          {/* Group 4: AI text + badges */}
          <div className="flex flex-col items-center">
            <p
              style={{ marginBottom: '24px' }}
              className="text-slate-400 text-xl"
            >
              AI-powered search finds the best opportunities across all
              prediction markets
            </p>
            <div
              style={{ display: 'flex', gap: '32px', justifyContent: 'center' }}
              className="flex-wrap items-center pt-4"
            >
              <span className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                5 Markets Scanned
              </span>
              <span className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                AI-Powered
              </span>
              <span className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Real-Time
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Example Predictions Section */}
      <section
        style={{ marginTop: '40px' }}
        className="py-16 bg-slate-900/30 flex flex-col items-center justify-center px-4"
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold text-center text-white font-heading"
            style={{ marginBottom: '48px' }}
          >
            Example Predictions
          </motion.h2>
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {examplePredictions.map((card, index) => {
              const isBestOdds = parseFloat(card.odds) === highestOdds;
              const colorClasses = {
                green:
                  'bg-green-500/20 text-green-400 border-green-500/30 text-green-400',
                purple:
                  'bg-gradient-to-r from-green-500/20 to-red-500/20 text-green-400 border-green-500/30 text-green-400',
                teal: 'bg-gradient-to-r from-green-500/20 via-green-400/20 to-red-500/20 text-green-400 border-green-500/30 text-green-400',
                blue: 'bg-green-500/20 text-green-400 border-green-500/30 text-green-400',
              };
              const cardColor = card.color as keyof typeof colorClasses;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{ minHeight: '280px', padding: '32px' }}
                  className="w-[350px] bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl hover:scale-105 hover:border-green-500/50 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-300 cursor-pointer relative group flex flex-col items-center justify-between h-full text-center"
                >
                  {isBestOdds && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-green-500 to-red-500 text-white text-xs font-bold rounded-full border-2 border-green-400 shadow-lg shadow-green-500/50">
                      BEST ODDS
                    </div>
                  )}
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full border ${
                      cardColor === 'green'
                        ? colorClasses.green
                        : cardColor === 'purple'
                        ? colorClasses.purple
                        : cardColor === 'teal'
                        ? colorClasses.teal
                        : colorClasses.blue
                    }`}
                  >
                    {card.platform}
                  </span>
                  <p className="text-lg text-slate-200 my-4">
                    {card.prediction}
                  </p>
                  <div
                    className={`text-6xl font-bold font-heading ${
                      cardColor === 'green'
                        ? 'text-green-400'
                        : cardColor === 'purple'
                        ? 'bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent'
                        : cardColor === 'teal'
                        ? 'bg-gradient-to-r from-green-400 via-green-300 to-red-400 bg-clip-text text-transparent'
                        : 'text-green-400'
                    }`}
                  >
                    {card.odds}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported Platforms Section */}
      <section
        style={{ marginTop: '60px', paddingTop: '80px', paddingBottom: '80px' }}
        className="flex flex-col items-center justify-center px-4"
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold text-center text-white font-heading"
            style={{ marginBottom: '48px' }}
          >
            Supported Platforms
          </motion.h2>
          <div className="flex flex-wrap justify-center gap-6 max-w-7xl mx-auto">
            {[
              {
                name: 'Kalshi',
                desc: 'Regulated US markets',
                hoverColor: 'group-hover:text-green-400',
                iconColor: 'bg-green-500/20',
              },
              {
                name: 'Polymarket',
                desc: 'Crypto-native platform',
                hoverColor: 'group-hover:text-green-400',
                iconColor: 'bg-gradient-to-r from-green-500/20 to-red-500/20',
              },
              {
                name: 'Manifold',
                desc: 'Community-driven markets',
                hoverColor: 'group-hover:text-green-400',
                iconColor:
                  'bg-gradient-to-r from-green-500/20 via-green-400/20 to-red-500/20',
              },
              {
                name: 'PredictIt',
                desc: 'Political & current events',
                hoverColor: 'group-hover:text-red-400',
                iconColor: 'bg-red-500/20',
              },
            ].map((platform, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                style={{ minHeight: '300px', padding: '32px' }}
                className="w-[280px] bg-slate-800/30 border border-slate-700/30 rounded-2xl hover:bg-slate-800/50 hover:translate-y-[-4px] hover:border-slate-600 transition-all duration-300 cursor-pointer group flex flex-col items-start"
              >
                <div
                  className={`w-12 h-12 ${platform.iconColor} rounded-lg flex items-center justify-center`}
                >
                  <div className="w-8 h-8 bg-white/20 rounded"></div>
                </div>
                <div
                  className={`text-2xl font-bold text-white font-heading mt-4 mb-2 ${platform.hoverColor} transition-colors`}
                >
                  {platform.name}
                </div>
                <p className="text-slate-400 text-sm grow">{platform.desc}</p>
                <a
                  href="#"
                  className="text-green-400 hover:text-red-400 transition-colors text-sm mt-auto"
                >
                  Learn More →
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
