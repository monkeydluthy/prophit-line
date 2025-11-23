import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import Header from './components/Header';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ProphitLine - Prediction Market Aggregator',
  description:
    'Find the best odds across multiple prediction markets. Compare prices from Kalshi, Polymarket, Manifold Markets, and PredictIt.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505]`}
      >
        <Header />
        <div className="animated-bg" />

        <main className="min-h-screen w-full">{children}</main>

        {/* FORCE SPACER */}
        <div style={{ height: '160px' }} />

        <footer className="relative z-10 border-t w-full bg-[#0a0a0a] border-[#1f1f1f] pt-20 pb-10 mt-40 flex flex-col items-center">
          <div className="w-full max-w-[1600px] px-12">
            {/* Main footer content */}
            <div className="flex flex-col md:flex-row justify-between gap-16 mb-[101px]">
              {/* Brand column */}
              <div className="flex-1 max-w-md">
                <div className="mb-6">
                  <Image
                    src="/final-logo.png"
                    alt="ProphitLine"
                    width={160}
                    height={45}
                    className="h-11 w-auto bg-transparent"
                    style={{ background: 'transparent' }}
                  />
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Find the best odds across prediction markets. Compare prices
                  from top platforms instantly.
                </p>
              </div>

              {/* Markets column */}
              <div className="flex-1 max-w-[200px]">
                <h4 className="text-white font-semibold text-xs uppercase tracking-widest mb-5 font-heading">
                  Markets
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      Kalshi
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      Polymarket
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      Manifold Markets
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      PredictIt
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal column */}
              <div className="flex-1 max-w-[200px]">
                <h4 className="text-white font-semibold text-xs uppercase tracking-widest mb-5 font-heading">
                  Legal
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      Disclaimer
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-slate-800/30 pt-[45px]">
              <p className="text-center text-slate-500 text-xs">
                © 2024 ProphitLine. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
