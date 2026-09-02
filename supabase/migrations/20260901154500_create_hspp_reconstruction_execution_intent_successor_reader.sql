-- ============================================================================
-- B7490-Q14AG33C
-- Successor HSPP reconstruction execution-intent read authority.
--
-- Q14ag33C deliberately does NOT replace Q14ag31F/Q14ag31O.
--
-- The existing canonical reader remains authoritative for:
-- - organization scoping;
-- - paired keyset pagination;
-- - page-size validation;
-- - CLAIMED_NOT_PERSISTED / RECONSTRUCTION_PERSISTED classification;
-- - persisted reconstruction consistency checks;
-- - server-side persistence-state filtering;
-- - deterministic created_at + intent_id ordering.
--
-- This successor reader delegates those semantics to the existing reader,
-- then enriches each exact intent with the durable provenance added by
-- Q14ag33A/Q14ag33B:
--
-- - selection_source;
-- - nullable B07B discovery_policy_version;
-- - nullable scheduled-pair pair_scheduling_version;
-- - producer-neutral B06A reservoir_eligibility_policy_version.
--
-- This function:
-- - is read-only;
-- - does not claim execution intent;
-- - does not execute reconstruction;
-- - does not hydrate replacement evidence;
-- - does not schedule Reservoir pairs;
-- - does not advance pair cursors;
-- - grants no downstream semantic authority.
-- ============================================================================

begin;


create or replace function
  public.read_hspp_reconstruction_execution_intents_v2(
    p_organization_id uuid,
    p_limit integer default 100,
    p_before_created_at timestamptz default null,
    p_before_intent_id uuid default null,
    p_persistence_state text default null
  )
returns table (
  intent_id uuid,
  organization_id uuid,
  child_assembly_id uuid,

  selected_first_evidence_id uuid,
  selected_second_evidence_id uuid,

  historical_evidence_id uuid,
  historical_evidence_integrity_fingerprint text,

  replacement_evidence_id uuid,
  replacement_evidence_integrity_fingerprint text,

  selection_source text,

  discovery_policy_version text,
  pair_scheduling_version text,

  reservoir_eligibility_policy_version text,

  reevaluation_policy_version text,
  membership_policy_version text,

  reconstruction_policy_version text,
  reconstruction_reason text,

  intent_version text,
  created_at timestamptz,

  persistence_state text,

  reconstruction_id uuid,
  parent_assembly_id uuid,

  assembly_state text,
  sealed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    legacy.intent_id,
    legacy.organization_id,
    legacy.child_assembly_id,

    legacy.selected_first_evidence_id,
    legacy.selected_second_evidence_id,

    legacy.historical_evidence_id,
    legacy.historical_evidence_integrity_fingerprint,

    legacy.replacement_evidence_id,
    legacy.replacement_evidence_integrity_fingerprint,

    durable.selection_source,

    durable.discovery_policy_version,
    durable.pair_scheduling_version,

    durable.reservoir_eligibility_policy_version,

    legacy.reevaluation_policy_version,
    legacy.membership_policy_version,

    legacy.reconstruction_policy_version,
    legacy.reconstruction_reason,

    legacy.intent_version,
    legacy.created_at,

    legacy.persistence_state,

    legacy.reconstruction_id,
    legacy.parent_assembly_id,

    legacy.assembly_state,
    legacy.sealed_at
  from
    public.read_hspp_reconstruction_execution_intents(
      p_organization_id,
      p_limit,
      p_before_created_at,
      p_before_intent_id,
      p_persistence_state
    )
      as legacy
  join
    public.hspp_reconstruction_execution_intents
      as durable
    on durable.id =
      legacy.intent_id
    and durable.organization_id =
      legacy.organization_id
    and durable.child_assembly_id =
      legacy.child_assembly_id
    and durable.discovery_policy_version
      is not distinct from
        legacy.discovery_policy_version
  order by
    legacy.created_at desc,
    legacy.intent_id desc;
$$;


comment on function
  public.read_hspp_reconstruction_execution_intents_v2(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
is
  'B7490-Q14AG33C service-role-only successor HSPP reconstruction execution-intent reader. It delegates lifecycle classification, server-side persistence-state filtering, paired keyset pagination and deterministic ordering to the existing Q14ag31F/Q14ag31O canonical reader, then enriches each exact durable intent with selection_source, nullable producer-specific discovery/pair-scheduling provenance and producer-neutral B06A Reservoir eligibility provenance. It performs no claim, reconstruction, replacement hydration, Reservoir discovery, pair scheduling, cursor CAS, sealing, assessment, trust mutation or downstream authority transition.';


revoke all on function
  public.read_hspp_reconstruction_execution_intents_v2(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from public;


revoke all on function
  public.read_hspp_reconstruction_execution_intents_v2(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from anon;


revoke all on function
  public.read_hspp_reconstruction_execution_intents_v2(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from authenticated;


revoke all on function
  public.read_hspp_reconstruction_execution_intents_v2(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from service_role;


grant execute on function
  public.read_hspp_reconstruction_execution_intents_v2(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
to service_role;


commit;