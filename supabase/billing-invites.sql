-- ============================================================
-- FLOCK — BILLING & INVITES SCHEMA
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free', 'family')),
  status text not null default 'active' check (status in ('active','past_due','canceled','trialing')),
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(family_id)
);

alter table subscriptions enable row level security;

create policy "family can read own subscription" on subscriptions
  for select using (family_id = my_family_id());

create trigger subscriptions_updated_at before update on subscriptions
  for each row execute procedure update_updated_at();

-- Auto-create free subscription for new families
create or replace function create_free_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into subscriptions (family_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (family_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_family_created on families;
create trigger on_family_created
  after insert on families
  for each row execute procedure create_free_subscription();

-- ── INVITES ───────────────────────────────────────────────────
create table if not exists invites (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  invited_email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

alter table invites enable row level security;

-- Family admins can create/read invites for their family
create policy "admin can manage invites" on invites
  for all using (family_id = my_family_id());

-- Anyone can read an invite by token (for accept flow — no auth needed)
create policy "public can read invite by token" on invites
  for select using (true);

-- ── HELPER: get plan for current family ──────────────────────
create or replace function my_plan()
returns text language sql security definer as $$
  select s.plan from subscriptions s
  join profiles p on p.family_id = s.family_id
  where p.id = auth.uid()
  limit 1
$$;

-- ── REALTIME ──────────────────────────────────────────────────
alter publication supabase_realtime add table subscriptions;
