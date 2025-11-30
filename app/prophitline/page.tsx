'use client';

import { useState } from 'react';

export default function ProphitLinePage() {
  const [isLiveMatching, setIsLiveMatching] = useState(true);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#050505',
        paddingBottom: '80px', // Space for bottom nav
      }}
    >
      {/* Main Content */}
      <div
        style={{
          paddingTop: '80px', // Space for header
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        {/* Live Matching Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '32px',
            gap: '12px',
          }}
        >
          <button
            onClick={() => setIsLiveMatching(!isLiveMatching)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              backgroundColor: '#131313',
              border: '1px solid #222',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#333';
              e.currentTarget.style.backgroundColor = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#222';
              e.currentTarget.style.backgroundColor = '#131313';
            }}
          >
            {/* Green Indicator */}
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isLiveMatching ? '#10b981' : '#64748b',
                boxShadow: isLiveMatching
                  ? '0 0 8px rgba(16, 185, 129, 0.6)'
                  : 'none',
                transition: 'all 0.3s ease',
              }}
            />
            <span
              style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Live Matching
            </span>
          </button>
          {/* Beta Tag */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#7c3aed',
              borderRadius: '8px',
              border: '1px solid #8b5cf6',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.5px',
              }}
            >
              BETA
            </span>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '16px',
            lineHeight: '1.2',
            letterSpacing: '-0.5px',
          }}
        >
          <span style={{ color: '#ffffff' }}>Cross-Platform</span>
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Arbitrage
          </span>{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Scanner
          </span>
        </h1>

        {/* Description */}
        <p
          style={{
            color: '#94a3b8',
            fontSize: '15px',
            textAlign: 'center',
            lineHeight: '1.6',
            marginBottom: '40px',
            padding: '0 8px',
          }}
        >
          AI identifies equivalent markets across exchanges. Spot price
          inefficiencies before they disappear.
        </p>

        {/* Metric Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          {/* Active Pairs Card */}
          <div
            style={{
              backgroundColor: '#7c3aed',
              borderRadius: '16px',
              padding: '24px 20px',
              border: '1px solid #8b5cf6',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              1,205
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#e9d5ff',
                fontWeight: '500',
              }}
            >
              Active Pairs
            </div>
          </div>

          {/* Max Spread Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              borderRadius: '16px',
              padding: '24px 20px',
              border: '1px solid #f97316',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              99.0%
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#fef3c7',
                fontWeight: '500',
              }}
            >
              Max Spread
            </div>
          </div>

          {/* 3%+ Spreads Card */}
          <div
            style={{
              backgroundColor: '#10b981',
              borderRadius: '16px',
              padding: '24px 20px',
              border: '1px solid #34d399',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
              }}
            >
              326
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#d1fae5',
                fontWeight: '500',
              }}
            >
              3%+ Spreads
            </div>
          </div>

          {/* Total Volume Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              borderRadius: '16px',
              padding: '24px 20px',
              border: '1px solid #22d3ee',
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#ffffff',
                marginBottom: '8px',
                lineHeight: '1.1',
              }}
            >
              $1.7B
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#cffafe',
                fontWeight: '500',
              }}
            >
              Total Volume
            </div>
          </div>
        </div>

        {/* Top Opportunities Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            Top Opportunities
          </h2>
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            {/* Sort Button */}
            <button
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#131313',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#222';
                e.currentTarget.style.backgroundColor = '#131313';
              }}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="#94a3b8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
            {/* Filter Button */}
            <button
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#131313',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#222';
                e.currentTarget.style.backgroundColor = '#131313';
              }}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="#94a3b8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
            {/* Refresh Button */}
            <button
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#131313',
                border: '1px solid #222',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#222';
                e.currentTarget.style.backgroundColor = '#131313';
              }}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="#94a3b8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Opportunities List - Placeholder */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#131313',
              border: '1px solid #222',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <p
              style={{
                color: '#94a3b8',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              Opportunities will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

