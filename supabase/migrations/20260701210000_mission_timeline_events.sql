create table if not exists public.mission_timeline_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.dispatch_missions(id) on delete cascade,
  event_type text not null,
  title text not null,
  detail text null,
  actor_id uuid null references public.profiles(id) on delete set null,
  source text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.mission_timeline_events enable row level security;

create policy "Users can read organization mission timeline events"
on public.mission_timeline_events
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization mission timeline events"
on public.mission_timeline_events
for insert
with check (organization_id = public.current_user_org_id());

create index if not exists mission_timeline_events_org_mission_idx
on public.mission_timeline_events (organization_id, mission_id, created_at desc);

create index if not exists mission_timeline_events_type_idx
on public.mission_timeline_events (event_type);
