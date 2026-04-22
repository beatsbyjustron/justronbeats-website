create table if not exists public.beats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  producer_credits text,
  key text not null,
  bpm int not null,
  tags text[] not null default '{}',
  cover_art_url text,
  mp3_url text not null,
  wav_url text,
  stems_url text,
  featured boolean not null default false,
  lease_price numeric,
  lease_terms text,
  premium_price numeric,
  premium_terms text,
  exclusive_price numeric,
  exclusive_terms text
);

create table if not exists public.beat_offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  beat_id uuid not null references public.beats(id) on delete cascade,
  buyer_email text not null,
  offer_amount numeric not null
);

create table if not exists public.productions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  song_title text not null,
  artist_name text not null,
  cover_art_url text not null,
  spotify_url text,
  apple_music_url text,
  youtube_url text,
  soundcloud_url text,
  year int
);
