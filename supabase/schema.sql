create extension if not exists "pgcrypto";

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  chapter_head_name text,
  chapter_head_contact text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'chapter_head')),
  chapter_id uuid references chapters(id),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_chapter_head_requires_chapter'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_chapter_head_requires_chapter
      check (role <> 'chapter_head' or chapter_id is not null)
      not valid;
  end if;
end $$;

create table if not exists site_stats (
  id uuid primary key default gen_random_uuid(),
  projects_count integer not null default 0,
  chapters_count integer not null default 0,
  members_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists site_stats_single_row_idx on site_stats ((true));

create table if not exists contact_details (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  facebook_url text not null,
  mobile text not null,
  location text not null default 'Philippines Nationwide',
  updated_at timestamptz not null default now()
);

-- Legacy compatibility: older schema used contact_details.facebook
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contact_details'
      and column_name = 'facebook'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contact_details'
      and column_name = 'facebook_url'
  ) then
    alter table public.contact_details
      rename column facebook to facebook_url;
  end if;
end $$;

alter table public.contact_details
  add column if not exists facebook_url text;

alter table public.contact_details
  add column if not exists location text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contact_details'
      and column_name = 'facebook'
  ) then
    execute '
      update public.contact_details
      set facebook_url = coalesce(nullif(facebook_url, ''''), facebook)
      where facebook_url is null or facebook_url = ''''
    ';
  end if;

  update public.contact_details
  set facebook_url = 'https://www.facebook.com/YOUTHSERVICEPHILIPPINES'
  where facebook_url is null or facebook_url = '';

  update public.contact_details
  set location = 'Philippines Nationwide'
  where location is null or location = '';
end $$;

alter table public.contact_details
  alter column facebook_url set not null;

alter table public.contact_details
  alter column location set not null;

create unique index if not exists contact_details_single_row_idx on contact_details ((true));

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_date date not null,
  chapter_id uuid not null references chapters(id) on delete cascade,
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

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_site_stats_updated_at on site_stats;
create trigger set_site_stats_updated_at
before update on site_stats
for each row execute function set_updated_at();

drop trigger if exists set_contact_details_updated_at on contact_details;
create trigger set_contact_details_updated_at
before update on contact_details
for each row execute function set_updated_at();

insert into site_stats (projects_count, chapters_count, members_count)
select 0, 0, 0
where not exists (select 1 from site_stats);

insert into contact_details (email, facebook_url, mobile, location)
select
  'phyouthservice@gmail.com',
  'https://www.facebook.com/YOUTHSERVICEPHILIPPINES',
  '09177798413',
  'Philippines Nationwide'
where not exists (select 1 from contact_details);

create or replace function is_admin()
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
      and role = 'admin'
  );
$$;

create or replace function is_chapter_head()
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
      and role = 'chapter_head'
  );
$$;

create or replace function current_user_chapter_id()
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

alter table profiles enable row level security;
alter table site_stats enable row level security;
alter table contact_details enable row level security;
alter table programs enable row level security;
alter table chapters enable row level security;
alter table volunteer_opportunities enable row level security;

drop policy if exists profiles_select_self_or_admin on profiles;
drop policy if exists profiles_admin_insert on profiles;
drop policy if exists profiles_admin_update on profiles;
drop policy if exists profiles_admin_delete on profiles;

drop policy if exists site_stats_public_select on site_stats;
drop policy if exists site_stats_admin_insert on site_stats;
drop policy if exists site_stats_admin_update on site_stats;
drop policy if exists site_stats_admin_delete on site_stats;

drop policy if exists contact_details_public_select on contact_details;
drop policy if exists contact_details_admin_insert on contact_details;
drop policy if exists contact_details_admin_update on contact_details;
drop policy if exists contact_details_admin_delete on contact_details;

drop policy if exists programs_public_select on programs;
drop policy if exists programs_admin_insert on programs;
drop policy if exists programs_admin_update on programs;
drop policy if exists programs_admin_delete on programs;

drop policy if exists chapters_public_select on chapters;
drop policy if exists chapters_admin_insert on chapters;
drop policy if exists chapters_admin_update on chapters;
drop policy if exists chapters_admin_delete on chapters;

drop policy if exists volunteer_opportunities_public_select on volunteer_opportunities;
drop policy if exists volunteer_opportunities_admin_insert on volunteer_opportunities;
drop policy if exists volunteer_opportunities_admin_update on volunteer_opportunities;
drop policy if exists volunteer_opportunities_admin_delete on volunteer_opportunities;
drop policy if exists volunteer_opportunities_chapter_head_insert on volunteer_opportunities;
drop policy if exists volunteer_opportunities_chapter_head_update on volunteer_opportunities;
drop policy if exists volunteer_opportunities_chapter_head_delete on volunteer_opportunities;

create policy profiles_select_self_or_admin
  on profiles for select
  to authenticated
  using (auth.uid() = id or is_admin());

create policy profiles_admin_insert
  on profiles for insert
  to authenticated
  with check (is_admin());

create policy profiles_admin_update
  on profiles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy profiles_admin_delete
  on profiles for delete
  to authenticated
  using (is_admin());

create policy site_stats_public_select
  on site_stats for select
  to anon, authenticated
  using (true);

create policy site_stats_admin_insert
  on site_stats for insert
  to authenticated
  with check (is_admin());

create policy site_stats_admin_update
  on site_stats for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy site_stats_admin_delete
  on site_stats for delete
  to authenticated
  using (is_admin());

create policy contact_details_public_select
  on contact_details for select
  to anon, authenticated
  using (true);

create policy contact_details_admin_insert
  on contact_details for insert
  to authenticated
  with check (is_admin());

create policy contact_details_admin_update
  on contact_details for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy contact_details_admin_delete
  on contact_details for delete
  to authenticated
  using (is_admin());

create policy programs_public_select
  on programs for select
  to anon, authenticated
  using (true);

create policy programs_admin_insert
  on programs for insert
  to authenticated
  with check (is_admin());

create policy programs_admin_update
  on programs for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy programs_admin_delete
  on programs for delete
  to authenticated
  using (is_admin());

create policy chapters_public_select
  on chapters for select
  to anon, authenticated
  using (true);

create policy chapters_admin_insert
  on chapters for insert
  to authenticated
  with check (is_admin());

create policy chapters_admin_update
  on chapters for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy chapters_admin_delete
  on chapters for delete
  to authenticated
  using (is_admin());

create policy volunteer_opportunities_public_select
  on volunteer_opportunities for select
  to anon, authenticated
  using (true);

create policy volunteer_opportunities_admin_insert
  on volunteer_opportunities for insert
  to authenticated
  with check (is_admin());

create policy volunteer_opportunities_admin_update
  on volunteer_opportunities for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy volunteer_opportunities_admin_delete
  on volunteer_opportunities for delete
  to authenticated
  using (is_admin());

create policy volunteer_opportunities_chapter_head_insert
  on volunteer_opportunities for insert
  to authenticated
  with check (
    is_chapter_head()
    and chapter_id = current_user_chapter_id()
  );

create policy volunteer_opportunities_chapter_head_update
  on volunteer_opportunities for update
  to authenticated
  using (
    is_chapter_head()
    and chapter_id = current_user_chapter_id()
  )
  with check (
    is_chapter_head()
    and chapter_id = current_user_chapter_id()
  );

create policy volunteer_opportunities_chapter_head_delete
  on volunteer_opportunities for delete
  to authenticated
  using (
    is_chapter_head()
    and chapter_id = current_user_chapter_id()
  );

grant usage on schema public to anon, authenticated, service_role;

grant select on table
  public.programs,
  public.chapters,
  public.volunteer_opportunities,
  public.site_stats,
  public.contact_details
to anon, authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.programs,
  public.chapters,
  public.volunteer_opportunities,
  public.site_stats,
  public.contact_details
to authenticated;

notify pgrst, 'reload schema';

