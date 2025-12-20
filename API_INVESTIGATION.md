# API Investigation: Team Name Mapping for Arbitrage Matching

## Problem
- Kalshi shows "Minnesota Winner?" with "Yes" outcome (19¢) - **CORRECTED: This actually means Milwaukee wins (NOT Minnesota)**
- Polymarket shows "Milwaukee Bucks" outcome (26¢) - this means Bucks win
- These are the SAME team (Milwaukee) on both platforms - **NOT opposite outcomes**
- Current code is incorrectly matching the same team instead of opposite teams
- The display shows "Minnesota Winner?" instead of the actual team name

## Key Findings

### Kalshi API Structure
- **Single market format**: Market has subtitle like "Minnesota Winner?"
- **Outcomes**: "Yes" and "No" (binary)
- **"Yes" meaning**: **CORRECTED - When subtitle is "Minnesota Winner?", "Yes" = OTHER team (Milwaukee) wins, NOT Minnesota**
- **Possible explanations**:
  1. The outcomes might be inverted in the API
  2. The question format might be asking about the OTHER team
  3. There might be TWO markets per game (one for each team) and we're only seeing one
- **Team extraction**: Need to understand the actual mapping - if "Yes" on "Minnesota Winner?" means Milwaukee, then we need to extract the OTHER team from the event context

### Polymarket API Structure  
- **Multiple markets format**: Each team has its own market
- **Outcomes**: Team names like "Milwaukee Bucks", "Minnesota Timberwolves"
- **Team extraction**: Outcome name IS the team name (may need normalization)

## Current Code Issues

### 1. `extractTeamFromOutcome` function (eventExtraction.ts:515)
- For "Yes" outcomes, extracts teams from title
- **ISSUE**: For "Minnesota Winner?" with "Yes", it's extracting "Minnesota" but "Yes" actually means Milwaukee wins
- **Root cause**: The function assumes "Yes" = team in question wins, but Kalshi might have inverted logic
- Needs to:
  1. **First**: Check if there are multiple markets in the event (one for each team)
  2. **If single market**: Understand that "Yes" on "Minnesota Winner?" might mean the OTHER team wins
  3. **Extract the OTHER team** from the event context (e.g., if event is "Bucks vs Timberwolves" and question is "Minnesota Winner?", then "Yes" = Bucks)
  4. Map city to team name using sport context

### 2. Team Name Display (Calculator & Main Card)
- Currently shows "Minnesota Winner?" instead of just "Minnesota" or "Timberwolves"
- For Polymarket "Yes" outcomes, needs to show the actual team name from the outcome
- The matching logic needs to ensure opposite teams are matched correctly

## Solution Approach

### Step 1: Fix `extractTeamFromOutcome` - CRITICAL FIX
- **Add event context parameter** (both teams in the event)
- For Kalshi "Yes" outcomes on single-team questions:
  - Extract team from question (e.g., "Minnesota" from "Minnesota Winner?")
  - **Find the OTHER team** from event context (e.g., if event is "Bucks vs Timberwolves" and question is "Minnesota Winner?", return "bucks")
  - Map city to team name using sport-specific mapping if needed
- For Polymarket outcomes:
  - Extract team name directly from outcome name
  - Normalize (e.g., "Milwaukee Bucks" → "bucks")

### Step 2: Fix Team Name Display
- For Kalshi markets: Show team name instead of full question
  - "Minnesota Winner?" → "Minnesota" or "Timberwolves"
- For Polymarket markets: Show team name from outcome
  - "Yes" outcome → extract from market context or outcome name

### Step 3: Ensure Opposite Team Matching
- When Kalshi has "Minnesota Winner?" (Yes = Timberwolves win)
- Match with Polymarket "Milwaukee Bucks" (Bucks win)
- These are opposite outcomes, which is correct for arbitrage

## Data Structure Examples

### Kalshi Market
```json
{
  "title": "Minnesota Winner?",
  "outcomes": [
    { "name": "Yes", "price": 0.19 },
    { "name": "No", "price": 0.81 }
  ]
}
```
- "Yes" = Minnesota/Timberwolves win
- "No" = Other team (Bucks) wins

### Polymarket Market
```json
{
  "title": "Bucks vs Timberwolves",
  "outcomes": [
    { "name": "Milwaukee Bucks", "price": 0.26 },
    { "name": "Minnesota Timberwolves", "price": 0.74 }
  ]
}
```
- "Milwaukee Bucks" = Bucks win
- "Minnesota Timberwolves" = Timberwolves win

## Next Steps
1. **CRITICAL**: Update `extractTeamFromOutcome` to:
   - Accept event context (both teams: ["bucks", "timberwolves"])
   - For "Yes" on "Minnesota Winner?", extract "Minnesota" → find OTHER team in event → return "bucks"
   - For "No" on "Minnesota Winner?", extract "Minnesota" → return "timberwolves" (the team in question)
2. Update `sportsArbitrageService.ts` to pass event signature/teams to `extractTeamFromOutcome`
3. Update display logic to show team names instead of full questions ("Minnesota Winner?" → "Milwaukee" or "Bucks")
4. Verify matching logic correctly identifies OPPOSITE outcomes (not same team)
5. Test with actual "Bucks vs Timberwolves" game data

