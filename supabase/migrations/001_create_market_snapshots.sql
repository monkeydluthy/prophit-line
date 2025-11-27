-- Run this in Supabase (SQL editor) to enable snapshot storage.
create table if not exists public.market_snapshots (
  id bigserial primary key,
  platform text not null,
  event_id text,
  market_id text not null,
  recorded_at timestamptz not null default now(),
  price numeric,
  volume numeric,
  data jsonb
);

create index if not exists market_snapshots_market_time_idx
  on public.market_snapshots (market_id, recorded_at desc);

create index if not exists market_snapshots_platform_idx
  on public.market_snapshots (platform, recorded_at desc);

