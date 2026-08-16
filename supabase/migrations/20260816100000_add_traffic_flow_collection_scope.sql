alter table public.traffic_flow_observations
add column if not exists collection_latitude double precision null,
add column if not exists collection_longitude double precision null,
add column if not exists collection_radius_meters integer null;

alter table public.traffic_flow_observations
drop constraint if exists traffic_flow_observations_collection_latitude_range;

alter table public.traffic_flow_observations
add constraint traffic_flow_observations_collection_latitude_range
check (
  collection_latitude is null
  or collection_latitude between -90 and 90
);

alter table public.traffic_flow_observations
drop constraint if exists traffic_flow_observations_collection_longitude_range;

alter table public.traffic_flow_observations
add constraint traffic_flow_observations_collection_longitude_range
check (
  collection_longitude is null
  or collection_longitude between -180 and 180
);

alter table public.traffic_flow_observations
drop constraint if exists traffic_flow_observations_collection_radius_positive;

alter table public.traffic_flow_observations
add constraint traffic_flow_observations_collection_radius_positive
check (
  collection_radius_meters is null
  or collection_radius_meters > 0
);

comment on column public.traffic_flow_observations.collection_latitude is
'Latitude at the center of the provider traffic-flow collection request.';

comment on column public.traffic_flow_observations.collection_longitude is
'Longitude at the center of the provider traffic-flow collection request.';

comment on column public.traffic_flow_observations.collection_radius_meters is
'Radius in meters used for the provider traffic-flow collection request.';
