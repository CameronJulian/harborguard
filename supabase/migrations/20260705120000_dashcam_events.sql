create table if not exists public.dashcam_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id text null,
  vehicle_name text null,
  camera_name text null,
  provider text not null default 'mock',
  vendor text null,
  status text not null default 'online',
  recording boolean not null default false,
  storage_used_percent numeric not null default 0,
  last_heartbeat timestamptz null,
  last_clip_at timestamptz null,
  latest_clip_label text null,
  ai_events jsonb not null default '[]'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.dashcam_events enable row level security;

create policy "Users can read organization dashcam events"
on public.dashcam_events
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization dashcam events"
on public.dashcam_events
for insert
with check (organization_id = public.current_user_org_id());

create index if not exists dashcam_events_org_captured_idx
on public.dashcam_events (organization_id, captured_at desc);

create index if not exists dashcam_events_status_idx
on public.dashcam_events (organization_id, status, recording);
