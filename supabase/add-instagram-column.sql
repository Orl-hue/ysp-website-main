-- Run in Supabase SQL Editor to fix contact_details schema mismatch.

alter table if exists public.contact_details
add column if not exists location text not null default '';

alter table if exists public.contact_details
add column if not exists instagram text not null default '';

update public.contact_details
set location = ''
where location is null;

update public.contact_details
set instagram = ''
where instagram is null;

-- Refresh PostgREST schema cache immediately.
notify pgrst, 'reload schema';

