create table if not exists public.route_prediction_snapshots (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  vehicle_id uuid
    references public.vehicles(id)
    on delete set null,

  trip_id uuid
    references public.vehicle_trips(id)
    on delete set null,

  origin_latitude double precision not null,
  origin_longitude double precision not null,
  destination_latitude double precision not null,
  destination_longitude double precision not null,

  overall_risk_score integer not null,
  overall_risk_level text not null,

  threat_risk_score integer not null,
  threat_risk_level text not null,

  weather_risk_score integer not null,

  traffic_risk_score integer not null,
  traffic_risk_level text not null,

  metadata jsonb,

  created_at timestamptz not null default now()
);

alter table public.route_prediction_snapshots
enable row level security;

drop policy if exists
  "route_prediction_snapshots_select_own_org"
on public.route_prediction_snapshots;

create policy
  "route_prediction_snapshots_select_own_org"
on public.route_prediction_snapshots
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists
  "route_prediction_snapshots_insert_own_org"
on public.route_prediction_snapshots;

create policy
  "route_prediction_snapshots_insert_own_org"
on public.route_prediction_snapshots
for insert
to authenticated
with check (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

create index if not exists
  route_prediction_snapshots_org_created_idx
on public.route_prediction_snapshots (
  organization_id,
  created_at desc
);

create index if not exists
  route_prediction_snapshots_trip_created_idx
on public.route_prediction_snapshots (
  trip_id,
  created_at desc
);

create index if not exists
  route_prediction_snapshots_vehicle_created_idx
on public.route_prediction_snapshots (
  vehicle_id,
  created_at desc
);
