-- Adds volunteer signup storage used for Google Form sync.
-- Run in Supabase SQL Editor (public schema).

create extension if not exists "pgcrypto";

create table if not exists public.volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  email text not null,
  full_name text,
  source text not null default 'google_form',
  external_response_id text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.volunteer_signups
  add column if not exists full_name text;

alter table public.volunteer_signups
  add column if not exists source text;

alter table public.volunteer_signups
  add column if not exists external_response_id text;

alter table public.volunteer_signups
  add column if not exists signed_at timestamptz;

alter table public.volunteer_signups
  add column if not exists created_at timestamptz;

update public.volunteer_signups
set source = 'google_form'
where source is null or btrim(source) = '';

update public.volunteer_signups
set signed_at = coalesce(signed_at, now())
where signed_at is null;

update public.volunteer_signups
set created_at = coalesce(created_at, now())
where created_at is null;

alter table public.volunteer_signups
  alter column source set default 'google_form';

alter table public.volunteer_signups
  alter column source set not null;

alter table public.volunteer_signups
  alter column signed_at set default now();

alter table public.volunteer_signups
  alter column signed_at set not null;

alter table public.volunteer_signups
  alter column created_at set default now();

alter table public.volunteer_signups
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'volunteer_signups_opportunity_email_key'
      and conrelid = 'public.volunteer_signups'::regclass
  ) then
    alter table public.volunteer_signups
      add constraint volunteer_signups_opportunity_email_key unique (opportunity_id, email);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'volunteer_signups_external_response_id_key'
      and conrelid = 'public.volunteer_signups'::regclass
  ) then
    alter table public.volunteer_signups
      add constraint volunteer_signups_external_response_id_key unique (external_response_id);
  end if;
end $$;

alter table public.volunteer_signups enable row level security;

drop policy if exists volunteer_signups_public_select on public.volunteer_signups;
drop policy if exists volunteer_signups_admin_insert on public.volunteer_signups;
drop policy if exists volunteer_signups_admin_update on public.volunteer_signups;
drop policy if exists volunteer_signups_admin_delete on public.volunteer_signups;

create policy volunteer_signups_public_select
  on public.volunteer_signups for select
  to anon, authenticated
  using (true);

create policy volunteer_signups_admin_insert
  on public.volunteer_signups for insert
  to authenticated
  with check (public.is_admin());

create policy volunteer_signups_admin_update
  on public.volunteer_signups for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy volunteer_signups_admin_delete
  on public.volunteer_signups for delete
  to authenticated
  using (public.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.volunteer_signups to anon, authenticated;
grant select, insert, update, delete on table public.volunteer_signups to authenticated;

notify pgrst, 'reload schema';
