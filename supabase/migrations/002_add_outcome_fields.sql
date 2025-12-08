-- Add outcome-specific fields to support multi-outcome snapshots
ALTER TABLE public.market_snapshots
ADD COLUMN IF NOT EXISTS outcome_name TEXT,
ADD COLUMN IF NOT EXISTS outcome_index INTEGER,
ADD COLUMN IF NOT EXISTS outcome_price NUMERIC,
ADD COLUMN IF NOT EXISTS outcome_percentage NUMERIC;

-- Create index for faster queries by outcome
CREATE INDEX IF NOT EXISTS market_snapshots_market_outcome_time_idx
  ON public.market_snapshots (market_id, outcome_index, recorded_at DESC);

-- Create index for outcome name queries
CREATE INDEX IF NOT EXISTS market_snapshots_outcome_name_idx
  ON public.market_snapshots (outcome_name, recorded_at DESC);



