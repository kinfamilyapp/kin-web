-- ============================================================
-- FLOCK FAMILY CALENDAR — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- FAMILIES
-- ============================================================
create table if not exists families (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'My Family',
  created_at timestamptz default now()
);

-- ============================================================
-- PROFILES (linked to Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete set null,
  display_name text,
  email text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- MEMBERS (family members, not necessarily app users)
-- ============================================================
create table if not exists members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  initials text not null,
  color text not null default '#1D9E75',
  color_bg text not null default '#E1F5EE',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- EVENTS
-- ============================================================
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  date date not null,
  time time not null default '09:00',
  duration_minutes int not null default 60,
  member_id uuid references members(id) on delete set null,
  location text,
  notes text,
  color text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CHORES
-- ============================================================
create table if not exists chores (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  title text not null,
  member_id uuid references members(id) on delete set null,
  frequency text not null default 'daily' check (frequency in ('daily','weekly','monthly')),
  reward_stars int not null default 5,
  created_at timestamptz default now()
);

-- Chore completions (separate so we track history)
create table if not exists chore_completions (
  id uuid primary key default uuid_generate_v4(),
  chore_id uuid not null references chores(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  completed_date date not null default current_date,
  completed_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique(chore_id, completed_date)
);

-- ============================================================
-- MEALS
-- ============================================================
create table if not exists meals (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  breakfast text,
  lunch text,
  dinner text,
  snack text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(family_id, date)
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_updated_at before update on events
  for each row execute procedure update_updated_at();

create trigger meals_updated_at before update on meals
  for each row execute procedure update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table families enable row level security;
alter table profiles enable row level security;
alter table members enable row level security;
alter table events enable row level security;
alter table chores enable row level security;
alter table chore_completions enable row level security;
alter table meals enable row level security;

-- Helper: get current user's family_id
create or replace function my_family_id()
returns uuid language sql security definer as $$
  select family_id from profiles where id = auth.uid()
$$;

-- Families: members of a family can read/update it
create policy "family members can read" on families
  for select using (id = my_family_id());

create policy "family members can update" on families
  for update using (id = my_family_id());

-- Profiles: users can read profiles in their family
create policy "read own profile" on profiles
  for select using (id = auth.uid() or family_id = my_family_id());

create policy "update own profile" on profiles
  for update using (id = auth.uid());

-- Members: family can CRUD their own members
create policy "family members crud" on members
  for all using (family_id = my_family_id());

-- Events: family can CRUD their own events
create policy "family events crud" on events
  for all using (family_id = my_family_id());

-- Chores: family can CRUD their own chores
create policy "family chores crud" on chores
  for all using (family_id = my_family_id());

-- Chore completions
create policy "family completions crud" on chore_completions
  for all using (family_id = my_family_id());

-- Meals: family can CRUD their own meals
create policy "family meals crud" on meals
  for all using (family_id = my_family_id());

-- ============================================================
-- REALTIME (enable for live sync)
-- ============================================================
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table chores;
alter publication supabase_realtime add table chore_completions;
alter publication supabase_realtime add table meals;
alter publication supabase_realtime add table members;

-- ============================================================
-- DONE. Your Flock schema is ready!
-- ============================================================
