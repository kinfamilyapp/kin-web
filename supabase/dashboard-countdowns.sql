-- ============================================================
-- FLOCK/KIN — DASHBOARD & COUNTDOWNS MIGRATION
-- Run in Supabase SQL Editor
-- ============================================================

-- Add countdown flag to events table
alter table events
  add column if not exists countdown boolean default false;

-- Index for fast dashboard queries
create index if not exists events_date_idx on events(date);
create index if not exists events_family_date_idx on events(family_id, date);
