alter table public.vehicle_locations
add column if not exists road_speed_limit_kmh double precision;

comment on column public.vehicle_locations.road_speed_limit_kmh is
  'Road speed limit in km/h resolved for this telemetry sample. NULL means no trustworthy road-speed context was available.';
