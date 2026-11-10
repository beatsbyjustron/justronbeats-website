-- Justron Tanks weekly leaderboard. Run once in the Supabase SQL editor. Safe to run again.

create table if not exists public.players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 16),
  created_at timestamptz not null default now()
);
create unique index if not exists players_name_unique on public.players (lower(name));

create table if not exists public.tank_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  week date not null,
  cleared integer not null check (cleared between 0 and 100),
  score integer not null check (score >= 0),
  duo boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);
create index if not exists tank_scores_week_idx on public.tank_scores (week, cleared desc, score desc);

alter table public.players enable row level security;
alter table public.tank_scores enable row level security;
