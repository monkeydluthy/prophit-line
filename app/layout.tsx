import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import Header from './components/Header';
import BottomNav from './components/BottomNav';

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
        <Suspense fallback={null}>
          <Header />
        </Suspense>
        <div className="animated-bg" />

        <main className="min-h-screen w-full pb-16 md:pb-0">{children}</main>
        
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
