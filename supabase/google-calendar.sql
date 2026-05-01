-- ============================================================
-- FLOCK — GOOGLE CALENDAR SYNC SCHEMA
-- Run in Supabase SQL Editor after push-notifications.sql
-- ============================================================

-- ── GOOGLE OAUTH TOKENS ──────────────────────────────────────
-- Stores each user's Google OAuth tokens (encrypted at rest by Postgres)
create table if not exists google_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  family_id uuid not null references families(id) on delete cascade,
  google_email text not null,
  access_token text not null,          -- short-lived, refresh to get new one
  refresh_token text not null,         -- long-lived, store securely
  token_expires_at timestamptz not null,
  calendars_selected jsonb default '[]'::jsonb,  -- array of calendar IDs to sync
  sync_enabled boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table google_connections enable row level security;

create policy "user manages own google connection" on google_connections
  for all using (user_id = auth.uid());

create trigger google_connections_updated_at before update on google_connections
  for each row execute procedure update_updated_at();

-- ── SYNC STATE ───────────────────────────────────────────────
-- Tracks incremental sync tokens so we only fetch changes
create table if not exists google_sync_state (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  calendar_id text not null,           -- Google calendar ID
  sync_token text,                     -- Google's incremental sync token
  channel_id text,                     -- webhook channel ID
  channel_expiry timestamptz,          -- when the webhook channel expires
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, calendar_id)
);

alter table google_sync_state enable row level security;

create policy "user manages own sync state" on google_sync_state
  for all using (user_id = auth.uid());

create trigger google_sync_state_updated_at before update on google_sync_state
  for each row execute procedure update_updated_at();

-- ── SYNCED EVENTS MAPPING ─────────────────────────────────────
-- Maps Flock event IDs ↔ Google event IDs to avoid duplicates
create table if not exists google_event_map (
  id uuid primary key default uuid_generate_v4(),
  flock_event_id uuid references events(id) on delete cascade,
  google_event_id text not null,
  calendar_id text not null,
  user_id uuid not null references profiles(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  direction text not null check (direction in ('google_to_flock', 'flock_to_google', 'both')),
  last_synced_at timestamptz default now(),
  unique(google_event_id, calendar_id, user_id)
);

alter table google_event_map enable row level security;

create policy "user manages own event map" on google_event_map
  for all using (user_id = auth.uid());

-- ── REALTIME ──────────────────────────────────────────────────
alter publication supabase_realtime add table google_connections;
