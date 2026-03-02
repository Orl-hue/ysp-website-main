-- Supabase Auth/Profile fix for YSP admin/chapter-head login
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('admin', 'chapter_head', 'member', 'volunteer');
exception
  when duplicate_object then null;
end
$$;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'member',
  full_name text,
  email text unique,
  chapter_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Set role by email (edit these lists to your real emails, then run).
update public.profiles p
set role = 'admin'::public.user_role
from auth.users u
where u.id = p.id
  and lower(coalesce(u.email, '')) in (
    'admin@ysp.ph'
  );

update public.profiles p
set role = 'chapter_head'::public.user_role
from auth.users u
where u.id = p.id
  and lower(coalesce(u.email, '')) in (
    'chapterhead@ysp.ph'
  );

-- Verify mapped roles.
select
  u.email,
  p.role,
  p.updated_at
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at desc;

