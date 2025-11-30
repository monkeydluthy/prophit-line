'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);

  const navItems = [
    {
      label: 'Markets',
      path: '/',
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
    },
    {
      label: 'ProphitLine',
      path: '/prophitline', // Will need to create this route
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      label: 'Portfolio',
      path: '/portfolio', // Will need to create this route
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-[#1f1f1f]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isPortfolio = item.label === 'Portfolio';
          const isActive = isPortfolio ? false : pathname === item.path; // Portfolio never shows as active
          
          if (isPortfolio) {
            // Portfolio redirects to home page (markets) with loading state
            const handlePortfolioClick = () => {
              if (pathname === '/') return; // Already on markets page
              
              setIsPortfolioLoading(true);
              
              // Show loader for a moment, then navigate
              setTimeout(() => {
                router.push('/');
                // Reset loading after navigation starts
                setTimeout(() => setIsPortfolioLoading(false), 300);
              }, 500);
            };
            
            return (
              <button
                key={item.path}
                onClick={handlePortfolioClick}
                disabled={isPortfolioLoading}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors cursor-pointer bg-transparent border-none disabled:opacity-75"
                style={{ background: 'transparent', border: 'none', outline: 'none' }}
              >
                <div
                  className={`transition-colors ${
                    isActive ? 'text-emerald-500' : 'text-slate-500'
                  }`}
                >
                  {isPortfolioLoading ? (
                    <svg
                      className="spinner-icon"
                      style={{
                        width: '24px',
                        height: '24px',
                      }}
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        style={{ opacity: 0.25 }}
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        style={{ opacity: 0.75 }}
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    item.icon
                  )}
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? 'text-emerald-500' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors"
            >
              <div
                className={`transition-colors ${
                  isActive ? 'text-emerald-500' : 'text-slate-500'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive ? 'text-emerald-500' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

