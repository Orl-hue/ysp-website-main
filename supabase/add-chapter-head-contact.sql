-- Adds chapter_head_contact column to chapters for older projects.
-- Run in Supabase SQL Editor (public schema).

alter table public.chapters
  add column if not exists chapter_head_name text;

alter table public.chapters
  add column if not exists chapter_head_contact text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chapters'
      and column_name = 'chapter_head_email'
  ) then
    execute '
      update public.chapters
      set chapter_head_contact = coalesce(nullif(chapter_head_contact, ''''), chapter_head_email)
      where chapter_head_contact is null or chapter_head_contact = ''''
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chapters'
      and column_name = 'chapter_head_phone'
  ) then
    execute '
      update public.chapters
      set chapter_head_contact = coalesce(nullif(chapter_head_contact, ''''), chapter_head_phone)
      where chapter_head_contact is null or chapter_head_contact = ''''
    ';
  end if;
end $$;

notify pgrst, 'reload schema';
