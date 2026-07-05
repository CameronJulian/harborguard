create table if not exists public.cctv_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  camera_name text not null,
  provider text not null default 'mock',
  vendor text null,
  location text null,
  linked_vehicle_id text null,
  linked_vehicle text null,
  status text not null default 'online',
  recording boolean not null default false,
  motion_detected boolean not null default false,
  ai_event_count integer not null default 0,
  person_count integer not null default 0,
  vehicle_count integer not null default 0,
  latency_ms integer null,
  last_frame_at timestamptz null,
  last_event text null,
  recommended_action text null,
  raw_response jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.cctv_events enable row level security;

create policy "Users can read organization cctv events"
on public.cctv_events
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization cctv events"
on public.cctv_events
for insert
with check (organization_id = public.current_user_org_id());

create index if not exists cctv_events_org_captured_idx
on public.cctv_events (organization_id, captured_at desc);

create index if not exists cctv_events_status_idx
on public.cctv_events (organization_id, status, recording);
