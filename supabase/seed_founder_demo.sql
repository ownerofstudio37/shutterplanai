-- Founder demo seed: run after creating demo@shutterplan.ai in Supabase auth.
-- Replace the UUID if your demo auth user has a different id.

insert into public.users (id, email, name, role)
values ('00000000-0000-4000-8000-000000000037', 'demo@shutterplan.ai', 'Studio 37 Demo', 'user')
on conflict (id) do update
set email = excluded.email,
    name = excluded.name,
    updated_at = now();

insert into public.projects (id, user_id, title, description, status, start_date, tags)
values (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000037',
  'Dawson Family Golden Hour',
  'Founder-demo family session showing candidate discovery, final route selection, micro-spots, and client guide handoff.',
  'planning',
  now() + interval '2 days',
  array['founder-demo', 'family', 'golden-hour']
)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    start_date = excluded.start_date,
    tags = excluded.tags,
    updated_at = now();

insert into public.shots (project_id, title, description, location, planned_time, status, notes)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'Arrival Warmup',
    'Kids walking with parents from the south parking lot to reset nerves before hero frames.',
    'Unity Park south trailhead',
    now() + interval '2 days 30 minutes',
    'planned',
    'Show the exact parking anchor and restroom note in the first 30 seconds.'
  ),
  (
    '00000000-0000-4000-8000-000000000101',
    'Oak Tree Hero Portrait',
    'Full family portrait under open shade with clean background separation.',
    'Unity Park heritage oak',
    now() + interval '2 days 45 minutes',
    'planned',
    'Demo micro-spot editing, walking order, and backup shade option.'
  ),
  (
    '00000000-0000-4000-8000-000000000101',
    'Golden Field Closing Set',
    'Movement prompts and parent portraits at the field edge during final light.',
    'West meadow edge',
    now() + interval '2 days 70 minutes',
    'planned',
    'End demo by exporting the client guide.'
  );
