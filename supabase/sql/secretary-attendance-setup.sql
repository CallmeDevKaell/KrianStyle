-- Officer position assignment and Secretary attendance setup.
-- This migration has already been applied to the KrianStyle Website Supabase project.
-- Keep this file as a reference; do not re-run on the current project unless needed.

alter table public.profiles
  add column if not exists officer_position text;

alter table public.profiles
  drop constraint if exists profiles_officer_position_check;

alter table public.profiles
  add constraint profiles_officer_position_check
  check (
    officer_position is null
    or (
      role = 'officer'
      and officer_position in ('moderator', 'secretary', 'treasurer', 'auditor', 'editor_media')
    )
  );

create index if not exists profiles_officer_position_idx
  on public.profiles (officer_position);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  member_name text not null check (char_length(btrim(member_name)) between 2 and 120),
  attendance_date date not null,
  attendance_type text not null check (attendance_type in ('eyeball', 'meeting')),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists attendance_records_member_date_type_unique
  on public.attendance_records (lower(btrim(member_name)), attendance_date, attendance_type);

create index if not exists attendance_records_date_idx
  on public.attendance_records (attendance_date desc);

alter table public.attendance_records enable row level security;
revoke all on table public.attendance_records from anon, authenticated;
grant select, insert, update, delete on table public.attendance_records to authenticated;

drop policy if exists "Secretary can view attendance records" on public.attendance_records;
create policy "Secretary can view attendance records"
  on public.attendance_records for select to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'officer' and p.officer_position = 'secretary' and p.approval_status = 'approved'));

drop policy if exists "Secretary can record attendance" on public.attendance_records;
create policy "Secretary can record attendance"
  on public.attendance_records for insert to authenticated
  with check (recorded_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'officer' and p.officer_position = 'secretary' and p.approval_status = 'approved'));

drop policy if exists "Secretary can update attendance" on public.attendance_records;
create policy "Secretary can update attendance"
  on public.attendance_records for update to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'officer' and p.officer_position = 'secretary' and p.approval_status = 'approved'))
  with check (recorded_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'officer' and p.officer_position = 'secretary' and p.approval_status = 'approved'));

drop policy if exists "Secretary can delete attendance" on public.attendance_records;
create policy "Secretary can delete attendance"
  on public.attendance_records for delete to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.role = 'officer' and p.officer_position = 'secretary' and p.approval_status = 'approved'));
