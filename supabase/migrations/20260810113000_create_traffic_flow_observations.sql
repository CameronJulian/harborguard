create table if not exists public.traffic_flow_observations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  provider text not null default 'here',

  provider_segment_id text not null,
  road_name text null,

  current_speed_kmh double precision not null,
  free_flow_speed_kmh double precision not null,

  congestion_percent integer not null,
  delay_minutes integer not null,

  confidence double precision not null,
  jam_factor double precision not null,

  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint traffic_flow_observations_provider_not_blank
    check (length(trim(provider)) > 0),

  constraint traffic_flow_observations_provider_segment_not_blank
    check (length(trim(provider_segment_id)) > 0),

  constraint traffic_flow_observations_current_speed_nonnegative
    check (current_speed_kmh >= 0),

  constraint traffic_flow_observations_free_flow_speed_nonnegative
    check (free_flow_speed_kmh >= 0),

  constraint traffic_flow_observations_congestion_range
    check (congestion_percent between 0 and 100),

  constraint traffic_flow_observations_delay_nonnegative
    check (delay_minutes >= 0)
);

create index if not exists
  traffic_flow_observations_org_observed_idx
on public.traffic_flow_observations (
  organization_id,
  observed_at desc
);

create index if not exists
  traffic_flow_observations_org_segment_observed_idx
on public.traffic_flow_observations (
  organization_id,
  provider,
  provider_segment_id,
  observed_at desc
);

alter table public.traffic_flow_observations
enable row level security;

create policy "Users can read organization traffic flow observations"
on public.traffic_flow_observations
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
);

grant select
on public.traffic_flow_observations
to authenticated;

grant all
on public.traffic_flow_observations
to service_role;

comment on table public.traffic_flow_observations is
'Organization-scoped historical provider traffic-flow observations used as factual evidence for future traffic analysis and forecasting.';

comment on column public.traffic_flow_observations.provider_segment_id is
'Stable provider-issued traffic segment identity. Positional runtime fallback identifiers must not be stored here.';

comment on column public.traffic_flow_observations.observed_at is
'Time at which the traffic-flow condition was observed.';

comment on column public.traffic_flow_observations.created_at is
'Time at which HarborGuard persisted the observation.';