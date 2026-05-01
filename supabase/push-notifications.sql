-- ============================================================
-- FLOCK — PUSH NOTIFICATIONS SCHEMA
-- Run in Supabase SQL Editor after billing-invites.sql
-- ============================================================

-- ── PUSH SUBSCRIPTIONS ───────────────────────────────────────
-- Stores each device's Web Push subscription object
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_name text,           -- "iPhone Safari", "Chrome on Desktop"
  created_at timestamptz default now(),
  last_used_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "user manages own subscriptions" on push_subscriptions
  for all using (user_id = auth.uid());

-- ── EVENT REMINDERS ──────────────────────────────────────────
-- Tracks which reminders have been sent so we don't double-send
create table if not exists push_reminders_sent (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  reminder_minutes int not null,  -- how many minutes before the event
  sent_at timestamptz default now(),
  unique(event_id, reminder_minutes)
);

alter table push_reminders_sent enable row level security;

create policy "family can read reminders" on push_reminders_sent
  for select using (family_id = my_family_id());

-- ── NOTIFICATION PREFERENCES ──────────────────────────────────
create table if not exists notification_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  reminders_enabled boolean default true,
  reminder_minutes int default 30,   -- notify X min before event
  chore_reminders boolean default true,
  new_events boolean default true,   -- notify family when someone adds event
  daily_digest boolean default false,
  digest_time time default '08:00',
  updated_at timestamptz default now()
);

alter table notification_preferences enable row level security;

create policy "user manages own prefs" on notification_preferences
  for all using (user_id = auth.uid());

-- Auto-create prefs for new users
create or replace function create_notification_prefs()
returns trigger language plpgsql security definer as $$
begin
  insert into notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created on profiles;
create trigger on_profile_created
  after insert on profiles
  for each row execute procedure create_notification_prefs();
