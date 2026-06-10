-- ShutterPlan AI schema for Supabase
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'user' check (role in ('admin', 'user', 'guest')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'planning', 'in-progress', 'completed', 'archived')),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  location text,
  planned_time timestamptz,
  status text not null default 'planned' check (status in ('planned', 'taken', 'approved', 'rejected')),
  notes text not null default '',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists shots_set_updated_at on public.shots;
create trigger shots_set_updated_at
before update on public.shots
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.shots enable row level security;

-- Users can read/update only their own profile.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select to authenticated
using (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
for insert to authenticated
with check (auth.uid() = id);

-- Users can manage only their own projects.
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects
for delete to authenticated
using (auth.uid() = user_id);

-- Users can manage shots only for projects they own.
drop policy if exists shots_select_own on public.shots;
create policy shots_select_own on public.shots
for select to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = shots.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists shots_insert_own on public.shots;
create policy shots_insert_own on public.shots
for insert to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = shots.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists shots_update_own on public.shots;
create policy shots_update_own on public.shots
for update to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = shots.project_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = shots.project_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists shots_delete_own on public.shots;
create policy shots_delete_own on public.shots
for delete to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = shots.project_id
      and p.user_id = auth.uid()
  )
);
