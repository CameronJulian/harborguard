alter table public.road_risk_segments
  add column if not exists segment_key text;

update public.road_risk_segments
set segment_key =
  round(latitude::numeric, 3)::text || ':' ||
  round(longitude::numeric, 3)::text
where segment_key is null;

alter table public.road_risk_segments
  alter column segment_key set not null;

create unique index if not exists
  road_risk_segments_org_segment_key_uidx
on public.road_risk_segments (
  organization_id,
  segment_key
);

create table if not exists public.road_risk_segment_events (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  road_risk_segment_id uuid not null
    references public.road_risk_segments(id)
    on delete cascade,

  route_intelligence_id uuid not null
    references public.route_intelligence(id)
    on delete cascade,

  event_type text null,
  created_at timestamptz not null default now(),

  unique (
    organization_id,
    route_intelligence_id
  )
);

create index if not exists
  road_risk_segment_events_segment_idx
on public.road_risk_segment_events (
  road_risk_segment_id,
  created_at desc
);

alter table public.road_risk_segment_events
  enable row level security;

drop policy if exists
  "Users can read organization road risk segment events"
on public.road_risk_segment_events;

create policy
  "Users can read organization road risk segment events"
on public.road_risk_segment_events
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
);

drop policy if exists
  "Users can insert organization road risk segment events"
on public.road_risk_segment_events;

create policy
  "Users can insert organization road risk segment events"
on public.road_risk_segment_events
for insert
to authenticated
with check (
  organization_id = public.current_user_org_id()
);

create or replace function public.aggregate_road_risk_intelligence(
  p_organization_id uuid,
  p_route_intelligence_id uuid,
  p_event_type text,
  p_latitude double precision,
  p_longitude double precision,
  p_event_at timestamptz default now()
)
returns table (
  segment_id uuid,
  segment_risk_score integer,
  event_processed boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_segment_id uuid;
  v_segment_key text;
  v_event_type text;
  v_collision_increment integer := 0;
  v_crime_increment integer := 0;
  v_roadblock_increment integer := 0;
  v_traffic_signal_increment integer := 0;
  v_other_increment integer := 0;
  v_inserted_event_id uuid;
  v_risk_score integer;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required';
  end if;

  if p_organization_id <> public.current_user_org_id() then
    raise exception 'Permission denied';
  end if;

  if p_route_intelligence_id is null then
    raise exception 'route_intelligence_id is required';
  end if;

  if p_latitude is null
    or p_latitude < -90
    or p_latitude > 90
  then
    raise exception 'A valid latitude is required';
  end if;

  if p_longitude is null
    or p_longitude < -180
    or p_longitude > 180
  then
    raise exception 'A valid longitude is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_organization_id::text || ':' ||
      p_route_intelligence_id::text,
      0
    )
  );

  select
    events.road_risk_segment_id,
    segments.risk_score
  into
    v_segment_id,
    v_risk_score
  from public.road_risk_segment_events as events
  join public.road_risk_segments as segments
    on segments.id = events.road_risk_segment_id
  where events.organization_id = p_organization_id
    and events.route_intelligence_id =
      p_route_intelligence_id;

  if v_segment_id is not null then
    return query
    select
      v_segment_id,
      v_risk_score,
      false;

    return;
  end if;

  v_event_type :=
    lower(
      coalesce(
        nullif(trim(p_event_type), ''),
        'other'
      )
    );

  if v_event_type in (
    'accident',
    'accidents',
    'collision',
    'collisions',
    'crash',
    'crashes',
    'vehicle_collision',
    'vehicle_collisions'
  ) then
    v_collision_increment := 1;

  elsif v_event_type in (
    'smash_grab_hotspot',
    'crime',
    'crime_hotspot',
    'robbery',
    'suspicious_activity'
  ) then
    v_crime_increment := 1;

  elsif v_event_type in (
    'roadblock',
    'road_closure',
    'blocked_road',
    'protest'
  ) then
    v_roadblock_increment := 1;

  elsif v_event_type in (
    'traffic_light_outage',
    'traffic_signal_outage',
    'traffic_signal_failure'
  ) then
    v_traffic_signal_increment := 1;

  else
    v_other_increment := 1;
  end if;

  v_segment_key :=
    round(p_latitude::numeric, 3)::text || ':' ||
    round(p_longitude::numeric, 3)::text;

  insert into public.road_risk_segments (
    organization_id,
    segment_key,
    latitude,
    longitude,
    radius_meters,
    risk_score,
    collision_count,
    crime_count,
    roadblock_count,
    traffic_signal_count,
    other_event_count,
    verification_count,
    last_event_at,
    metadata,
    updated_at
  )
  values (
    p_organization_id,
    v_segment_key,
    p_latitude,
    p_longitude,
    150,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    null,
    jsonb_build_object(
      'aggregationMethod',
      'rounded_coordinate_grid',
      'segmentKey',
      v_segment_key
    ),
    now()
  )
  on conflict (
    organization_id,
    segment_key
  )
  do update
  set
    updated_at =
      public.road_risk_segments.updated_at
  returning id into v_segment_id;

  insert into public.road_risk_segment_events (
    organization_id,
    road_risk_segment_id,
    route_intelligence_id,
    event_type
  )
  values (
    p_organization_id,
    v_segment_id,
    p_route_intelligence_id,
    v_event_type
  )
  on conflict (
    organization_id,
    route_intelligence_id
  )
  do nothing
  returning id into v_inserted_event_id;

  if v_inserted_event_id is null then
    select
      events.road_risk_segment_id,
      segments.risk_score
    into
      v_segment_id,
      v_risk_score
    from public.road_risk_segment_events as events
    join public.road_risk_segments as segments
      on segments.id = events.road_risk_segment_id
    where events.organization_id = p_organization_id
      and events.route_intelligence_id =
        p_route_intelligence_id;

    return query
    select
      v_segment_id,
      v_risk_score,
      false;

    return;
  end if;

  update public.road_risk_segments
  set
    collision_count =
      collision_count + v_collision_increment,

    crime_count =
      crime_count + v_crime_increment,

    roadblock_count =
      roadblock_count + v_roadblock_increment,

    traffic_signal_count =
      traffic_signal_count +
      v_traffic_signal_increment,

    other_event_count =
      other_event_count + v_other_increment,

    verification_count =
      verification_count + 1,

    last_event_at =
      greatest(
        coalesce(last_event_at, p_event_at, now()),
        coalesce(p_event_at, now())
      ),

    updated_at = now(),

    risk_score = least(
      100,
      (collision_count + v_collision_increment) * 20 +
      (crime_count + v_crime_increment) * 35 +
      (roadblock_count + v_roadblock_increment) * 30 +
      (
        traffic_signal_count +
        v_traffic_signal_increment
      ) * 18 +
      (other_event_count + v_other_increment) * 12
    )
  where id = v_segment_id
  returning risk_score into v_risk_score;

  return query
  select
    v_segment_id,
    v_risk_score,
    true;
end;
$$;

revoke all
on function public.aggregate_road_risk_intelligence(
  uuid,
  uuid,
  text,
  double precision,
  double precision,
  timestamptz
)
from public;

grant execute
on function public.aggregate_road_risk_intelligence(
  uuid,
  uuid,
  text,
  double precision,
  double precision,
  timestamptz
)
to authenticated;

comment on table public.road_risk_segment_events is
  'Idempotency ledger linking verified route intelligence records to aggregated road-risk segments.';

comment on function public.aggregate_road_risk_intelligence(
  uuid,
  uuid,
  text,
  double precision,
  double precision,
  timestamptz
) is
  'Atomically and idempotently aggregates one verified route intelligence record into a geographic road-risk segment.';
