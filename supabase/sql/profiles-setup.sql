-- Already applied to Supabase project KrianStyle Website.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  full_name text not null,
  unit_name text not null,
  unit text not null,
  age smallint not null check (age between 1 and 120),
  address text not null,
  gender text not null,
  contact_number text not null,
  role text not null default 'member'
    check (role in ('admin', 'president_vp', 'officer', 'member')),
  position text check (position is null or position in ('president', 'vice_president')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));
create index if not exists profiles_role_idx on public.profiles(role);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, unit_name, unit, age, address, gender, contact_number)
  on table public.profiles to authenticated;

drop policy if exists "Profiles: users can read their own profile" on public.profiles;
create policy "Profiles: users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Profiles: users can update their own profile" on public.profiles;
create policy "Profiles: users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_krian_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_age text;
begin
  v_age := new.raw_user_meta_data ->> 'age';

  -- Only create mobile member profiles when the complete KrianStyle metadata exists.
  -- Other website signups in this shared Supabase project are left untouched.
  if nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'username'), '') is null
     or nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), '') is null
     or nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'unit_name'), '') is null
     or nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'unit'), '') is null
     or nullif(pg_catalog.btrim(v_age), '') is null
     or v_age !~ '^[0-9]{1,3}$'
     or nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'address'), '') is null
     or nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'gender'), '') is null
     or nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'contact_number'), '') is null
  then
    return new;
  end if;

  insert into public.profiles (
    user_id, username, full_name, unit_name, unit, age,
    address, gender, contact_number, role
  )
  values (
    new.id,
    pg_catalog.lower(pg_catalog.btrim(new.raw_user_meta_data ->> 'username')),
    pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'),
    pg_catalog.btrim(new.raw_user_meta_data ->> 'unit_name'),
    pg_catalog.btrim(new.raw_user_meta_data ->> 'unit'),
    v_age::smallint,
    pg_catalog.btrim(new.raw_user_meta_data ->> 'address'),
    pg_catalog.btrim(new.raw_user_meta_data ->> 'gender'),
    pg_catalog.btrim(new.raw_user_meta_data ->> 'contact_number'),
    'member'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_krian_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_krian_profile on auth.users;
create trigger on_auth_user_created_krian_profile
  after insert on auth.users
  for each row execute function public.handle_new_krian_profile();
