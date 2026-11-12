-- Applied to the KrianStyle Website Supabase project.
-- This supports President/VP-created Officer accounts and President approval.
alter table public.profiles
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('approved', 'pending', 'rejected')),
  add column if not exists requested_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

create index if not exists profiles_approval_status_idx
  on public.profiles (approval_status);

create index if not exists profiles_requested_by_idx
  on public.profiles (requested_by);
