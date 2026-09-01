-- ============================================================================
-- HSPP durable reconstruction intent - producer-neutral Reservoir eligibility
-- provenance foundation.
--
-- Purpose:
-- - persist the B06A Reservoir-eligibility policy version independently from
--   producer-specific discovery/scheduling provenance;
-- - backfill all existing immutable reconstruction intents through a constant
--   DDL default without issuing row UPDATE statements;
-- - preserve the deployed B07B discovery provenance and claim RPC unchanged;
-- - prepare a later successor claim authority for scheduled-pair provenance.
--
-- This migration deliberately does NOT:
-- - remove, rename, relax or repurpose discovery_policy_version;
-- - modify the existing durable decision unique constraint;
-- - modify claim_hspp_reconstruction_execution_intent;
-- - treat pair scheduling metadata as semantic authority;
-- - alter B07A or B11A2 policy provenance;
-- - activate pair scheduling, recovery routing or cursor CAS.
-- ============================================================================

begin;


alter table
  public.hspp_reconstruction_execution_intents
add column if not exists
  reservoir_eligibility_policy_version text
    not null
    default 'hspp-reservoir-eligibility-v1';


alter table
  public.hspp_reconstruction_execution_intents
add constraint
  hspp_recon_intent_reservoir_eligibility_policy_length
check (
  length(trim(reservoir_eligibility_policy_version))
    between 1 and 128
);


comment on column
  public.hspp_reconstruction_execution_intents
    .reservoir_eligibility_policy_version
is
  'Producer-neutral B06A Reservoir-eligibility semantic policy provenance. Existing and compatibility B07B intents use hspp-reservoir-eligibility-v1. This value describes semantic Reservoir eligibility only and must not be populated from pair scheduling metadata.';


commit;
