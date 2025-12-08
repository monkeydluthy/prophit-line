import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ paddingTop: '140px', paddingBottom: '140px', backgroundColor: '#0a0a0a' }}>
      <div className="w-full max-w-6xl px-6">
        <Link href="/" className="text-slate-400 hover:text-green-400 transition-colors inline-flex items-center gap-2 text-sm font-medium" style={{ marginBottom: '60px' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to search
        </Link>

        {/* Hero Section */}
        <div className="w-full text-center" style={{ marginBottom: '100px' }}>
          <h1 className="text-6xl font-bold text-white font-heading" style={{ marginBottom: '24px' }}>
            About ProphitLine
          </h1>
          <p className="text-2xl text-slate-300 leading-relaxed">
            Find the best odds across prediction markets.<br/>Compare prices from top platforms instantly.
          </p>
        </div>

        {/* How It Works Section */}
        <div style={{ marginBottom: '120px' }}>
          <h2 className="text-4xl font-bold text-white text-center font-heading" style={{ marginBottom: '70px' }}>
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '40px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/50 flex items-center justify-center text-green-400 font-bold text-2xl" style={{ marginBottom: '28px' }}>
                1
              </div>
              <h3 className="text-2xl font-semibold text-white font-heading" style={{ marginBottom: '16px' }}>
                Enter Your Prediction
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Type your prediction in natural language. For example: "Bitcoin will go under $100k by end of year" or "The Lakers will win the NBA championship."
              </p>
            </div>

            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '40px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/50 flex items-center justify-center text-green-400 font-bold text-2xl" style={{ marginBottom: '28px' }}>
                2
              </div>
              <h3 className="text-2xl font-semibold text-white font-heading" style={{ marginBottom: '16px' }}>
                AI Parsing
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Our AI analyzes your prediction to identify the event, outcome, timeframe, and any conditions to find the most relevant markets.
              </p>
            </div>

            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '40px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/50 flex items-center justify-center text-green-400 font-bold text-2xl" style={{ marginBottom: '28px' }}>
                3
              </div>
              <h3 className="text-2xl font-semibold text-white font-heading" style={{ marginBottom: '16px' }}>
                Market Search
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                We search across multiple prediction market platforms including Kalshi, Polymarket, and PredictIt.
              </p>
            </div>

            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '40px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/50 flex items-center justify-center text-green-400 font-bold text-2xl" style={{ marginBottom: '28px' }}>
                4
              </div>
              <h3 className="text-2xl font-semibold text-white font-heading" style={{ marginBottom: '16px' }}>
                Compare & Bet
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                View all matching markets side-by-side, compare odds, liquidity, and volume. Click through to place your bet.
              </p>
            </div>
          </div>
        </div>

        {/* Supported Platforms Section */}
        <div style={{ marginBottom: '100px' }}>
          <h2 className="text-4xl font-bold text-white text-center font-heading" style={{ marginBottom: '70px' }}>
            Supported Platforms
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '32px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <h3 className="font-bold text-white text-2xl font-heading" style={{ marginBottom: '12px' }}>
                Kalshi
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Regulated US prediction markets covering politics, economics, and current events.
              </p>
            </div>
            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '32px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <h3 className="font-bold text-white text-2xl font-heading" style={{ marginBottom: '12px' }}>
                Polymarket
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Crypto-native prediction market with high liquidity and diverse markets.
              </p>
            </div>
            <div className="border rounded-2xl hover:border-slate-600 transition-all duration-300" style={{ padding: '32px', backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}>
              <h3 className="font-bold text-white text-2xl font-heading" style={{ marginBottom: '12px' }}>
                PredictIt
              </h3>
              <p className="text-slate-400 leading-relaxed text-base">
                Regulated US political prediction market with focus on elections and political events.
              </p>
            </div>
          </div>
        </div>

        {/* Note Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-red-500/10 border border-green-500/30 rounded-2xl text-center" style={{ padding: '32px' }}>
          <p className="text-slate-300 leading-relaxed text-lg">
            <strong className="text-green-400 font-semibold">Note:</strong> ProphitLine is currently in development. Market data is simulated for demonstration purposes. Real API integrations are coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
