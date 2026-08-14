-- C-1C1: preserve authoritative adverse-event occurrence time.
--
-- Existing ledger rows predate event-time persistence. They are
-- conservatively backfilled from ledger created_at rather than attempting
-- to infer heterogeneous source timestamps from route_intelligence metadata.
--
-- New rows persist the existing aggregate_road_risk_intelligence p_event_at
-- input directly through the durable event ledger.

alter table public.road_risk_segment_events
  add column if not exists event_at timestamptz;

update public.road_risk_segment_events
set event_at = created_at
where event_at is null;

alter table public.road_risk_segment_events
  alter column event_at set not null;

create index if not exists
  road_risk_segment_events_segment_event_at_idx
on public.road_risk_segment_events (
  road_risk_segment_id,
  event_at desc
);

comment on column public.road_risk_segment_events.event_at is
  'Authoritative adverse-event occurrence time supplied to road-risk aggregation. Rows created before C-1C1 were conservatively backfilled from ledger created_at.';

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

  v_road_closure_increment integer := 0;
  v_roadworks_increment integer := 0;
  v_congestion_increment integer := 0;
  v_lane_closure_increment integer := 0;
  v_weather_hazard_increment integer := 0;
  v_flooding_increment integer := 0;
  v_vehicle_breakdown_increment integer := 0;
  v_road_hazard_increment integer := 0;
  v_protest_increment integer := 0;

  v_inserted_event_id uuid;
  v_risk_score integer;
begin
  if p_organization_id is null then
    raise exception 'organization_id is required';
  end if;

  if auth.role() <> 'service_role' then
    if p_organization_id <> public.current_user_org_id() then
      raise exception 'Permission denied';
    end if;
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
    and events.route_intelligence_id = p_route_intelligence_id;

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
    'collision',
    'crash',
    'vehicle_collision'
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

  elsif v_event_type = 'roadblock' then
    v_roadblock_increment := 1;

  elsif v_event_type in (
    'traffic_light_outage',
    'traffic_signal_outage',
    'traffic_signal_failure'
  ) then
    v_traffic_signal_increment := 1;

  elsif v_event_type in (
    'road_closure',
    'blocked_road'
  ) then
    v_road_closure_increment := 1;

  elsif v_event_type in (
    'roadworks',
    'road_work',
    'construction'
  ) then
    v_roadworks_increment := 1;

  elsif v_event_type in (
    'congestion',
    'traffic_congestion',
    'heavy_traffic'
  ) then
    v_congestion_increment := 1;

  elsif v_event_type in (
    'lane_closure',
    'lane_closed'
  ) then
    v_lane_closure_increment := 1;

  elsif v_event_type in (
    'weather_hazard',
    'severe_weather'
  ) then
    v_weather_hazard_increment := 1;

  elsif v_event_type in (
    'flooding',
    'flood'
  ) then
    v_flooding_increment := 1;

  elsif v_event_type in (
    'vehicle_breakdown',
    'broken_down_vehicle'
  ) then
    v_vehicle_breakdown_increment := 1;

  elsif v_event_type in (
    'road_hazard',
    'hazard_on_road',
    'debris'
  ) then
    v_road_hazard_increment := 1;

  elsif v_event_type = 'protest' then
    v_protest_increment := 1;

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
    road_closure_count,
    roadworks_count,
    congestion_count,
    lane_closure_count,
    weather_hazard_count,
    flooding_count,
    vehicle_breakdown_count,
    road_hazard_count,
    protest_count,
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
    0,
    0,
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
    updated_at = public.road_risk_segments.updated_at
  returning id into v_segment_id;

  insert into public.road_risk_segment_events (
    organization_id,
    road_risk_segment_id,
    route_intelligence_id,
    event_type,
    event_at
  )
  values (
    p_organization_id,
    v_segment_id,
    p_route_intelligence_id,
    v_event_type,
    coalesce(p_event_at, now())
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
      and events.route_intelligence_id = p_route_intelligence_id;

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
      traffic_signal_count + v_traffic_signal_increment,

    other_event_count =
      other_event_count + v_other_increment,

    road_closure_count =
      road_closure_count + v_road_closure_increment,

    roadworks_count =
      roadworks_count + v_roadworks_increment,

    congestion_count =
      congestion_count + v_congestion_increment,

    lane_closure_count =
      lane_closure_count + v_lane_closure_increment,

    weather_hazard_count =
      weather_hazard_count + v_weather_hazard_increment,

    flooding_count =
      flooding_count + v_flooding_increment,

    vehicle_breakdown_count =
      vehicle_breakdown_count + v_vehicle_breakdown_increment,

    road_hazard_count =
      road_hazard_count + v_road_hazard_increment,

    protest_count =
      protest_count + v_protest_increment,

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
      (traffic_signal_count + v_traffic_signal_increment) * 18 +
      (other_event_count + v_other_increment) * 12 +
      (road_closure_count + v_road_closure_increment) * 28 +
      (roadworks_count + v_roadworks_increment) * 12 +
      (congestion_count + v_congestion_increment) * 10 +
      (lane_closure_count + v_lane_closure_increment) * 15 +
      (weather_hazard_count + v_weather_hazard_increment) * 18 +
      (flooding_count + v_flooding_increment) * 25 +
      (vehicle_breakdown_count + v_vehicle_breakdown_increment) * 10 +
      (road_hazard_count + v_road_hazard_increment) * 16 +
      (protest_count + v_protest_increment) * 30
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
to authenticated, service_role;

comment on function public.aggregate_road_risk_intelligence(
  uuid,
  uuid,
  text,
  double precision,
  double precision,
  timestamptz
) is
  'Atomically and idempotently aggregates one verified route intelligence record into a geographic road-risk segment using the taxonomy v2 counters.';
