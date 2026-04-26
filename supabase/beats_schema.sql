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
  title text not null,
  artist text not null,
  cover_url text not null,
  spotify_url text,
  apple_url text,
  youtube_url text,
  soundcloud_url text,
  year int
);

create table if not exists public.drum_kits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text,
  price numeric not null default 0,
  image_path text,
  zip_path text not null
);

alter table if exists public.productions rename column song_title to title;
alter table if exists public.productions rename column artist_name to artist;
alter table if exists public.productions rename column cover_art_url to cover_url;
alter table if exists public.productions rename column apple_music_url to apple_url;
