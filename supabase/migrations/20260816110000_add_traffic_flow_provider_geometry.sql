alter table public.traffic_flow_observations
add column if not exists provider_geometry jsonb null;

comment on column public.traffic_flow_observations.provider_geometry is
'Provider traffic-flow road geometry used to determine geographic relevance of a stored observation without making a fresh provider request.';
