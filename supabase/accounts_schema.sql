-- Accounts: email list, saved beats, purchase history.
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists public.subscribers (
  email text primary key,
  source text not null default 'justronbeats-website',
  marketing boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  beat_id uuid not null references public.beats(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, beat_id)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  email text not null,
  item_type text not null check (item_type in ('beat', 'drum_kit')),
  beat_id uuid references public.beats(id) on delete set null,
  drum_kit_id uuid references public.drum_kits(id) on delete set null,
  amount_cents integer,
  currency text,
  created_at timestamptz not null default now()
);
create index if not exists purchases_email_idx on public.purchases (lower(email));

-- Only the server (service role) reads and writes these tables.
alter table public.subscribers enable row level security;
alter table public.favorites enable row level security;
alter table public.purchases enable row level security;
