-- ============================================================================
-- B7490-Q14AG33A
-- HSPP reconstruction execution-intent successor selection-provenance
-- foundation.
--
-- Purpose:
-- - distinguish B07B discovery-origin selection from explicit scheduled-pair
--   selection without fabricating discovery provenance;
-- - preserve producer-specific selection provenance independently from
--   producer-neutral B06A Reservoir eligibility;
-- - permit discovery_policy_version to be absent only for SCHEDULED_PAIR;
-- - strengthen durable decision identity with selection origin,
--   normalized producer-specific provenance and B06A eligibility provenance.
--
-- Existing B07B rows remain compatible through:
--   selection_source = 'B07B_DISCOVERY'
--   discovery_policy_version = existing B07B value
--   pair_scheduling_version = null
--
-- Future scheduled-pair rows must use:
--   selection_source = 'SCHEDULED_PAIR'
--   discovery_policy_version = null
--   pair_scheduling_version = exact Reservoir pair scheduling version
--
-- This migration deliberately does NOT:
-- - create, replace or drop a reconstruction claim RPC;
-- - create, replace or drop the reconstruction intent read RPC;
-- - alter B07A reevaluation semantics;
-- - alter B11A2 membership semantics;
-- - treat pair scheduling metadata as semantic Reservoir authority;
-- - execute reconstruction;
-- - activate pair scheduling, recovery routing or cursor CAS.
-- ============================================================================

begin;


alter table
  public.hspp_reconstruction_execution_intents
add column if not exists
  selection_source text
    not null
    default 'B07B_DISCOVERY';


alter table
  public.hspp_reconstruction_execution_intents
add column if not exists
  pair_scheduling_version text;


-- Discovery provenance is producer-specific.
--
-- Existing B07B callers still require it. The successor contract permits
-- null only when selection_source explicitly proves scheduled-pair origin.
alter table
  public.hspp_reconstruction_execution_intents
alter column
  discovery_policy_version
drop not null;


alter table
  public.hspp_reconstruction_execution_intents
drop constraint if exists
  hspp_recon_intent_selection_source_valid;

alter table
  public.hspp_reconstruction_execution_intents
add constraint
  hspp_recon_intent_selection_source_valid
check (
  selection_source in (
    'B07B_DISCOVERY',
    'SCHEDULED_PAIR'
  )
);


alter table
  public.hspp_reconstruction_execution_intents
drop constraint if exists
  hspp_recon_intent_pair_scheduling_version_length;

alter table
  public.hspp_reconstruction_execution_intents
add constraint
  hspp_recon_intent_pair_scheduling_version_length
check (
  pair_scheduling_version is null
  or
  length(trim(pair_scheduling_version))
    between 1 and 128
);


-- Exactly one producer-specific provenance family is valid.
--
-- B07B:
--   real discovery provenance, no pair-scheduling provenance.
--
-- SCHEDULED_PAIR:
--   no invented discovery provenance, real pair-scheduling provenance.
alter table
  public.hspp_reconstruction_execution_intents
drop constraint if exists
  hspp_recon_intent_selection_provenance_complete;

alter table
  public.hspp_reconstruction_execution_intents
add constraint
  hspp_recon_intent_selection_provenance_complete
check (
  (
    selection_source =
      'B07B_DISCOVERY'
    and discovery_policy_version is not null
    and pair_scheduling_version is null
  )
  or
  (
    selection_source =
      'SCHEDULED_PAIR'
    and discovery_policy_version is null
    and pair_scheduling_version is not null
  )
);


-- Authoritative successor durable decision identity.
--
-- Empty-string normalization is safe because every populated policy/version
-- field is constrained to be nonblank.
--
-- The legacy hspp_recon_intent_decision_unique constraint is intentionally
-- retained as an additional B07B compatibility guard. This v2 unique index
-- is authoritative for the producer-neutral successor contract.
create unique index if not exists
  hspp_recon_intent_decision_identity_v2_unique
on
  public.hspp_reconstruction_execution_intents (
    organization_id,

    selected_first_evidence_id,
    selected_second_evidence_id,

    historical_evidence_id,
    historical_evidence_integrity_fingerprint,

    replacement_evidence_id,
    replacement_evidence_integrity_fingerprint,

    selection_source,

    (
      coalesce(
        discovery_policy_version,
        ''
      )
    ),

    (
      coalesce(
        pair_scheduling_version,
        ''
      )
    ),

    reservoir_eligibility_policy_version,

    reevaluation_policy_version,
    membership_policy_version,
    reconstruction_policy_version,
    reconstruction_reason
  );


comment on column
  public.hspp_reconstruction_execution_intents
    .selection_source
is
  'Immutable reconstruction selection-origin provenance. B07B_DISCOVERY means the pair came from B07B discovery/reevaluation. SCHEDULED_PAIR means the exact pair came from the global Reservoir pair scheduler. This field identifies producer origin only and grants no downstream authority.';


comment on column
  public.hspp_reconstruction_execution_intents
    .pair_scheduling_version
is
  'Producer-specific Reservoir pair scheduling provenance. Required only for SCHEDULED_PAIR intents and forbidden for B07B_DISCOVERY intents. It must never be substituted for B06A Reservoir eligibility, B07A reevaluation, B11A2 membership or reconstruction authority.';


comment on index
  public.hspp_recon_intent_decision_identity_v2_unique
is
  'B7490-Q14AG33A authoritative successor durable reconstruction decision identity. It preserves exact pair orientation and evidence fingerprints, distinguishes B07B_DISCOVERY from SCHEDULED_PAIR origin, normalizes the intentionally nullable producer-specific provenance fields, and includes producer-neutral B06A Reservoir eligibility plus B07A, B11A2 and reconstruction provenance.';


commit;