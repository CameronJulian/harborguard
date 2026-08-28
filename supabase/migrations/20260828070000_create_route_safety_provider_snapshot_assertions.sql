begin;

-- ==============================================================
-- Layer 1: provider-native snapshot/version.
--
-- TomTom:
--   snapshot_identity_kind  = traffic_model_id
--   snapshot_identity_value = exact TrafficModelID header value
--
-- HERE:
--   snapshot_identity_kind  = source_updated
--   snapshot_identity_value = exact sourceUpdated response value
--
-- A snapshot/version is not an HTTP retrieval occurrence and is
-- not an incident event observation.
-- ==============================================================

create table public.route_safety_provider_snapshots (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  provider text not null,

  source_stream text not null,

  snapshot_identity_kind text not null,

  snapshot_identity_value text not null,

  provider_source_updated_at timestamptz null,

  created_at timestamptz not null
    default now(),

  constraint
    route_safety_provider_snapshots_provider_not_blank
    check (
      length(trim(provider)) > 0
    ),

  constraint
    route_safety_provider_snapshots_source_stream_not_blank
    check (
      length(trim(source_stream)) > 0
    ),

  constraint
    route_safety_provider_snapshots_identity_kind_not_blank
    check (
      length(trim(snapshot_identity_kind)) > 0
    ),

  constraint
    route_safety_provider_snapshots_identity_value_not_blank
    check (
      length(trim(snapshot_identity_value)) > 0
    ),

  constraint
    route_safety_provider_snapshots_identity_unique
    unique (
      organization_id,
      provider,
      source_stream,
      snapshot_identity_kind,
      snapshot_identity_value
    )
);


create index
  route_safety_provider_snapshots_source_updated_idx
on public.route_safety_provider_snapshots (
  organization_id,
  provider_source_updated_at desc
)
where provider_source_updated_at is not null;


create index
  route_safety_provider_snapshots_provider_created_idx
on public.route_safety_provider_snapshots (
  organization_id,
  provider,
  source_stream,
  created_at desc
);


alter table
  public.route_safety_provider_snapshots
enable row level security;


grant all on table
  public.route_safety_provider_snapshots
to service_role;


comment on table
  public.route_safety_provider_snapshots is
  'Immutable provider-native dataset snapshot/version coordinates. A version may be retrieved more than once. Snapshot identity is separate from HTTP retrieval time and incident event time.';


comment on column
  public.route_safety_provider_snapshots.snapshot_identity_value is
  'Exact provider-native dataset coordinate. TomTom uses TrafficModelID; HERE uses sourceUpdated. This is not provider_message_id and is not an incident occurrence timestamp.';


comment on column
  public.route_safety_provider_snapshots.provider_source_updated_at is
  'Provider-native typed source update time when supplied. HERE sourceUpdated may populate this field. TomTom TrafficModelID must not be interpreted as a timestamp.';


-- ==============================================================
-- Layer 2: concrete HTTP retrieval/response occurrence.
--
-- id is caller supplied. Persistence retries for the same HTTP
-- response reuse the same retrieval UUID. A new provider request
-- receives a new UUID even when the provider snapshot is unchanged.
-- ==============================================================

create table public.route_safety_provider_snapshot_retrievals (
  id uuid primary key,

  snapshot_id uuid not null
    references public.route_safety_provider_snapshots(id)
    on delete restrict,

  response_originated_at timestamptz null,

  received_at timestamptz not null,

  provider_request_id text null,

  created_at timestamptz not null
    default now(),

  constraint
    route_safety_provider_snapshot_retrievals_request_id_not_blank
    check (
      provider_request_id is null
      or length(trim(provider_request_id)) > 0
    )
);


create index
  route_safety_provider_snapshot_retrievals_snapshot_received_idx
on public.route_safety_provider_snapshot_retrievals (
  snapshot_id,
  received_at desc
);


create index
  route_safety_provider_snapshot_retrievals_response_time_idx
on public.route_safety_provider_snapshot_retrievals (
  response_originated_at desc
)
where response_originated_at is not null;


alter table
  public.route_safety_provider_snapshot_retrievals
enable row level security;


grant all on table
  public.route_safety_provider_snapshot_retrievals
to service_role;


comment on table
  public.route_safety_provider_snapshot_retrievals is
  'Immutable HTTP retrieval occurrences for provider snapshot/version coordinates. Multiple retrieval rows may reference the same snapshot_id.';


comment on column
  public.route_safety_provider_snapshot_retrievals.id is
  'HarborGuard retrieval-occurrence identity. Persistence retries for the same HTTP response must reuse this UUID; a subsequent provider request uses a new UUID.';


comment on column
  public.route_safety_provider_snapshot_retrievals.response_originated_at is
  'HTTP response Date/origination time when supplied. This is response provenance and must not substitute for incident event_observed_at.';


comment on column
  public.route_safety_provider_snapshot_retrievals.received_at is
  'HarborGuard local receive time for this concrete provider HTTP response occurrence.';


comment on column
  public.route_safety_provider_snapshot_retrievals.provider_request_id is
  'Optional provider/request correlation identifier. It is provenance metadata, not provider snapshot identity or incident identity.';


-- ==============================================================
-- Layer 3: incident presence asserted in one concrete retrieval.
-- ==============================================================

create table public.route_safety_provider_snapshot_assertions (
  id uuid primary key
    default gen_random_uuid(),

  retrieval_id uuid not null
    references public.route_safety_provider_snapshot_retrievals(id)
    on delete restrict,

  provider_message_id text not null,

  payload_schema_version text not null,

  event_observed_at timestamptz null,

  provider_observation_id uuid null
    references public.route_safety_provider_observations(id)
    on delete restrict,

  normalized_payload jsonb not null,

  created_at timestamptz not null
    default now(),

  constraint
    route_safety_provider_snapshot_assertions_message_not_blank
    check (
      length(trim(provider_message_id)) > 0
    ),

  constraint
    route_safety_provider_snapshot_assertions_schema_not_blank
    check (
      length(trim(payload_schema_version)) > 0
    ),

  constraint
    route_safety_provider_snapshot_assertions_payload_object
    check (
      jsonb_typeof(normalized_payload) = 'object'
    ),

  constraint
    route_safety_provider_snapshot_assertions_identity_unique
    unique (
      retrieval_id,
      provider_message_id,
      payload_schema_version
    )
);


create index
  route_safety_provider_snapshot_assertions_retrieval_idx
on public.route_safety_provider_snapshot_assertions (
  retrieval_id
);


create index
  route_safety_provider_snapshot_assertions_message_idx
on public.route_safety_provider_snapshot_assertions (
  provider_message_id
);


create index
  route_safety_provider_snapshot_assertions_observation_idx
on public.route_safety_provider_snapshot_assertions (
  provider_observation_id
)
where provider_observation_id is not null;


alter table
  public.route_safety_provider_snapshot_assertions
enable row level security;


grant all on table
  public.route_safety_provider_snapshot_assertions
to service_role;


comment on table
  public.route_safety_provider_snapshot_assertions is
  'Immutable incident-presence assertions belonging to one concrete provider HTTP retrieval. The same incident may be asserted in many retrievals without fabricating event time.';


comment on column
  public.route_safety_provider_snapshot_assertions.provider_message_id is
  'Provider-issued incident/message identity. Snapshot identity or retrieval identity must never be written here.';


comment on column
  public.route_safety_provider_snapshot_assertions.event_observed_at is
  'Provider incident/event/report observation time when supplied. Null is valid when a response asserts current presence without an event timestamp.';


comment on column
  public.route_safety_provider_snapshot_assertions.provider_observation_id is
  'Optional link to the existing immutable provider observation when an event-time observation exists. Repeated retrieval assertions may reference the same provider observation.';


comment on column
  public.route_safety_provider_snapshot_assertions.normalized_payload is
  'Normalized immutable assertion payload for the incident as represented in this retrieval.';


-- ==============================================================
-- All provider provenance layers are append-only.
-- ==============================================================

create function
  public.reject_route_safety_provider_snapshot_provenance_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  raise exception using
    errcode = '55000',
    message = format(
      '%I.%I is immutable; %s is prohibited.',
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      TG_OP
    );

  return null;

end;
$$;


comment on function
  public.reject_route_safety_provider_snapshot_provenance_mutation()
is
  'Rejects UPDATE, DELETE, and TRUNCATE against immutable provider snapshot/version, retrieval, and assertion provenance.';


create trigger
  route_safety_provider_snapshots_immutable
before update or delete or truncate
on public.route_safety_provider_snapshots
for each statement
execute function
  public.reject_route_safety_provider_snapshot_provenance_mutation();


create trigger
  route_safety_provider_snapshot_retrievals_immutable
before update or delete or truncate
on public.route_safety_provider_snapshot_retrievals
for each statement
execute function
  public.reject_route_safety_provider_snapshot_provenance_mutation();


create trigger
  route_safety_provider_snapshot_assertions_immutable
before update or delete or truncate
on public.route_safety_provider_snapshot_assertions
for each statement
execute function
  public.reject_route_safety_provider_snapshot_provenance_mutation();


commit;