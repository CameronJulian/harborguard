create table if not exists public.route_prediction_outcomes (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  vehicle_id uuid
    references public.vehicles(id)
    on delete set null,

  trip_id uuid not null
    references public.vehicle_trips(id)
    on delete cascade,

  completed_at timestamptz not null,

  adverse_event_occurred boolean not null default false,
  highest_alert_severity text,

  total_alert_count integer not null default 0,

  panic_count integer not null default 0,
  route_safety_threat_count integer not null default 0,

  harsh_braking_count integer not null default 0,
  harsh_cornering_count integer not null default 0,
  rapid_acceleration_count integer not null default 0,
  speeding_count integer not null default 0,

  gps_anomaly_count integer not null default 0,

  long_stop_count integer not null default 0,
  suspicious_stop_count integer not null default 0,

  metadata jsonb,

  created_at timestamptz not null default now(),

  constraint route_prediction_outcomes_trip_unique
    unique (trip_id)
);

alter table public.route_prediction_outcomes
enable row level security;

drop policy if exists
  "route_prediction_outcomes_select_own_org"
on public.route_prediction_outcomes;

create policy
  "route_prediction_outcomes_select_own_org"
on public.route_prediction_outcomes
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
  "route_prediction_outcomes_insert_own_org"
on public.route_prediction_outcomes;

create policy
  "route_prediction_outcomes_insert_own_org"
on public.route_prediction_outcomes
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
  route_prediction_outcomes_org_completed_idx
on public.route_prediction_outcomes (
  organization_id,
  completed_at desc
);

create index if not exists
  route_prediction_outcomes_vehicle_completed_idx
on public.route_prediction_outcomes (
  vehicle_id,
  completed_at desc
);
