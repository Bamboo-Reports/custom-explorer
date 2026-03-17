-- Run this script in Supabase SQL Editor.
-- It sets up profile names + private user report mapping + storage access.

-- 1) Profiles table (optional durable source for full_name)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2) User reports table (one active report per user expected by app)
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  file_path text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_reports_user_id_active
  on public.user_reports(user_id, is_active);

alter table public.user_reports enable row level security;

drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own"
  on public.user_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_reports_insert_service_only" on public.user_reports;
create policy "user_reports_insert_service_only"
  on public.user_reports
  for insert
  to authenticated
  with check (false);

drop policy if exists "user_reports_update_service_only" on public.user_reports;
create policy "user_reports_update_service_only"
  on public.user_reports
  for update
  to authenticated
  using (false)
  with check (false);

-- 3) Private bucket for reports
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- 4) Storage policies:
--    Keep writes admin-only (service role).
--    Reads allowed for all authenticated users in the reports bucket.

drop policy if exists "reports_read_own_mapped_file" on storage.objects;
drop policy if exists "reports_read_all_authenticated" on storage.objects;
create policy "reports_read_all_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'reports'
  );

drop policy if exists "reports_write_block_authenticated" on storage.objects;
create policy "reports_write_block_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (false);

drop policy if exists "reports_update_block_authenticated" on storage.objects;
create policy "reports_update_block_authenticated"
  on storage.objects
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "reports_delete_block_authenticated" on storage.objects;
create policy "reports_delete_block_authenticated"
  on storage.objects
  for delete
  to authenticated
  using (false);
