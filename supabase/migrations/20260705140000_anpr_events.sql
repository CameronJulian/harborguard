create table if not exists public.anpr_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id text null,
  plate_number text not null,
  vehicle_name text null,
  nickname text null,
  camera_name text null,
  provider text not null default 'mock',
  source text null,
  confidence numeric not null default 0,
  status text not null default 'review',
  watchlist_match boolean not null default false,
  detected_at timestamptz not null,
  location text null,
  recommended_action text null,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.anpr_events enable row level security;

create policy "Users can read organization anpr events"
on public.anpr_events
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization anpr events"
on public.anpr_events
for insert
with check (organization_id = public.current_user_org_id());

create index if not exists anpr_events_org_detected_idx
on public.anpr_events (organization_id, detected_at desc);

create index if not exists anpr_events_status_idx
on public.anpr_events (organization_id, status);

create index if not exists anpr_events_plate_idx
on public.anpr_events (organization_id, plate_number);
