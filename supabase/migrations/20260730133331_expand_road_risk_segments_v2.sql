alter table public.road_risk_segments
  add column if not exists road_closure_count integer not null default 0,
  add column if not exists roadworks_count integer not null default 0,
  add column if not exists congestion_count integer not null default 0,
  add column if not exists lane_closure_count integer not null default 0,
  add column if not exists weather_hazard_count integer not null default 0,
  add column if not exists flooding_count integer not null default 0,
  add column if not exists vehicle_breakdown_count integer not null default 0,
  add column if not exists road_hazard_count integer not null default 0,
  add column if not exists protest_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_road_closure_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_road_closure_count_check
      check (road_closure_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_roadworks_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_roadworks_count_check
      check (roadworks_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_congestion_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_congestion_count_check
      check (congestion_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_lane_closure_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_lane_closure_count_check
      check (lane_closure_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_weather_hazard_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_weather_hazard_count_check
      check (weather_hazard_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_flooding_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_flooding_count_check
      check (flooding_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_vehicle_breakdown_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_vehicle_breakdown_count_check
      check (vehicle_breakdown_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_road_hazard_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_road_hazard_count_check
      check (road_hazard_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'road_risk_segments_protest_count_check'
      and conrelid = 'public.road_risk_segments'::regclass
  ) then
    alter table public.road_risk_segments
      add constraint road_risk_segments_protest_count_check
      check (protest_count >= 0);
  end if;
end
$$;

comment on column public.road_risk_segments.road_closure_count is
  'Number of road closure events aggregated into this road risk segment.';

comment on column public.road_risk_segments.roadworks_count is
  'Number of roadworks events aggregated into this road risk segment.';

comment on column public.road_risk_segments.congestion_count is
  'Number of congestion events aggregated into this road risk segment.';

comment on column public.road_risk_segments.lane_closure_count is
  'Number of lane closure events aggregated into this road risk segment.';

comment on column public.road_risk_segments.weather_hazard_count is
  'Number of weather hazard events aggregated into this road risk segment.';

comment on column public.road_risk_segments.flooding_count is
  'Number of flooding events aggregated into this road risk segment.';

comment on column public.road_risk_segments.vehicle_breakdown_count is
  'Number of vehicle breakdown events aggregated into this road risk segment.';

comment on column public.road_risk_segments.road_hazard_count is
  'Number of general road hazard events aggregated into this road risk segment.';

comment on column public.road_risk_segments.protest_count is
  'Number of protest events aggregated into this road risk segment.';
