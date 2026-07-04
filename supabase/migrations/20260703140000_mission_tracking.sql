create table if not exists public.mission_tracking (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.dispatch_missions(id) on delete cascade,
  vehicle_id uuid null references public.vehicles(id) on delete set null,

  latitude double precision not null,
  longitude double precision not null,
  speed double precision null,
  heading double precision null,
  accuracy double precision null,
  battery_level double precision null,
  is_moving boolean null,
  metadata jsonb not null default '{}'::jsonb,

  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.mission_tracking enable row level security;

create policy "Users can read organization mission tracking"
on public.mission_tracking
for select
using (organization_id = public.current_user_org_id());

create policy "Users can insert organization mission tracking"
on public.mission_tracking
for insert
with check (organization_id = public.current_user_org_id());

create index if not exists mission_tracking_org_mission_recorded_idx
on public.mission_tracking (organization_id, mission_id, recorded_at desc);

create index if not exists mission_tracking_vehicle_recorded_idx
on public.mission_tracking (vehicle_id, recorded_at desc);
