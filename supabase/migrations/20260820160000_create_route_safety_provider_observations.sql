-- HSPP-008B5: Route Safety provider-observation provenance foundation.
--
-- This migration introduces an immutable-source observation boundary for
-- provider-native Route Safety observations before they are projected into
-- mutable/corroborated route_safety_alerts.
--
-- It does not:
-- - modify HERE or TomTom ingestion;
-- - modify Route Safety scoring;
-- - modify route_safety_alerts;
-- - authorize Crowd Intelligence;
-- - authorize ML training or validation;
-- - automatically create HSPP evidence.

create table if not exists public.route_safety_provider_observations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  provider text not null,
  source_stream text not null,
  provider_message_id text not null,

  observed_at timestamptz not null,
  received_at timestamptz not null default now(),

  payload_schema_version text not null,
  normalized_payload jsonb not null,

  created_at timestamptz not null default now(),

  constraint route_safety_provider_observations_provider_not_blank
    check (length(trim(provider)) > 0),

  constraint route_safety_provider_observations_source_stream_not_blank
    check (length(trim(source_stream)) > 0),

  constraint route_safety_provider_observations_message_id_not_blank
    check (length(trim(provider_message_id)) > 0),

  constraint route_safety_provider_observations_schema_not_blank
    check (length(trim(payload_schema_version)) > 0),

  constraint route_safety_provider_observations_payload_object
    check (jsonb_typeof(normalized_payload) = 'object'),

  constraint route_safety_provider_observations_source_identity_unique
    unique (
      organization_id,
      provider,
      source_stream,
      provider_message_id
    )
);

create index if not exists
  route_safety_provider_observations_org_observed_idx
on public.route_safety_provider_observations (
  organization_id,
  observed_at desc
);

create index if not exists
  route_safety_provider_observations_provider_observed_idx
on public.route_safety_provider_observations (
  organization_id,
  provider,
  observed_at desc
);

alter table public.route_safety_provider_observations
enable row level security;

drop policy if exists
  "route_safety_provider_observations_select_own_org"
on public.route_safety_provider_observations;

create policy
  "route_safety_provider_observations_select_own_org"
on public.route_safety_provider_observations
for select
to authenticated
using (
  organization_id = public.current_user_org_id()
);

grant select
on public.route_safety_provider_observations
to authenticated;

grant all
on public.route_safety_provider_observations
to service_role;

comment on table public.route_safety_provider_observations is
  'Organization-scoped provider-native Route Safety observations preserved separately from mutable and cross-provider-correlated route_safety_alerts. Observation existence does not establish HSPP trust or Route Safety operational authority.';

comment on column public.route_safety_provider_observations.provider_message_id is
  'Stable provider-issued incident or observation identity. Derived title, coordinate, positional, or HarborGuard duplicate keys must not be stored as provider identity.';

comment on column public.route_safety_provider_observations.observed_at is
  'Provider observation time. HarborGuard ingestion or confirmation time must not be substituted for provider observation time.';

comment on column public.route_safety_provider_observations.received_at is
  'Time HarborGuard received the provider observation.';

comment on column public.route_safety_provider_observations.created_at is
  'Time HarborGuard persisted the provider observation record.';

alter table public.hspp_evidence
add column if not exists provider_observation_id uuid null
  references public.route_safety_provider_observations(id)
  on delete restrict;

create unique index if not exists
  hspp_evidence_provider_observation_unique
on public.hspp_evidence (provider_observation_id)
where provider_observation_id is not null;

comment on column public.hspp_evidence.provider_observation_id is
  'Optional immutable Route Safety provider-observation source record associated with this HSPP evidence record. This relationship does not authorize Route Safety, Crowd, training, or validation use.';
