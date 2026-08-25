alter table public.vehicle_locations
add column if not exists road_speed_limit_resolved_at timestamptz,
add column if not exists road_speed_limit_resolved_latitude double precision,
add column if not exists road_speed_limit_resolved_longitude double precision;

comment on column public.vehicle_locations.road_speed_limit_resolved_at is
  'Timestamp when road_speed_limit_kmh was last freshly resolved from its external road-speed provider. Reused cached values retain the original resolution timestamp.';

comment on column public.vehicle_locations.road_speed_limit_resolved_latitude is
  'Latitude at which road_speed_limit_kmh was last freshly resolved. Reused cached values retain the original resolution latitude.';

comment on column public.vehicle_locations.road_speed_limit_resolved_longitude is
  'Longitude at which road_speed_limit_kmh was last freshly resolved. Reused cached values retain the original resolution longitude.';
