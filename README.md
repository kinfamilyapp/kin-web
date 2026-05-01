# Kin — Family Calendar App

A modern family calendar with real-time sync, AI assistant, chore tracking, and meal planning. No hardware required. Built to compete with Skylight.

---

## Quick Start (Demo Mode)

No accounts needed — just run it:

```bash
npm install
npm run dev
```

Opens at http://localhost:5173 with demo family data pre-loaded.

---

## Production Setup (2 steps)

### Step 1 — Supabase (real-time sync + auth)

1. Create a free project at https://supabase.com
2. Go to **SQL Editor** and paste the full contents of `supabase/schema.sql` — run it
3. Go to **Settings → API** and copy your Project URL and anon key
4. Create a `.env` file (copy from `.env.example`):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

That's it — all family members who sign up will sync in real-time across every device.

### Step 2 — AI Assistant (Claude)

1. Get an API key at https://console.anthropic.com
2. Add to your `.env`:

```
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> ⚠️ For production, move the Claude API call to a serverless function (Supabase Edge Function or Vercel) so the key is never in the browser.

---

## Features

| Feature | Works in demo | Works with Supabase |
|---|---|---|
| Shared family calendar | ✅ Local | ✅ Real-time across all devices |
| Month / week / day views | ✅ | ✅ |
| Color-coded family members | ✅ | ✅ |
| Add / edit / delete events | ✅ | ✅ Synced instantly |
| Chore tracker + star rewards | ✅ Local | ✅ Synced |
| Leaderboard | ✅ | ✅ |
| Weekly meal planner | ✅ Local | ✅ Synced |
| AI assistant (natural language) | ✅ (needs API key) | ✅ |
| Auth / multi-family | ❌ | ✅ |
| Sign in / sign up | ❌ | ✅ |

---

## Tech Stack

- **React + Vite** — frontend
- **date-fns** — date math
- **Supabase** — Postgres DB + real-time subscriptions + auth
- **Claude API** — AI assistant

## Project Structure

```
src/
  context/
    AppContext.jsx   — all state, Supabase CRUD, real-time subscriptions
    AuthContext.jsx  — Supabase auth (sign in, sign up, session)
  pages/
    CalendarPage.jsx — month/week/day calendar views
    ChoresPage.jsx   — chore tracker + leaderboard
    MealsPage.jsx    — weekly meal planner
    AIPage.jsx       — Claude-powered chat assistant
    AuthPage.jsx     — login / signup
  components/
    Sidebar.jsx      — nav, family members, sync status
    AddMemberModal.jsx
  lib/
    supabase.js      — Supabase client (gracefully disabled if no env vars)
supabase/
  schema.sql         — full DB schema with RLS policies
```

## Next Steps

- [ ] Invite family members via email link
- [ ] Google / Apple Calendar sync (OAuth)
- [ ] Push notifications (web push or Expo)
- [ ] Mobile app (React Native + Expo)
- [ ] Paid plan + Stripe billing
- [ ] Deploy to Vercel (zero config with Vite)

---

## Push Notifications Setup

### Step 1 — Generate VAPID keys (one time only)
```bash
node scripts/generate-vapid-keys.js
```
Copy the output into your `.env` and Supabase secrets.

### Step 2 — Run the SQL
Run `supabase/push-notifications.sql` in Supabase SQL Editor.

### Step 3 — Deploy the new edge functions
```bash
supabase functions deploy send-push
supabase functions deploy schedule-reminders
```

### Step 4 — Set Supabase secrets
```bash
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:you@yourdomain.com"
```

### Step 5 — Schedule the reminder cron job
In Supabase SQL Editor:
```sql
select cron.schedule(
  'event-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/schedule-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )
  $$
);
```

### How it works
- Users click "Enable notifications" in Settings → browser asks for permission
- Subscription stored in `push_subscriptions` table per device
- When anyone adds a family event → push sent to all family devices instantly
- Cron runs every 5 min → checks for events starting in 10/15/30/60 min → sends reminders
- Users control reminder timing and which notifications they want in Settings → Notifications

---

## Google Calendar Sync Setup

### Step 1 — Google Cloud Console
1. Go to https://console.cloud.google.com → Create project "Kin"
2. Enable **Google Calendar API**
3. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/functions/v1/google-oauth-callback`
4. Copy the Client ID and Client Secret

### Step 2 — Set secrets
```bash
supabase secrets set GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"
supabase secrets set APP_URL="https://yourapp.com"
```

Add to `.env`:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Step 3 — Run SQL + deploy functions
```bash
# SQL Editor: run supabase/google-calendar.sql
supabase functions deploy google-oauth-callback
supabase functions deploy google-sync-pull
supabase functions deploy google-sync-push
supabase functions deploy google-sync-watch
```

### Step 4 — Set up cron for 15-min polling
```sql
select cron.schedule(
  'google-sync',
  '*/15 * * * *',
  $$select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/google-sync-watch',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"action":"cron"}'::jsonb
  )$$
);
```

### How it works
- User clicks "Connect Google Calendar" in Settings → Google OAuth flow → tokens stored
- **Google → Kin**: Initial full sync, then incremental (delta only). Also receives webhook pushes from Google in real-time via push channels
- **Kin → Google**: Every new/deleted Kin event is pushed to Google instantly
- Bidirectional map in `google_event_map` prevents duplicate syncs
- Tokens auto-refresh — users never need to reconnect
