'use client';

import { useState, useEffect } from 'react';
import { ArbitrageOpportunity } from '@/app/services/arbitrageService';
import { calculateArbitrageForInvestment } from '@/app/services/sportsArbitrageService';
import { parseVolume } from '@/app/services/marketService';

interface ArbitrageCalculatorProps {
  opportunity: ArbitrageOpportunity;
  defaultInvestment?: number;
}

export default function ArbitrageCalculator({ 
  opportunity, 
  defaultInvestment = 1000 
}: ArbitrageCalculatorProps) {
  const [investment, setInvestment] = useState(defaultInvestment);
  const [investmentInput, setInvestmentInput] = useState(String(defaultInvestment));
  const [calc, setCalc] = useState<any>(null);

  useEffect(() => {
    // Calculate arbitrage for current investment
    const calculation = calculateArbitrageForInvestment(opportunity, investment);
    setCalc(calculation);
  }, [opportunity, investment]);
  
  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string for clearing
    if (value === '') {
      setInvestmentInput('');
      setInvestment(0);
      return;
    }
    
    // Remove leading zeros (e.g., "0200" -> "200")
    const cleanedValue = value.replace(/^0+(?=\d)/, '');
    
    // Parse to number
    const numValue = parseFloat(cleanedValue);
    
    if (!isNaN(numValue) && numValue >= 0) {
      setInvestmentInput(cleanedValue);
      setInvestment(numValue);
    }
  };

  if (!calc) {
    return <div>Loading calculator...</div>;
  }

  const buyMarket = opportunity.bestBuy.market;
  const sellMarket = opportunity.bestSell.market;
  const buyOutcomeIndex = opportunity.bestBuy.outcomeIndex ?? 0;
  const sellOutcomeIndex = opportunity.bestSell.outcomeIndex ?? 0;
  const buyOutcome = buyMarket.outcomes?.[buyOutcomeIndex];
  const sellOutcome = sellMarket.outcomes?.[sellOutcomeIndex];

  const team1 = (opportunity as any).team1 || buyOutcome?.name || 'Team 1';
  const team2 = (opportunity as any).team2 || sellOutcome?.name || 'Team 2';
  const outcome1Name = (opportunity as any).outcome1Name || buyOutcome?.name || 'Outcome 1';
  const outcome2Name = (opportunity as any).outcome2Name || sellOutcome?.name || 'Outcome 2';

  const buyVolume = parseVolume(buyMarket.volume || 0);
  const sellVolume = parseVolume(sellMarket.volume || 0);

  return (
    <div style={{
      padding: '0',
    }}>
      {/* Investment Input */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '8px',
        }}>
          Total Investment ($)
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={investmentInput}
          onChange={handleInvestmentChange}
          placeholder="0"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#131313',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
          }}
        />
      </div>

      {/* Two Market Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {/* Buy Market */}
        <div style={{
          backgroundColor: '#131313',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: buyMarket.platform === 'Kalshi' ? '#10b981' : '#8b5cf6',
              }}>
                {buyMarket.platform}
              </span>
            </div>
            <a
              href={buyMarket.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#94a3b8',
                textDecoration: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Team</div>
            <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
              {outcome1Name}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Price</div>
            <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
              ${calc.investment1.toFixed(2)}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
              {(opportunity.bestBuy.price * 100).toFixed(1)}¢ ({(opportunity.bestBuy.price * 100).toFixed(1)}%)
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Potential Payout</div>
            <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>
              ${calc.payout.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Volume</div>
            <div style={{ color: '#ffffff', fontSize: '14px' }}>
              {buyVolume >= 1000 ? `$${(buyVolume / 1000).toFixed(1)}K` : `$${buyVolume}`}
            </div>
          </div>
        </div>

        {/* Sell Market */}
        <div style={{
          backgroundColor: '#131313',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: sellMarket.platform === 'Kalshi' ? '#10b981' : '#8b5cf6',
              }}>
                {sellMarket.platform}
              </span>
            </div>
            <a
              href={sellMarket.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#94a3b8',
                textDecoration: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Team</div>
            <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
              {outcome2Name}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Price</div>
            <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
              ${calc.investment2.toFixed(2)}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
              {(opportunity.bestSell.price * 100).toFixed(1)}¢ ({(opportunity.bestSell.price * 100).toFixed(1)}%)
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Potential Payout</div>
            <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>
              ${calc.payout.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Volume</div>
            <div style={{ color: '#ffffff', fontSize: '14px' }}>
              {sellVolume >= 1000 ? `$${(sellVolume / 1000).toFixed(1)}K` : `$${sellVolume}`}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        backgroundColor: '#131313',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Total Investment</div>
            <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
              ${investment.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Min Payout</div>
            <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
              ${calc.payout.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Fees</div>
            <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
              ${calc.totalFees.toFixed(2)}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>
              {buyMarket.platform === 'Kalshi' ? '2%' : '0%'} + {sellMarket.platform === 'Kalshi' ? '2%' : '0%'}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Net Profit</div>
            <div style={{
              color: calc.netProfit > 0 ? '#10b981' : '#ef4444',
              fontSize: '20px',
              fontWeight: '700',
            }}>
              ${calc.netProfit.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>ROI</div>
            <div style={{
              color: calc.roi > 0 ? '#10b981' : calc.roi < 0 ? '#ef4444' : '#94a3b8',
              fontSize: '20px',
              fontWeight: '700',
            }}>
              {investment === 0 || isNaN(calc.roi) ? '-' : `${calc.roi >= 0 ? '+' : ''}${calc.roi.toFixed(2)}%`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


