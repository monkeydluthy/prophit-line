'use client';

import { useState, useEffect } from 'react';
import { ArbitrageOpportunity } from '@/app/services/arbitrageService';
import { calculateArbitrageForInvestment } from '@/app/services/sportsArbitrageService';
import { parseVolume } from '@/app/services/marketService';
import { extractTeamFromOutcome } from '@/app/services/eventExtraction';

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

  // City/State to team name mapping
  const cityToTeamMap: Record<string, string[]> = {
    'minnesota': ['timberwolves', 'wild', 'vikings', 'twins'],
    'utah': ['jazz'],
    'toronto': ['raptors', 'maple leafs', 'blue jays'],
    'milwaukee': ['bucks', 'brewers'],
    'boston': ['celtics', 'bruins', 'red sox', 'patriots'],
    'los angeles': ['lakers', 'clippers', 'kings', 'dodgers', 'rams', 'chargers'],
    'new york': ['knicks', 'nets', 'rangers', 'islanders', 'yankees', 'mets', 'giants', 'jets'],
    'chicago': ['bulls', 'blackhawks', 'bears', 'cubs', 'white sox'],
    'miami': ['heat', 'dolphins', 'marlins'],
    'philadelphia': ['76ers', 'flyers', 'eagles', 'phillies'],
    'phoenix': ['suns', 'cardinals', 'diamondbacks'],
    'dallas': ['mavericks', 'stars', 'cowboys', 'rangers'],
    'denver': ['nuggets', 'avalanche', 'broncos', 'rockies'],
    'detroit': ['pistons', 'red wings', 'lions', 'tigers'],
    'houston': ['rockets', 'texans', 'astros'],
    'indiana': ['pacers', 'colts'],
    'indianapolis': ['pacers', 'colts'],
    'memphis': ['grizzlies'],
    'new orleans': ['pelicans', 'saints'],
    'oklahoma city': ['thunder'],
    'orlando': ['magic'],
    'portland': ['trail blazers'],
    'sacramento': ['kings'],
    'san antonio': ['spurs'],
    'washington': ['wizards', 'capitals', 'commanders', 'nationals'],
    'atlanta': ['hawks', 'falcons', 'braves'],
    'charlotte': ['hornets', 'panthers'],
    'cleveland': ['cavaliers', 'browns', 'guardians'],
    'golden state': ['warriors'],
    'brooklyn': ['nets'],
    'oakland': ['athletics'],
  };

  // Helper to normalize and match team names
  const normalizeTeam = (name: string): string => {
    return name.toLowerCase().trim();
  };

  // Helper to resolve city/state name to actual team name
  const resolveCityToTeam = (cityOrState: string, opportunityTeams: string[]): string | null => {
    const cityLower = normalizeTeam(cityOrState);
    
    // Check city-to-team mapping
    const possibleTeams = cityToTeamMap[cityLower];
    if (possibleTeams) {
      // Try to match with teams from the opportunity
      for (const oppTeam of opportunityTeams) {
        const oppTeamLower = normalizeTeam(oppTeam);
        // Check if any of the possible teams match the opportunity team
        if (possibleTeams.some(team => oppTeamLower.includes(team) || team.includes(oppTeamLower))) {
          return oppTeam;
        }
      }
    }
    
    // Direct match check
    for (const oppTeam of opportunityTeams) {
      const oppTeamLower = normalizeTeam(oppTeam);
      if (cityLower === oppTeamLower || cityLower.includes(oppTeamLower) || oppTeamLower.includes(cityLower)) {
        return oppTeam;
      }
    }
    
    return null;
  };

  // Helper to check if a city/state name matches a team name
  const matchesTeam = (cityOrState: string, teamName: string): boolean => {
    const cityLower = normalizeTeam(cityOrState);
    const teamLower = normalizeTeam(teamName);
    
    // Direct match
    if (cityLower === teamLower || cityLower.includes(teamLower) || teamLower.includes(teamLower)) {
      return true;
    }
    
    // Check city-to-team mapping
    const possibleTeams = cityToTeamMap[cityLower];
    if (possibleTeams) {
      return possibleTeams.some(team => teamLower.includes(team) || team.includes(teamLower));
    }
    
    return false;
  };

  // Extract team name using the shared service function
  const extractTeamDisplayName = (title: string, outcomeName: string, outcome?: any): string => {
    const oppTitle = opportunity.title || '';
    const teams = oppTitle.split(/\s+(?:vs|Vs|VS|v\.?)\s+/i);
    const opportunityTeams = teams.length === 2 ? teams.map(t => t.trim()) : [];
    
    // Use the shared extractTeamFromOutcome function
    // Pass the outcome object which may contain teamName from Kalshi's yes_sub_title
    const extractedTeam = extractTeamFromOutcome(outcomeName, title, opportunityTeams.length === 2 ? opportunityTeams : undefined, outcome);
    
    // If we got a team name, capitalize it nicely for display
    if (extractedTeam) {
      // Capitalize first letter of each word
      return extractedTeam.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    // Fallback to outcome name if we can't extract team
    return outcomeName;
  };

  // Get team names using the shared extraction function
  // Pass the outcome objects so we can use teamName from yes_sub_title if available
  const buyTeamName = extractTeamDisplayName(buyMarket.title || '', buyOutcome?.name || 'Yes', buyOutcome);
  const sellTeamName = extractTeamDisplayName(sellMarket.title || '', sellOutcome?.name || 'Yes', sellOutcome);
  
  const outcome1Name = buyTeamName;
  const outcome2Name = sellTeamName;

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


