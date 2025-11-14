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
                src="/logo.png" 
                alt="ProphitLine" 
                width={70} 
                height={70} 
                className="w-auto"
                style={{ height: '70px', width: 'auto', background: 'transparent', mixBlendMode: 'screen' }}
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
        <footer className="relative z-10 bg-slate-900/50 border-t border-slate-800 w-full py-16">
          <div className="w-full flex justify-between" style={{ paddingLeft: '10vw', paddingRight: '10vw' }}>
            {/* Brand column */}
            <div className="flex-1">
              <div className="mb-4">
                <Image 
                  src="/logo.png" 
                  alt="ProphitLine" 
                  width={160} 
                  height={45} 
                  className="h-10 w-auto bg-transparent"
                  style={{ background: 'transparent' }}
                />
              </div>
              <p className="text-slate-400 text-sm max-w-md">
                Find the best odds across prediction markets. Compare prices from top platforms instantly.
              </p>
            </div>
            
            {/* Markets column */}
            <div className="flex-1 flex justify-center">
              <div>
                <h4 className="text-white font-semibold mb-4">MARKETS</h4>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">Kalshi</Link></li>
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">Polymarket</Link></li>
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">Manifold Markets</Link></li>
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">PredictIt</Link></li>
                </ul>
              </div>
            </div>
            
            {/* Legal column */}
            <div className="flex-1 flex justify-end">
              <div>
                <h4 className="text-white font-semibold mb-4">LEGAL</h4>
                <ul className="space-y-3">
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">Terms of Service</Link></li>
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">Privacy Policy</Link></li>
                  <li><Link href="#" className="text-slate-400 hover:text-blue-400 transition-colors text-sm">Disclaimer</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="pt-8 border-t border-slate-800 mt-12" style={{ paddingLeft: '10vw', paddingRight: '10vw' }}>
            <p className="text-center text-slate-500 text-sm">
              © 2024 ProphitLine. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
