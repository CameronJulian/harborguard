alter table public.traffic_flow_observations
add column if not exists collection_key text null;

alter table public.traffic_flow_observations
drop constraint if exists traffic_flow_observations_collection_key_not_blank;

alter table public.traffic_flow_observations
add constraint traffic_flow_observations_collection_key_not_blank
check (
  collection_key is null
  or length(trim(collection_key)) > 0
);

alter table public.traffic_flow_observations
drop constraint if exists traffic_flow_observations_collection_identity_unique;

alter table public.traffic_flow_observations
add constraint traffic_flow_observations_collection_identity_unique
unique (
  organization_id,
  provider,
  provider_segment_id,
  collection_key
);

comment on column public.traffic_flow_observations.collection_key is
'Optional collection-delivery identity used to make scheduled traffic-flow persistence retry-safe while allowing unkeyed manual observations.';
