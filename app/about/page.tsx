import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors mb-8 inline-block flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to search
        </Link>

        <div className="glass-strong rounded-2xl shadow-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-heading text-shadow-md">
            About ProphitLine
          </h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              ProphitLine is a prediction market aggregator that helps you find the best odds
              across multiple platforms. Simply enter your prediction in natural language, and
              we'll search through the top prediction markets to find matching opportunities.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10 mb-6 font-heading">
              How It Works
            </h2>

            <ol className="list-none space-y-6 text-slate-300">
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Enter Your Prediction</h3>
                  <p className="text-slate-400">
                    Type your prediction in natural language. For example: "Bitcoin will go under
                    $100k by end of year" or "The Lakers will win the NBA championship."
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI Parsing</h3>
                  <p className="text-slate-400">
                    Our AI analyzes your prediction to identify the event, outcome, timeframe, and
                    any conditions. This helps us search for the most relevant markets.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Market Search</h3>
                  <p className="text-slate-400">
                    We search across multiple prediction market platforms including Kalshi,
                    Polymarket, Manifold Markets, and PredictIt to find matching markets.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Compare & Bet</h3>
                  <p className="text-slate-400">
                    View all matching markets side-by-side, compare odds, liquidity, and volume.
                    Click through to place your bet on the platform of your choice.
                  </p>
                </div>
              </li>
            </ol>

            <h2 className="text-2xl font-bold text-white mt-12 mb-6 font-heading">
              Supported Platforms
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="glass rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
                <h3 className="font-bold text-white mb-2 text-lg font-heading">Kalshi</h3>
                <p className="text-sm text-slate-400">
                  Regulated US prediction markets covering politics, economics, and current events.
                </p>
              </div>
              <div className="glass rounded-xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                <h3 className="font-bold text-white mb-2 text-lg font-heading">Polymarket</h3>
                <p className="text-sm text-slate-400">
                  Crypto-native prediction market with high liquidity and diverse markets.
                </p>
              </div>
              <div className="glass rounded-xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all duration-300">
                <h3 className="font-bold text-white mb-2 text-lg font-heading">Manifold Markets</h3>
                <p className="text-sm text-slate-400">
                  Community-driven platform with unique market creation and trading features.
                </p>
              </div>
              <div className="glass rounded-xl p-6 border border-slate-700/50 hover:border-orange-500/50 transition-all duration-300">
                <h3 className="font-bold text-white mb-2 text-lg font-heading">PredictIt</h3>
                <p className="text-sm text-slate-400">
                  Popular platform focused on political predictions and current events.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mt-12 mb-6 font-heading">
              Understanding Results
            </h2>

            <ul className="space-y-4 text-slate-300">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-white">Odds:</strong> The multiplier
                  for your return if the prediction is correct (e.g., 2.5x means you get $2.50 for
                  every $1 bet).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-white">Price:</strong> The implied
                  probability of the outcome, expressed as a percentage.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-white">Liquidity:</strong> The total
                  amount of money available in the market, indicating how easy it is to buy or sell.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong className="text-white">Volume:</strong> The total
                  amount of trading activity in the market, showing market interest.
                </div>
              </li>
            </ul>

            <div className="mt-10 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-300">
                <strong className="text-blue-200">Note:</strong> ProphitLine is currently in development. Market data is
                simulated for demonstration purposes. Real API integrations are coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
