alter table public.route_safety_alerts
add column if not exists road_name text;

alter table public.route_safety_alerts
add column if not exists road_from text;

alter table public.route_safety_alerts
add column if not exists road_to text;

alter table public.route_safety_alerts
add column if not exists provider_geometry jsonb;

comment on column public.route_safety_alerts.road_name
is 'Normalized road name from external provider';

comment on column public.route_safety_alerts.road_from
is 'Provider supplied start road/segment';

comment on column public.route_safety_alerts.road_to
is 'Provider supplied end road/segment';

comment on column public.route_safety_alerts.provider_geometry
is 'Original provider geometry used for future matching';
