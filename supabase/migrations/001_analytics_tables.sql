-- ============================================================
-- HabitQuest Analytics Tables
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. user_activity: one row per user, upserted on each app open
create table if not exists public.user_activity (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_activity enable row level security;

create policy "Users can read own activity"
  on public.user_activity for select
  using (auth.uid() = user_id);

create policy "Users can upsert own activity"
  on public.user_activity for insert
  with check (auth.uid() = user_id);

create policy "Users can update own activity"
  on public.user_activity for update
  using (auth.uid() = user_id);

-- Index for the Edge Function query (inactive users)
create index if not exists idx_user_activity_last_seen
  on public.user_activity (last_seen_at);

-- 2. notification_events: append-only log
create table if not exists public.notification_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event      text not null check (event in ('scheduled', 'opened', 'sent')),
  tag        text not null,
  created_at timestamptz not null default now()
);

alter table public.notification_events enable row level security;

create policy "Users can read own notification events"
  on public.notification_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification events"
  on public.notification_events for insert
  with check (auth.uid() = user_id);

-- Indexes for analytics queries
create index if not exists idx_notif_events_user_created
  on public.notification_events (user_id, created_at);

create index if not exists idx_notif_events_event_tag
  on public.notification_events (event, tag);

-- 3. Service-role policy for Edge Function (bypasses RLS by default,
--    but if you want explicit policies for the service role:)
-- The Edge Function uses supabaseClient with service_role key,
-- which bypasses RLS. No extra policy needed.

-- ============================================================
-- OPTIONAL: pg_cron schedule for the Edge Function
-- Run this AFTER deploying the Edge Function.
-- Requires pg_cron and pg_net extensions enabled in Supabase.
--
-- Enable extensions (run once):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--
-- Schedule daily at 06:00 UTC (09:00 Istanbul):
--   select cron.schedule(
--     'send-inactive-push',
--     '0 6 * * *',
--     $$
--     select net.http_post(
--       url := 'https://xffqvpvqzxlgnuqpleyr.supabase.co/functions/v1/send-inactive-push',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--     $$
--   );
-- ============================================================
