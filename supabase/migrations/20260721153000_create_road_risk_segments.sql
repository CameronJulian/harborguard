create table if not exists public.road_risk_segments (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  road_name text null,
  route_segment text null,

  latitude double precision not null
    check (latitude between -90 and 90),

  longitude double precision not null
    check (longitude between -180 and 180),

  radius_meters integer not null default 100
    check (radius_meters between 25 and 5000),

  risk_score integer not null default 0
    check (risk_score between 0 and 100),

  collision_count integer not null default 0
    check (collision_count >= 0),

  crime_count integer not null default 0
    check (crime_count >= 0),

  roadblock_count integer not null default 0
    check (roadblock_count >= 0),

  traffic_signal_count integer not null default 0
    check (traffic_signal_count >= 0),

  other_event_count integer not null default 0
    check (other_event_count >= 0),

  verification_count integer not null default 0
    check (verification_count >= 0),

  last_event_at timestamptz null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists road_risk_segments_org_risk_idx
  on public.road_risk_segments (
    organization_id,
    risk_score desc
  );

create index if not exists road_risk_segments_org_location_idx
  on public.road_risk_segments (
    organization_id,
    latitude,
    longitude
  );

create index if not exists road_risk_segments_org_last_event_idx
  on public.road_risk_segments (
    organization_id,
    last_event_at desc
  );

alter table public.road_risk_segments enable row level security;

drop policy if exists
  "Users can read organization road risk segments"
  on public.road_risk_segments;

create policy
  "Users can read organization road risk segments"
on public.road_risk_segments
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
);

drop policy if exists
  "Users can insert organization road risk segments"
  on public.road_risk_segments;

create policy
  "Users can insert organization road risk segments"
on public.road_risk_segments
for insert
to authenticated
with check (
  organization_id = public.current_user_org_id()
);

drop policy if exists
  "Users can update organization road risk segments"
  on public.road_risk_segments;

create policy
  "Users can update organization road risk segments"
on public.road_risk_segments
for update
to authenticated
using (
  organization_id = public.current_user_org_id()
)
with check (
  organization_id = public.current_user_org_id()
);

drop policy if exists
  "Users can delete organization road risk segments"
  on public.road_risk_segments;

create policy
  "Users can delete organization road risk segments"
on public.road_risk_segments
for delete
to authenticated
using (
  organization_id = public.current_user_org_id()
);

comment on table public.road_risk_segments is
  'Aggregated geographic road-risk segments derived from verified HarborGuard intelligence events.';

comment on column public.road_risk_segments.risk_score is
  'Current calculated risk score from 0 to 100.';