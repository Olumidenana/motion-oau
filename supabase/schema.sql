-- Motion — Supabase schema
-- Paste this whole file into Supabase → SQL editor → New query, and run it.
-- Safe to run again: it uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Runner'
    check (char_length(btrim(display_name)) between 1 and 40),
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  route_slug text not null check (route_slug ~ '^[a-z0-9-]{1,60}$'),
  host_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  pace text not null check (pace in ('walk', 'easy', 'steady', 'fast')),
  max_people int not null check (max_people between 2 and 50),
  meeting_note text check (meeting_note is null or char_length(meeting_note) <= 200),
  women_only boolean not null default false,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists runs_starts_at_idx on public.runs (starts_at) where status = 'scheduled';
create index if not exists runs_route_idx on public.runs (route_slug, starts_at);

create table if not exists public.run_participants (
  run_id uuid not null references public.runs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (run_id, user_id)
);

create index if not exists run_participants_user_idx on public.run_participants (user_id);

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  feature text not null check (feature ~ '^[a-z0-9-]{2,40}$'),
  user_id uuid references auth.users (id) on delete set null,
  contact text check (contact is null or char_length(contact) <= 120),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: created automatically when someone signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed up before this script ran.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Runs: sanity checks, and the host automatically joins their own run
-- ---------------------------------------------------------------------------

create or replace function public.check_run_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.starts_at < now() then
      raise exception 'That time has already passed. Pick a time in the future.' using errcode = 'P0001';
    end if;
    if new.starts_at > now() + interval '60 days' then
      raise exception 'You can schedule runs up to 60 days ahead.' using errcode = 'P0001';
    end if;
    new.status := 'scheduled';
  else
    if new.host_id <> old.host_id or new.route_slug <> old.route_slug then
      raise exception 'A run’s host and route can’t be changed.' using errcode = 'P0001';
    end if;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'A cancelled run can’t be restarted. Schedule a new one instead.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists runs_check_write on public.runs;
create trigger runs_check_write
  before insert or update on public.runs
  for each row execute function public.check_run_write();

create or replace function public.add_host_as_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.run_participants (run_id, user_id) values (new.id, new.host_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists runs_add_host on public.runs;
create trigger runs_add_host
  after insert on public.runs
  for each row execute function public.add_host_as_participant();

-- ---------------------------------------------------------------------------
-- Joining: block when the run is full, cancelled or already over.
-- Security definer so it can count every participant (RLS hides other people's
-- rows from the joining user). The FOR UPDATE lock stops two people grabbing
-- the last place at the same moment.
-- ---------------------------------------------------------------------------

create or replace function public.check_run_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.runs%rowtype;
  going int;
begin
  select * into r from public.runs where id = new.run_id for update;
  if not found then
    raise exception 'We couldn’t find that run. It may have been removed.' using errcode = 'P0002';
  end if;
  if r.status = 'cancelled' then
    raise exception 'This run has been cancelled, so you can’t join it.' using errcode = 'P0001';
  end if;
  -- Keep the 30 minutes in sync with RUN_GRACE_MS in lib/store/types.ts.
  if r.starts_at < now() - interval '30 minutes' then
    raise exception 'This run has already started, so you can’t join it any more.' using errcode = 'P0001';
  end if;
  select count(*) into going from public.run_participants where run_id = new.run_id;
  if going >= r.max_people then
    raise exception 'This run is full. Check other runs on this route, or schedule your own.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists run_participants_check_join on public.run_participants;
create trigger run_participants_check_join
  before insert on public.run_participants
  for each row execute function public.check_run_join();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.runs enable row level security;
alter table public.run_participants enable row level security;
alter table public.waitlist enable row level security;

-- profiles: you see and edit only your own row. Other people's names reach the
-- app only through the run_feed / run_roster views, which respect is_private.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- runs: everyone can read; only the host can create and update their runs.
drop policy if exists "runs: read all" on public.runs;
create policy "runs: read all" on public.runs
  for select to anon, authenticated using (true);

drop policy if exists "runs: host inserts" on public.runs;
create policy "runs: host inserts" on public.runs
  for insert to authenticated with check (host_id = auth.uid());

drop policy if exists "runs: host updates" on public.runs;
create policy "runs: host updates" on public.runs
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

-- run_participants: you see, add and remove only your own rows.
-- The host can't leave their own run (they cancel it instead).
drop policy if exists "participants: read own" on public.run_participants;
create policy "participants: read own" on public.run_participants
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "participants: join as self" on public.run_participants;
create policy "participants: join as self" on public.run_participants
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "participants: leave as self" on public.run_participants;
create policy "participants: leave as self" on public.run_participants
  for delete to authenticated using (
    user_id = auth.uid()
    and not exists (select 1 from public.runs r where r.id = run_id and r.host_id = auth.uid())
  );

-- waitlist: insert only. Nobody can read it through the API; view it in the
-- Supabase dashboard (Table editor → waitlist).
drop policy if exists "waitlist: insert" on public.waitlist;
create policy "waitlist: insert" on public.waitlist
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Views
-- These run with the owner's rights (not security_invoker), so they can read
-- names and counts without opening up the profiles or participants tables.
-- Private profiles come back with null names (shown as "A runner") unless the
-- viewer is that person.
-- ---------------------------------------------------------------------------

create or replace view public.run_feed as
select
  r.id,
  r.route_slug,
  r.host_id,
  case
    when coalesce(p.is_private, true) and r.host_id is distinct from auth.uid() then null
    else p.display_name
  end as host_name,
  r.starts_at,
  r.pace,
  r.max_people,
  r.meeting_note,
  r.women_only,
  r.status,
  (select count(*) from public.run_participants rp where rp.run_id = r.id)::int as going_count,
  r.created_at
from public.runs r
left join public.profiles p on p.id = r.host_id;

create or replace view public.run_roster as
select
  rp.run_id,
  case
    when coalesce(p.is_private, true) and rp.user_id is distinct from auth.uid() then null
    else rp.user_id
  end as user_id,
  case
    when coalesce(p.is_private, true) and rp.user_id is distinct from auth.uid() then null
    else p.display_name
  end as display_name,
  coalesce(rp.user_id = auth.uid(), false) as is_viewer,
  (rp.user_id = r.host_id) as is_host,
  rp.joined_at
from public.run_participants rp
join public.runs r on r.id = rp.run_id
left join public.profiles p on p.id = rp.user_id;

revoke all on public.run_feed, public.run_roster from anon, authenticated;
grant select on public.run_feed, public.run_roster to anon, authenticated;

-- Tighten table grants to exactly what the app needs (RLS still applies on top).
revoke all on public.profiles, public.runs, public.run_participants, public.waitlist from anon, authenticated;
grant select on public.runs to anon, authenticated;
grant insert on public.waitlist to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, is_private) on public.profiles to authenticated;
grant insert on public.runs to authenticated;
grant update (status, meeting_note) on public.runs to authenticated;
grant select, insert, delete on public.run_participants to authenticated;
