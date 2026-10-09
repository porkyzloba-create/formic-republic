-- Weekly league + alliances: tables. Applied to Supabase project "formic-republic"
-- (ref pfjixomcpkcrpbvdjekh, eu-central-1) on 2026-10-09.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- Players: public profile. The secret that proves ownership lives in private.player_secrets.
create table public.players(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alliance_id uuid,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table private.player_secrets(
  player_id uuid primary key references public.players(id) on delete cascade,
  secret_hash text not null
);
create table public.alliances(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  owner_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index alliances_name_lower on public.alliances (lower(name));
alter table public.players add constraint players_alliance_fk foreign key (alliance_id) references public.alliances(id) on delete set null;
create index players_alliance_idx on public.players(alliance_id);

-- Weekly score per player (season = ISO week in UTC, e.g. 2026-W41)
create table public.scores(
  season text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  score bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season, player_id)
);
create index scores_rank_idx on public.scores(season, score desc);

-- What each member added to their alliance this week (kept even if they leave)
create table public.alliance_contrib(
  season text not null,
  alliance_id uuid not null references public.alliances(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  points bigint not null default 0,
  primary key (season, alliance_id, player_id)
);
create index alliance_contrib_season_idx on public.alliance_contrib(season, alliance_id);

-- No direct table access from the app: everything goes through the fr_* functions.
alter table public.players enable row level security;
alter table public.alliances enable row level security;
alter table public.scores enable row level security;
alter table public.alliance_contrib enable row level security;
alter table private.player_secrets enable row level security;

create or replace function private.season_now() returns text language sql stable set search_path = '' as $$
  select to_char((now() at time zone 'utc'), 'IYYY-"W"IW');
$$;

create or replace function private.check_player(p_id uuid, p_secret text) returns public.players
language plpgsql security definer set search_path = '' as $$
declare r public.players;
begin
  select p.* into r from public.players p join private.player_secrets s on s.player_id = p.id
   where p.id = p_id and s.secret_hash = encode(extensions.digest(coalesce(p_secret,''), 'sha256'), 'hex');
  if not found then raise exception 'bad_player' using errcode = 'P0001'; end if;
  update public.players set last_seen = now() where id = p_id;
  return r;
end $$;

create or replace function private.clean_name(p_name text, p_min int, p_max int) returns text
language plpgsql immutable set search_path = '' as $$
declare n text := regexp_replace(trim(coalesce(p_name,'')), '\s+', ' ', 'g');
begin
  if char_length(n) < p_min or char_length(n) > p_max then raise exception 'bad_name_length' using errcode = 'P0001'; end if;
  if n !~ '^[[:alnum:] _''.-]+$' then raise exception 'bad_name_chars' using errcode = 'P0001'; end if;
  return n;
end $$;
