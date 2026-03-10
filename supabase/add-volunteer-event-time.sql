-- Adds event_time column for volunteer opportunities.
-- Run in Supabase SQL Editor (public schema).

alter table public.volunteer_opportunities
  add column if not exists event_time text;

notify pgrst, 'reload schema';
