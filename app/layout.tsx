import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProphitLine - Prediction Market Aggregator",
  description: "Find the best odds across multiple prediction markets. Compare prices from Kalshi, Polymarket, Manifold Markets, and PredictIt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50">
          <div className="w-full h-20 flex items-center relative">
            {/* Logo - Left side of screen */}
            <Link href="/" className="flex items-center absolute" style={{ left: '10vw', background: 'transparent' }}>
              <Image 
                src="/final-logo.png" 
                alt="ProphitLine" 
                width={70} 
                height={70} 
                className="w-auto"
                style={{ height: '70px', width: 'auto', background: 'transparent' }}
                priority
              />
            </Link>
            
            {/* Nav Links - Right side of screen */}
            <nav className="flex items-center gap-8 absolute" style={{ right: '10vw' }}>
              <Link href="/" className="text-base font-medium text-slate-300 hover:text-white transition-colors">
                Search
              </Link>
              <Link href="/about" className="text-base font-medium text-slate-300 hover:text-white transition-colors">
                About
              </Link>
            </nav>
          </div>
        </header>
        <div className="animated-bg" />
        <main className="pt-20 relative z-10 min-h-screen w-full">
          {children}
        </main>
        <footer className="relative z-10 bg-slate-900/50 border-t border-slate-800/50 w-full" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
          <div className="w-full" style={{ paddingLeft: '10vw', paddingRight: '10vw' }}>
            {/* Main footer content */}
            <div className="flex flex-col md:flex-row justify-between gap-16" style={{ marginBottom: '101px' }}>
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
                  Find the best odds across prediction markets. Compare prices from top platforms instantly.
                </p>
              </div>
              
              {/* Markets column */}
              <div className="flex-1 max-w-[200px]">
                <h4 className="text-white font-semibold text-xs uppercase tracking-widest mb-5 font-heading">Markets</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      Kalshi
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      Polymarket
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      Manifold Markets
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      PredictIt
                    </Link>
                  </li>
                </ul>
              </div>
              
              {/* Legal column */}
              <div className="flex-1 max-w-[200px]">
                <h4 className="text-white font-semibold text-xs uppercase tracking-widest mb-5 font-heading">Legal</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                      Disclaimer
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Bottom bar */}
            <div className="border-t border-slate-800/30" style={{ paddingTop: '45px' }}>
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
