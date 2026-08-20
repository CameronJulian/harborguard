-- HSPP-005A: optional derivation-lineage contract.
--
-- Root/source evidence remains valid with no lineage.
-- Derived evidence may bind itself to the exact cryptographic identity
-- of its parent and to an explicitly versioned derivation.
--
-- This migration does not alter Crowd Intelligence eligibility,
-- ML training eligibility, trust state, or Route Safety scoring.

alter table public.hspp_evidence
  add column if not exists parent_evidence_id uuid null;

alter table public.hspp_evidence
  add column if not exists parent_integrity_fingerprint text null;

alter table public.hspp_evidence
  add column if not exists derivation_type text null;

alter table public.hspp_evidence
  add column if not exists derivation_version text null;

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_parent_fingerprint_sha256;

alter table public.hspp_evidence
  add constraint hspp_evidence_parent_fingerprint_sha256
  check (
    parent_integrity_fingerprint is null
    or parent_integrity_fingerprint ~ '^[0-9a-f]{64}$'
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_derivation_lineage_complete;

alter table public.hspp_evidence
  add constraint hspp_evidence_derivation_lineage_complete
  check (
    num_nonnulls(
      parent_evidence_id,
      parent_integrity_fingerprint,
      derivation_type,
      derivation_version
    ) in (0, 4)
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_derivation_type_not_blank;

alter table public.hspp_evidence
  add constraint hspp_evidence_derivation_type_not_blank
  check (
    derivation_type is null
    or length(trim(derivation_type)) > 0
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_derivation_version_not_blank;

alter table public.hspp_evidence
  add constraint hspp_evidence_derivation_version_not_blank
  check (
    derivation_version is null
    or length(trim(derivation_version)) > 0
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_parent_not_self;

alter table public.hspp_evidence
  add constraint hspp_evidence_parent_not_self
  check (
    parent_evidence_id is null
    or parent_evidence_id <> id
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_parent_identity_unique;

alter table public.hspp_evidence
  add constraint hspp_evidence_parent_identity_unique
  unique (
    organization_id,
    id,
    integrity_fingerprint
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_parent_identity_fkey;

alter table public.hspp_evidence
  add constraint hspp_evidence_parent_identity_fkey
  foreign key (
    organization_id,
    parent_evidence_id,
    parent_integrity_fingerprint
  )
  references public.hspp_evidence (
    organization_id,
    id,
    integrity_fingerprint
  )
  on delete restrict;
create index if not exists
  hspp_evidence_parent_evidence_idx
on public.hspp_evidence (
  organization_id,
  parent_evidence_id
)
where parent_evidence_id is not null;

comment on column public.hspp_evidence.parent_evidence_id is
  'Optional private database relationship to the immediate parent HSPP evidence item. Database identity alone is not the cryptographic lineage proof.';

comment on column public.hspp_evidence.parent_integrity_fingerprint is
  'Lowercase SHA-256 cryptographic identity of the immediate parent evidence content used by lineage-capable HSPP canonicalization.';

comment on column public.hspp_evidence.derivation_type is
  'Meaningful transformation class that produced derived HSPP evidence.';

comment on column public.hspp_evidence.derivation_version is
  'Explicit version of the transformation that produced derived HSPP evidence.';
