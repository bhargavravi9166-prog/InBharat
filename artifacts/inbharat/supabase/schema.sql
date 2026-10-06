-- INBHARAT starter schema
-- Run this once in the Supabase SQL Editor for the project configured in Replit.
create extension if not exists pgcrypto;

create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district text not null,
  state text not null,
  tehsil text,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (name, district, state)
);

create table if not exists public.local_spots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  village_name text not null,
  district text not null,
  state text not null,
  category text not null,
  description text,
  image_url text,
  latitude double precision,
  longitude double precision,
  upvotes integer not null default 0 check (upvotes >= 0),
  created_at timestamptz not null default now()
);

alter table public.villages enable row level security;
alter table public.local_spots enable row level security;

drop policy if exists "Public can read villages" on public.villages;
create policy "Public can read villages"
  on public.villages for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read local spots" on public.local_spots;
create policy "Public can read local spots"
  on public.local_spots for select
  to anon, authenticated
  using (true);

drop policy if exists "Visitors can submit local spots" on public.local_spots;
create policy "Visitors can submit local spots"
  on public.local_spots for insert
  to anon, authenticated
  with check (
    length(trim(title)) >= 2
    and length(trim(village_name)) >= 2
    and length(trim(district)) >= 2
    and length(trim(state)) >= 2
    and length(trim(category)) >= 2
  );

create or replace function public.increment_local_spot_upvotes(p_spot_id uuid)
returns setof public.local_spots
language sql
security definer
set search_path = public
as $$
  update public.local_spots
  set upvotes = upvotes + 1
  where id = p_spot_id
  returning *;
$$;

revoke all on function public.increment_local_spot_upvotes(uuid) from public;
grant execute on function public.increment_local_spot_upvotes(uuid) to anon, authenticated;
grant select on public.villages, public.local_spots to anon, authenticated;
grant insert on public.local_spots to anon, authenticated;
