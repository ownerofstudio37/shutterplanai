create table if not exists public.planner_beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id text not null,
  feedback_type text not null default 'other' check (
    feedback_type in ('planner-output', 'missing-location-details', 'guide-handoff', 'other')
  ),
  message text not null,
  contact_email text,
  plan_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.planner_beta_feedback enable row level security;

drop policy if exists planner_beta_feedback_select_own on public.planner_beta_feedback;
create policy planner_beta_feedback_select_own on public.planner_beta_feedback
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists planner_beta_feedback_insert_own on public.planner_beta_feedback;
create policy planner_beta_feedback_insert_own on public.planner_beta_feedback
for insert to authenticated
with check (auth.uid() = user_id);

create index if not exists planner_beta_feedback_user_created_idx
on public.planner_beta_feedback (user_id, created_at desc);
