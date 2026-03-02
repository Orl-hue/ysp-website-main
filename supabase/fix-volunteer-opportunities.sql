create extension if not exists "pgcrypto";

create table if not exists public.volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_date date not null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  sdgs text[] not null default '{}',
  chapter_head_contact text not null,
  volunteer_limit integer,
  constraint volunteer_opportunities_volunteer_limit_check
    check (volunteer_limit is null or volunteer_limit > 0),
  created_at timestamptz not null default now()
);

alter table public.volunteer_opportunities
  add column if not exists volunteer_limit integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'volunteer_opportunities_volunteer_limit_check'
      and conrelid = 'public.volunteer_opportunities'::regclass
  ) then
    alter table public.volunteer_opportunities
      add constraint volunteer_opportunities_volunteer_limit_check
      check (volunteer_limit is null or volunteer_limit > 0)
      not valid;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'opportunities'
  ) then
    insert into public.volunteer_opportunities (
      id,
      event_name,
      event_date,
      chapter_id,
      sdgs,
      chapter_head_contact,
      created_at
    )
    select
      o.id,
      o.event_name,
      o.date,
      o.chapter_id,
      coalesce(o.sdgs_impacted, '{}'::text[]),
      coalesce(
        nullif(o.contact_email, ''),
        nullif(o.contact_phone, ''),
        nullif(o.contact_name, ''),
        'Not provided'
      ),
      coalesce(o.created_at, now())
    from public.opportunities o
    on conflict (id) do update
      set
        event_name = excluded.event_name,
        event_date = excluded.event_date,
        chapter_id = excluded.chapter_id,
        sdgs = excluded.sdgs,
        chapter_head_contact = excluded.chapter_head_contact;
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'admin'
  );
$$;

create or replace function public.is_chapter_head()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'chapter_head'
  );
$$;

create or replace function public.current_user_chapter_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select chapter_id
  from public.profiles
  where id = auth.uid();
$$;

alter table public.volunteer_opportunities enable row level security;

drop policy if exists volunteer_opportunities_public_select on public.volunteer_opportunities;
drop policy if exists volunteer_opportunities_admin_insert on public.volunteer_opportunities;
drop policy if exists volunteer_opportunities_admin_update on public.volunteer_opportunities;
drop policy if exists volunteer_opportunities_admin_delete on public.volunteer_opportunities;
drop policy if exists volunteer_opportunities_chapter_head_insert on public.volunteer_opportunities;
drop policy if exists volunteer_opportunities_chapter_head_update on public.volunteer_opportunities;
drop policy if exists volunteer_opportunities_chapter_head_delete on public.volunteer_opportunities;

create policy volunteer_opportunities_public_select
  on public.volunteer_opportunities for select
  to anon, authenticated
  using (true);

create policy volunteer_opportunities_admin_insert
  on public.volunteer_opportunities for insert
  to authenticated
  with check (public.is_admin());

create policy volunteer_opportunities_admin_update
  on public.volunteer_opportunities for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy volunteer_opportunities_admin_delete
  on public.volunteer_opportunities for delete
  to authenticated
  using (public.is_admin());

create policy volunteer_opportunities_chapter_head_insert
  on public.volunteer_opportunities for insert
  to authenticated
  with check (
    public.is_chapter_head()
    and chapter_id = public.current_user_chapter_id()
  );

create policy volunteer_opportunities_chapter_head_update
  on public.volunteer_opportunities for update
  to authenticated
  using (
    public.is_chapter_head()
    and chapter_id = public.current_user_chapter_id()
  )
  with check (
    public.is_chapter_head()
    and chapter_id = public.current_user_chapter_id()
  );

create policy volunteer_opportunities_chapter_head_delete
  on public.volunteer_opportunities for delete
  to authenticated
  using (
    public.is_chapter_head()
    and chapter_id = public.current_user_chapter_id()
  );

grant usage on schema public to anon, authenticated, service_role;

grant select on table public.volunteer_opportunities to anon, authenticated;

grant select, insert, update, delete on table public.volunteer_opportunities to authenticated;

notify pgrst, 'reload schema';
