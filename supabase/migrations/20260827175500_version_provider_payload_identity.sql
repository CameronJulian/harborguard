begin;

alter table public.route_safety_provider_observations
  drop constraint if exists
    route_safety_provider_observations_source_identity_unique;

alter table public.route_safety_provider_observations
  add constraint
    route_safety_provider_observations_source_identity_unique
  unique (
    organization_id,
    provider,
    source_stream,
    provider_message_id,
    payload_schema_version
  );

alter table public.hspp_evidence
  drop constraint if exists
    hspp_evidence_source_identity_unique;

alter table public.hspp_evidence
  add constraint
    hspp_evidence_source_identity_unique
  unique (
    organization_id,
    protocol_version,
    source_class,
    source_provider,
    source_stream,
    source_message_id,
    payload_schema_version
  );

comment on constraint
  route_safety_provider_observations_source_identity_unique
on public.route_safety_provider_observations is
  'Immutable provider observation identity includes normalization schema version so historical normalization versions coexist without rewriting prior observations.';

comment on constraint
  hspp_evidence_source_identity_unique
on public.hspp_evidence is
  'Immutable HSPP evidence source identity includes payload schema version so independently sealed normalization versions coexist without rewriting historical evidence.';

commit;