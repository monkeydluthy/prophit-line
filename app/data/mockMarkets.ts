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


