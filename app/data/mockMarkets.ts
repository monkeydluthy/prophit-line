export const mockMarkets = [
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

];

export const getPlatformStyles = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'kalshi':
      return {
        bg: 'bg-[#1a2f23]',
        border: 'border-green-900/30',
        text: 'text-green-400',
        iconBg: 'bg-green-500',
        shadow: 'shadow-[0_0_6px_rgba(34,197,94,0.5)]',
      };
    case 'polymarket':
      return {
        bg: 'bg-[#1d283a]',
        border: 'border-blue-900/30',
        text: 'text-blue-400',
        iconBg: 'bg-blue-500',
        shadow: 'shadow-[0_0_6px_rgba(59,130,246,0.5)]',
      };
    case 'predictit':
      return {
        bg: 'bg-[#3a2f1f]',
        border: 'border-orange-900/30',
        text: 'text-orange-400',
        iconBg: 'bg-orange-500',
        shadow: 'shadow-[0_0_6px_rgba(249,115,22,0.5)]',
      };
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


