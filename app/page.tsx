'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import CategoryBar from './components/CategoryBar';

const mockMarkets = [
  // --- POLYMARKET (Blue) ---
  {
    id: 1,
    platform: 'Polymarket',
    title: 'Democratic Presidential Nominee 2028',
    icon: '驴',
    outcomes: [
      { name: 'Gavin Newsom', percentage: 38, color: 'green' },
      { name: 'AOC', percentage: 12, color: 'red' },
    ],
    moreOptions: 12,
    volume: '$312.2M',
    date: 'Nov 6',
  },
  {
    id: 2,
    platform: 'Polymarket',
    title: 'Will GPT-5 be released in 2025?',
    icon: '🧠',
    outcomes: [
      { name: 'Yes', percentage: 72, color: 'green' },
      { name: 'No', percentage: 28, color: 'red' },
    ],
    moreOptions: 2,
    volume: '$85.4M',
    date: 'Dec 31',
  },
  {
    id: 3,
    platform: 'Polymarket',
    title: 'Bitcoin price above $100k in 2024?',
    icon: '₿',
    outcomes: [
      { name: 'Yes', percentage: 45, color: 'green' },
      { name: 'No', percentage: 55, color: 'red' },
    ],
    moreOptions: 0,
    volume: '$1.2B',
    date: 'Dec 31',
  },
  {
    id: 4,
    platform: 'Polymarket',
    title: 'Highest grossing movie in 2025?',
    icon: '🎬',
    outcomes: [
      { name: 'Wicked 2', percentage: 40, color: 'green' },
      { name: 'Avatar 3', percentage: 35, color: 'blue' },
    ],
    moreOptions: 8,
    volume: '$74.2M',
    date: 'Dec 31',
  },

  // --- KALSHI (Green) ---
  {
    id: 101,
    platform: 'Kalshi',
    title: 'Fed Interest Rate Decision - Dec 2024',
    icon: '🏦',
    outcomes: [
      { name: 'Unchanged', percentage: 65, color: 'green' },
      { name: 'Cut 25bps', percentage: 35, color: 'red' },
    ],
    moreOptions: 1,
    volume: '$4.5M',
    date: 'Dec 18',
  },
  {
    id: 102,
    platform: 'Kalshi',
    title: 'NYC Snowfall > 5 inches in Jan?',
    icon: '❄️',
    outcomes: [
      { name: 'Yes', percentage: 20, color: 'green' },
      { name: 'No', percentage: 80, color: 'red' },
    ],
    moreOptions: 0,
    volume: '$890K',
    date: 'Jan 31',
  },
  {
    id: 103,
    platform: 'Kalshi',
    title: 'US GDP Growth Q4 2024 > 2.5%?',
    icon: '📈',
    outcomes: [
      { name: 'Yes', percentage: 42, color: 'green' },
      { name: 'No', percentage: 58, color: 'red' },
    ],
    moreOptions: 0,
    volume: '$2.1M',
    date: 'Jan 30',
  },
  {
    id: 104,
    platform: 'Kalshi',
    title: 'Taylor Swift Album Release 2025?',
    icon: '🎵',
    outcomes: [
      { name: 'Yes', percentage: 85, color: 'green' },
      { name: 'No', percentage: 15, color: 'red' },
    ],
    moreOptions: 0,
    volume: '$1.5M',
    date: 'Dec 31',
  },

  // --- MANIFOLD (Purple) ---
  {
    id: 201,
    platform: 'Manifold',
    title: 'Will SpaceX Starship reach orbit in 2025?',
    icon: '🚀',
    outcomes: [
      { name: 'Yes', percentage: 92, color: 'green' },
      { name: 'No', percentage: 8, color: 'red' },
    ],
    moreOptions: 0,
    volume: 'M$ 450K',
    date: 'Dec 31',
  },
  {
    id: 202,
    platform: 'Manifold',
    title: 'Will AGI be achieved by 2027?',
    icon: '🤖',
    outcomes: [
      { name: 'Yes', percentage: 35, color: 'green' },
      { name: 'No', percentage: 65, color: 'red' },
    ],
    moreOptions: 0,
    volume: 'M$ 890K',
    date: '2027',
  },
  {
    id: 203,
    platform: 'Manifold',
    title: 'Will humans land on Mars by 2030?',
    icon: '🪐',
    outcomes: [
      { name: 'Yes', percentage: 12, color: 'green' },
      { name: 'No', percentage: 88, color: 'red' },
    ],
    moreOptions: 0,
    volume: 'M$ 1.2M',
    date: '2030',
  },
  {
    id: 204,
    platform: 'Manifold',
    title: 'Will fusion power satisfy 1% of world energy?',
    icon: '⚛️',
    outcomes: [
      { name: 'Before 2035', percentage: 5, color: 'green' },
      { name: 'After 2035', percentage: 95, color: 'red' },
    ],
    moreOptions: 0,
    volume: 'M$ 200K',
    date: '2035',
  },

  // --- PREDICTIT (Red) ---
  {
    id: 301,
    platform: 'PredictIt',
    title: 'Who will win the 2026 World Cup?',
    icon: '⚽',
    outcomes: [
      { name: 'France', percentage: 18, color: 'green' },
      { name: 'Brazil', percentage: 15, color: 'blue' },
    ],
    moreOptions: 30,
    volume: '320K Shares',
    date: 'Jul 2026',
  },
  {
    id: 302,
    platform: 'PredictIt',
    title: 'UK Prime Minister after next election?',
    icon: '🇬🇧',
    outcomes: [
      { name: 'Starmer', percentage: 85, color: 'green' },
      { name: 'Sunak', percentage: 5, color: 'red' },
    ],
    moreOptions: 5,
    volume: '150K Shares',
    date: 'Jan 2025',
  },
  {
    id: 303,
    platform: 'PredictIt',
    title: 'Who will be the next Pope?',
    icon: '⛪',
    outcomes: [
      { name: 'Tagle', percentage: 12, color: 'green' },
      { name: 'Erdő', percentage: 8, color: 'blue' },
    ],
    moreOptions: 25,
    volume: '85K Shares',
    date: '???',
  },
  {
    id: 304,
    platform: 'PredictIt',
    title: 'Will California secede?',
    icon: '🐻',
    outcomes: [
      { name: 'Yes', percentage: 3, color: 'green' },
      { name: 'No', percentage: 97, color: 'red' },
    ],
    moreOptions: 0,
    volume: '500K Shares',
    date: 'Dec 31',
  },
];

const getPlatformStyles = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'kalshi':
      return {
        bg: 'bg-[#1a2f23]',
        border: 'border-green-900/30',
        text: 'text-green-400',
        iconBg: 'bg-green-500',
        shadow: 'shadow-[0_0_6px_rgba(34,197,94,0.5)]',
      };
    case 'manifold':
      return {
        bg: 'bg-[#2d1b36]',
        border: 'border-purple-900/30',
        text: 'text-purple-400',
        iconBg: 'bg-purple-500',
        shadow: 'shadow-[0_0_6px_rgba(168,85,247,0.5)]',
      };
    case 'predictit':
      return {
        bg: 'bg-[#2f1a1a]',
        border: 'border-red-900/30',
        text: 'text-red-400',
        iconBg: 'bg-red-500',
        shadow: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
      };
    case 'polymarket':
    default:
      return {
        bg: 'bg-[#1d283a]',
        border: 'border-blue-900/30',
        text: 'text-blue-400',
        iconBg: 'bg-blue-500',
        shadow: 'shadow-[0_0_6px_rgba(59,130,246,0.5)]',
      };
  }
};

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050505] pt-16 flex flex-col items-center">
      {/* Category Bar - Full Width */}
      <CategoryBar />

      {/* Spacer to separate category bar from content */}
      <div style={{ height: '80px', width: '100%' }} />

      {/* Main Content Grid - Centered */}
      <div className="w-full max-w-[1600px] mx-auto px-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {mockMarkets.map((market, index) => {
            const styles = getPlatformStyles(market.platform);
            return (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-[#131313] border border-[#222] rounded-xl hover:border-[#333] transition-all cursor-pointer group flex flex-col h-full relative shadow-sm min-h-[440px]"
                style={{ padding: '32px' }}
                onClick={() => router.push(`/market/${market.id}`)}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-8">
                  {/* Icon Box */}
                  <div className="w-12 h-12 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-3xl shrink-0 shadow-sm group-hover:border-[#333] transition-colors">
                    {market.icon}
                  </div>

                  {/* Title & Platform */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex items-center gap-1.5 rounded ${styles.bg} border ${styles.border}`}
                        style={{ padding: '6px 12px' }}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-[2px] flex items-center justify-center ${styles.shadow} ${styles.iconBg}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="w-2.5 h-2.5 text-white transform rotate-45"
                            fill="currentColor"
                          >
                            <path d="M12 2L2 12l10 10 10-10L12 2z" />
                          </svg>
                        </div>
                        <span
                          className={`text-[11px] font-bold tracking-wide uppercase ${styles.text}`}
                        >
                          {market.platform}
                        </span>
                      </div>
                    </div>

                    {/* FORCE SPACING */}
                    <div style={{ height: '12px' }} />

                    {/* TITLE */}
                    <h3
                      className="text-white font-bold text-[12px] leading-snug line-clamp-3 group-hover:text-slate-200 transition-colors tracking-tight min-h-[36px]"
                      style={{ marginBottom: '24px' }}
                    >
                      {market.title}
                    </h3>
                  </div>
                </div>

                {/* Outcomes List */}
                <div className="grow flex flex-col" style={{ gap: '16px' }}>
                  {market.outcomes.map((outcome, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px 20px',
                        backgroundColor: '#18181b',
                        borderRadius: '8px',
                        border: 'none',
                      }}
                      className="flex flex-col justify-center w-full"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[16px] tracking-tight leading-none">
                          {outcome.name}
                        </span>
                        <span className="font-mono text-[18px] font-bold text-white tracking-tight leading-none">
                          {outcome.percentage}%
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div
                        className="w-full h-1.5 bg-[#27272a] rounded-sm overflow-hidden"
                        style={{ marginTop: '8px' }}
                      >
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
                </div>

                {/* Footer Section */}
                <div
                  className="mt-auto border-t border-[#1f1f1f]"
                  style={{ marginTop: '32px', paddingTop: '20px' }}
                >
                  {/* More Options Text */}
                  <div
                    className="text-[11px] text-[#555] font-medium text-center hover:text-slate-400 transition-colors"
                    style={{ marginBottom: '20px' }}
                  >
                    +{market.moreOptions} more options
                  </div>

                  {/* Meta Data */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-[#666]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span className="text-[11px] text-[#777] font-bold tracking-tight">
                        {market.volume} vol
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 text-[#666]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-[11px] text-[#777] font-bold tracking-tight">
                        {market.date}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
