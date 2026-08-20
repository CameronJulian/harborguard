-- HSPP-001: HarborGuard Safety Provenance Protocol evidence foundation.
--
-- This migration introduces a private application-layer evidence store.
-- It does not change Route Safety scoring, Crowd Intelligence scoring,
-- ML training eligibility, or the vehicle-location processing lifecycle.

create table if not exists public.hspp_evidence (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  protocol_version text not null default '0.1',
  canonicalization_version text not null default 'hspp-canonical-json-v1',

  source_class text not null,
  source_provider text not null,
  source_stream text not null,
  source_message_id text not null,

  observed_at timestamptz not null,
  received_at timestamptz not null default now(),

  payload_schema_version text not null,
  normalized_payload jsonb not null,

  integrity_algorithm text not null default 'sha256',
  integrity_fingerprint text not null,

  integrity_state text not null default 'INTEGRITY_SEALED',
  validation_state text not null default 'VALIDATED',
  trust_state text not null default 'UNASSESSED',

  operational_eligible boolean not null default true,
  crowd_eligible boolean not null default false,
  training_eligible boolean not null default false,
  validation_eligible boolean not null default false,

  telematics_receipt_id uuid null
    references public.telematics_message_receipts(id) on delete restrict,

  vehicle_id uuid null
    references public.vehicles(id) on delete set null,

  trip_id uuid null
    references public.vehicle_trips(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint hspp_evidence_protocol_version_not_blank
    check (length(trim(protocol_version)) > 0),

  constraint hspp_evidence_canonicalization_version_not_blank
    check (length(trim(canonicalization_version)) > 0),

  constraint hspp_evidence_source_class_not_blank
    check (length(trim(source_class)) > 0),

  constraint hspp_evidence_source_provider_not_blank
    check (length(trim(source_provider)) > 0),

  constraint hspp_evidence_source_stream_not_blank
    check (length(trim(source_stream)) > 0),

  constraint hspp_evidence_source_message_id_not_blank
    check (length(trim(source_message_id)) > 0),

  constraint hspp_evidence_payload_schema_version_not_blank
    check (length(trim(payload_schema_version)) > 0),

  constraint hspp_evidence_normalized_payload_object
    check (jsonb_typeof(normalized_payload) = 'object'),

  constraint hspp_evidence_integrity_algorithm_v01
    check (integrity_algorithm = 'sha256'),

  constraint hspp_evidence_integrity_fingerprint_sha256
    check (integrity_fingerprint ~ '^[0-9a-f]{64}$'),

  constraint hspp_evidence_integrity_state_v01
    check (
      integrity_state in (
        'RECEIVED',
        'IDENTIFIED',
        'VALIDATED',
        'INTEGRITY_SEALED'
      )
    ),

  constraint hspp_evidence_validation_state_v01
    check (
      validation_state in (
        'UNASSESSED',
        'VALIDATED',
        'REJECTED'
      )
    ),

  constraint hspp_evidence_trust_state_v01
    check (
      trust_state in (
        'UNASSESSED',
        'PLAUSIBLE',
        'CORROBORATED',
        'VERIFIED'
      )
    ),

  constraint hspp_evidence_source_identity_unique
    unique (
      organization_id,
      protocol_version,
      source_class,
      source_provider,
      source_stream,
      source_message_id
    )
);

create unique index if not exists
  hspp_evidence_telematics_receipt_unique
on public.hspp_evidence (telematics_receipt_id)
where telematics_receipt_id is not null;

create index if not exists
  hspp_evidence_org_observed_at_idx
on public.hspp_evidence (organization_id, observed_at desc);

create index if not exists
  hspp_evidence_fingerprint_idx
on public.hspp_evidence (integrity_fingerprint);

alter table public.hspp_evidence enable row level security;

comment on table public.hspp_evidence is
  'Private HarborGuard Safety Provenance Protocol evidence foundation. HSPP evidence records preserve canonical source provenance and SHA-256 integrity identity. Table existence does not establish physical-world truth, Crowd eligibility, ML training eligibility, or production Route Safety authority.';

comment on column public.hspp_evidence.integrity_fingerprint is
  'Lowercase SHA-256 fingerprint of the HSPP versioned canonical evidence representation. The fingerprint detects canonical evidence mutation but does not prove the underlying physical observation is true.';

comment on column public.hspp_evidence.received_at is
  'HarborGuard receipt time. This timestamp is intentionally excluded from the v0.1 deterministic content fingerprint.';

comment on column public.hspp_evidence.trust_state is
  'HSPP trust classification independent of cryptographic integrity.';

comment on column public.hspp_evidence.training_eligible is
  'Explicit downstream-use state. Successful evidence ingestion does not automatically make evidence ML-training eligible.';
