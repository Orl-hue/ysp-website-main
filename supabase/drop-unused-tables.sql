-- Drop legacy/unused tables for the current YSP app.
-- Run in Supabase SQL Editor (public schema).

drop table if exists public.volunteer_applications cascade;
drop table if exists public.membership_applications cascade;
drop table if exists public.chapter_applications cascade;
drop table if exists public.opportunities cascade;
drop table if exists public.ysp_data cascade;
