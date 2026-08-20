-- HSPP-006B: persist the provenance of an HSPP trust assessment.
--
-- Assessment provenance is separate from cryptographic integrity.
-- This migration does not enable Crowd Intelligence or ML training
-- eligibility and does not alter Route Safety scoring.

alter table public.hspp_evidence
  add column if not exists assessment_policy_version text null;

alter table public.hspp_evidence
  add column if not exists assessment_reason text null;

alter table public.hspp_evidence
  add column if not exists assessed_at timestamptz null;

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_assessment_provenance_complete;

alter table public.hspp_evidence
  add constraint hspp_evidence_assessment_provenance_complete
  check (
    num_nonnulls(
      assessment_policy_version,
      assessment_reason,
      assessed_at
    ) in (0, 3)
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_assessment_policy_not_blank;

alter table public.hspp_evidence
  add constraint hspp_evidence_assessment_policy_not_blank
  check (
    assessment_policy_version is null
    or length(trim(assessment_policy_version)) > 0
  );

alter table public.hspp_evidence
  drop constraint if exists hspp_evidence_assessment_reason_not_blank;

alter table public.hspp_evidence
  add constraint hspp_evidence_assessment_reason_not_blank
  check (
    assessment_reason is null
    or length(trim(assessment_reason)) > 0
  );

comment on column public.hspp_evidence.assessment_policy_version is
  'Versioned HSPP assessment policy that produced the current persisted assessment decision.';

comment on column public.hspp_evidence.assessment_reason is
  'Machine-readable HSPP assessment reason associated with the persisted trust and eligibility decision.';

comment on column public.hspp_evidence.assessed_at is
  'Time at which HarborGuard persisted the current HSPP assessment decision.';
