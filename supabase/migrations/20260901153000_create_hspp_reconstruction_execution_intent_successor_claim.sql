-- ============================================================================
-- B7490-Q14AG33B
-- Successor durable HSPP reconstruction execution-intent claim authority.
--
-- This is a NEW claim-or-recover RPC. The deployed Q14ag31A
-- claim_hspp_reconstruction_execution_intent RPC remains unchanged.
--
-- Supported immutable selection origins:
--
-- B07B_DISCOVERY
--   discovery_policy_version: required
--   pair_scheduling_version: forbidden
--
-- SCHEDULED_PAIR
--   discovery_policy_version: null
--   pair_scheduling_version: required
--
-- Both producer types must independently carry:
-- - B06A Reservoir eligibility provenance;
-- - B07A reevaluation provenance;
-- - B11A2 membership provenance;
-- - reconstruction policy/reason provenance.
--
-- Q14ag33B remains intentionally pinned to the currently deployed
-- B06A policy version while the legacy B07B claim authority remains
-- available:
--
--   hspp-reservoir-eligibility-v1
--
-- This prevents a future B06A policy version from becoming ambiguous
-- to the legacy claim identity before legacy retirement/migration.
--
-- The RPC:
-- - claims one caller-proposed child UUID for a first exact decision;
-- - recovers the already-claimed canonical child for an exact retry;
-- - uses null-safe producer-specific provenance comparisons;
-- - preserves exact pair orientation;
-- - performs no reconstruction;
-- - creates no H2 assembly;
-- - performs no Reservoir discovery;
-- - performs no pair scheduling or cursor CAS;
-- - mutates no trust, evidence or lifecycle state.
-- ============================================================================

begin;


create or replace function
  public.claim_hspp_reconstruction_execution_intent_v2(
    p_organization_id uuid,
    p_proposed_child_assembly_id uuid,

    p_selected_first_evidence_id uuid,
    p_selected_second_evidence_id uuid,

    p_historical_evidence_id uuid,
    p_historical_evidence_integrity_fingerprint text,

    p_replacement_evidence_id uuid,
    p_replacement_evidence_integrity_fingerprint text,

    p_selection_source text,

    p_discovery_policy_version text,
    p_pair_scheduling_version text,

    p_reservoir_eligibility_policy_version text,

    p_reevaluation_policy_version text,
    p_membership_policy_version text,

    p_reconstruction_policy_version text,
    p_reconstruction_reason text
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

  idempotent_recovery boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_selection_source text;

  v_discovery_policy_version text;
  v_pair_scheduling_version text;

  v_reservoir_eligibility_policy_version text;

  v_reevaluation_policy_version text;
  v_membership_policy_version text;

  v_reconstruction_policy_version text;
  v_reconstruction_reason text;

  v_existing
    public.hspp_reconstruction_execution_intents%rowtype;

  v_inserted
    public.hspp_reconstruction_execution_intents%rowtype;
begin
  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;


  if p_proposed_child_assembly_id is null then
    raise exception
      'p_proposed_child_assembly_id is required';
  end if;


  if
    p_selected_first_evidence_id is null
    or p_selected_second_evidence_id is null
  then
    raise exception
      'Both selected evidence identities are required';
  end if;


  if
    p_historical_evidence_id is null
    or p_replacement_evidence_id is null
  then
    raise exception
      'Historical and replacement evidence identities are required';
  end if;


  if
    p_selected_first_evidence_id =
      p_selected_second_evidence_id
  then
    raise exception
      'Selected reconstruction evidence identities must be distinct';
  end if;


  if
    p_historical_evidence_id =
      p_replacement_evidence_id
  then
    raise exception
      'Historical and replacement reconstruction roles must be distinct';
  end if;


  if not (
    (
      p_selected_first_evidence_id =
        p_historical_evidence_id
      and
      p_selected_second_evidence_id =
        p_replacement_evidence_id
    )
    or
    (
      p_selected_first_evidence_id =
        p_replacement_evidence_id
      and
      p_selected_second_evidence_id =
        p_historical_evidence_id
    )
  ) then
    raise exception
      'Selected reconstruction pair must exactly contain the historical and replacement evidence identities';
  end if;


  if
    p_historical_evidence_integrity_fingerprint is null
    or
    p_historical_evidence_integrity_fingerprint
      !~ '^[0-9a-f]{64}$'
  then
    raise exception
      'p_historical_evidence_integrity_fingerprint must be lowercase SHA-256';
  end if;


  if
    p_replacement_evidence_integrity_fingerprint is null
    or
    p_replacement_evidence_integrity_fingerprint
      !~ '^[0-9a-f]{64}$'
  then
    raise exception
      'p_replacement_evidence_integrity_fingerprint must be lowercase SHA-256';
  end if;


  if
    p_selection_source is null
    or length(trim(p_selection_source))
      not between 1 and 128
  then
    raise exception
      'p_selection_source is required';
  end if;

  v_selection_source =
    trim(p_selection_source);


  if v_selection_source not in (
    'B07B_DISCOVERY',
    'SCHEDULED_PAIR'
  ) then
    raise exception
      'p_selection_source must be B07B_DISCOVERY or SCHEDULED_PAIR';
  end if;


  v_discovery_policy_version =
    case
      when p_discovery_policy_version is null
        then null
      else trim(p_discovery_policy_version)
    end;

  v_pair_scheduling_version =
    case
      when p_pair_scheduling_version is null
        then null
      else trim(p_pair_scheduling_version)
    end;


  if v_selection_source = 'B07B_DISCOVERY' then

    if
      v_discovery_policy_version is null
      or length(v_discovery_policy_version)
        not between 1 and 128
    then
      raise exception
        'B07B_DISCOVERY requires discovery policy provenance';
    end if;

    if v_pair_scheduling_version is not null then
      raise exception
        'B07B_DISCOVERY forbids pair scheduling provenance';
    end if;

  else

    if v_discovery_policy_version is not null then
      raise exception
        'SCHEDULED_PAIR forbids fabricated discovery provenance';
    end if;

    if
      v_pair_scheduling_version is null
      or length(v_pair_scheduling_version)
        not between 1 and 128
    then
      raise exception
        'SCHEDULED_PAIR requires pair scheduling provenance';
    end if;

  end if;


  if
    p_reservoir_eligibility_policy_version is null
    or
    length(
      trim(
        p_reservoir_eligibility_policy_version
      )
    ) not between 1 and 128
  then
    raise exception
      'p_reservoir_eligibility_policy_version is required';
  end if;

  v_reservoir_eligibility_policy_version =
    trim(
      p_reservoir_eligibility_policy_version
    );


  if
    v_reservoir_eligibility_policy_version <>
      'hspp-reservoir-eligibility-v1'
  then
    raise exception
      'Q14ag33B supports only hspp-reservoir-eligibility-v1 while the legacy claim identity remains available';
  end if;


  if
    p_reevaluation_policy_version is null
    or
    length(
      trim(
        p_reevaluation_policy_version
      )
    ) not between 1 and 128
  then
    raise exception
      'p_reevaluation_policy_version is required';
  end if;

  v_reevaluation_policy_version =
    trim(p_reevaluation_policy_version);


  if
    p_membership_policy_version is null
    or
    length(
      trim(
        p_membership_policy_version
      )
    ) not between 1 and 128
  then
    raise exception
      'p_membership_policy_version is required';
  end if;

  v_membership_policy_version =
    trim(p_membership_policy_version);


  if
    p_reconstruction_policy_version is null
    or
    length(
      trim(
        p_reconstruction_policy_version
      )
    ) not between 1 and 128
  then
    raise exception
      'p_reconstruction_policy_version is required';
  end if;

  v_reconstruction_policy_version =
    trim(p_reconstruction_policy_version);


  if
    p_reconstruction_reason is null
    or length(trim(p_reconstruction_reason)) < 1
  then
    raise exception
      'p_reconstruction_reason is required';
  end if;

  v_reconstruction_reason =
    trim(p_reconstruction_reason);


  -- --------------------------------------------------------------------------
  -- Exact immutable decision recovery before attempting a new claim.
  --
  -- IS NOT DISTINCT FROM is required for the producer-specific nullable
  -- provenance family:
  --
  -- B07B_DISCOVERY -> discovery non-null, pair scheduling null.
  -- SCHEDULED_PAIR -> discovery null, pair scheduling non-null.
  -- --------------------------------------------------------------------------

  select
    intent.*
  into
    v_existing
  from
    public.hspp_reconstruction_execution_intents
      as intent
  where
    intent.organization_id =
      p_organization_id

    and intent.selected_first_evidence_id =
      p_selected_first_evidence_id

    and intent.selected_second_evidence_id =
      p_selected_second_evidence_id

    and intent.historical_evidence_id =
      p_historical_evidence_id

    and intent.historical_evidence_integrity_fingerprint =
      p_historical_evidence_integrity_fingerprint

    and intent.replacement_evidence_id =
      p_replacement_evidence_id

    and intent.replacement_evidence_integrity_fingerprint =
      p_replacement_evidence_integrity_fingerprint

    and intent.selection_source =
      v_selection_source

    and intent.discovery_policy_version
      is not distinct from
        v_discovery_policy_version

    and intent.pair_scheduling_version
      is not distinct from
        v_pair_scheduling_version

    and intent.reservoir_eligibility_policy_version =
      v_reservoir_eligibility_policy_version

    and intent.reevaluation_policy_version =
      v_reevaluation_policy_version

    and intent.membership_policy_version =
      v_membership_policy_version

    and intent.reconstruction_policy_version =
      v_reconstruction_policy_version

    and intent.reconstruction_reason =
      v_reconstruction_reason;

  if found then
    return query
    select
      v_existing.id,
      v_existing.organization_id,
      v_existing.child_assembly_id,

      v_existing.selected_first_evidence_id,
      v_existing.selected_second_evidence_id,

      v_existing.historical_evidence_id,
      v_existing.historical_evidence_integrity_fingerprint,

      v_existing.replacement_evidence_id,
      v_existing.replacement_evidence_integrity_fingerprint,

      v_existing.selection_source,

      v_existing.discovery_policy_version,
      v_existing.pair_scheduling_version,

      v_existing.reservoir_eligibility_policy_version,

      v_existing.reevaluation_policy_version,
      v_existing.membership_policy_version,

      v_existing.reconstruction_policy_version,
      v_existing.reconstruction_reason,

      v_existing.intent_version,
      v_existing.created_at,

      true;

    return;
  end if;


  -- A fresh decision may not steal an already-claimed child UUID.

  if exists (
    select 1
    from
      public.hspp_reconstruction_execution_intents
        as existing_child
    where
      existing_child.child_assembly_id =
        p_proposed_child_assembly_id
  ) then
    raise exception
      'Proposed reconstruction intent child UUID is already claimed by another durable decision';
  end if;


  -- A fresh intent must not claim an already-created HSPP assembly UUID.

  if exists (
    select 1
    from
      public.hspp_evidence_assemblies
        as existing_assembly
    where
      existing_assembly.id =
        p_proposed_child_assembly_id
  ) then
    raise exception
      'Proposed reconstruction intent child UUID is already owned by an HSPP assembly';
  end if;


  -- --------------------------------------------------------------------------
  -- Atomic first claim.
  --
  -- Any unique conflict is intentionally converted into a no-row insert.
  -- The exact decision is then re-read below. An identical concurrent claim
  -- recovers the canonical child. A conflicting child/identity collision
  -- fails closed because the exact successor identity will not be found.
  -- --------------------------------------------------------------------------

  insert into
    public.hspp_reconstruction_execution_intents (
      organization_id,
      child_assembly_id,

      selected_first_evidence_id,
      selected_second_evidence_id,

      historical_evidence_id,
      historical_evidence_integrity_fingerprint,

      replacement_evidence_id,
      replacement_evidence_integrity_fingerprint,

      selection_source,

      discovery_policy_version,
      pair_scheduling_version,

      reservoir_eligibility_policy_version,

      reevaluation_policy_version,
      membership_policy_version,

      reconstruction_policy_version,
      reconstruction_reason
    )
  values (
    p_organization_id,
    p_proposed_child_assembly_id,

    p_selected_first_evidence_id,
    p_selected_second_evidence_id,

    p_historical_evidence_id,
    p_historical_evidence_integrity_fingerprint,

    p_replacement_evidence_id,
    p_replacement_evidence_integrity_fingerprint,

    v_selection_source,

    v_discovery_policy_version,
    v_pair_scheduling_version,

    v_reservoir_eligibility_policy_version,

    v_reevaluation_policy_version,
    v_membership_policy_version,

    v_reconstruction_policy_version,
    v_reconstruction_reason
  )
  on conflict do nothing
  returning *
  into
    v_inserted;


  if not found then

    select
      intent.*
    into
      v_existing
    from
      public.hspp_reconstruction_execution_intents
        as intent
    where
      intent.organization_id =
        p_organization_id

      and intent.selected_first_evidence_id =
        p_selected_first_evidence_id

      and intent.selected_second_evidence_id =
        p_selected_second_evidence_id

      and intent.historical_evidence_id =
        p_historical_evidence_id

      and intent.historical_evidence_integrity_fingerprint =
        p_historical_evidence_integrity_fingerprint

      and intent.replacement_evidence_id =
        p_replacement_evidence_id

      and intent.replacement_evidence_integrity_fingerprint =
        p_replacement_evidence_integrity_fingerprint

      and intent.selection_source =
        v_selection_source

      and intent.discovery_policy_version
        is not distinct from
          v_discovery_policy_version

      and intent.pair_scheduling_version
        is not distinct from
          v_pair_scheduling_version

      and intent.reservoir_eligibility_policy_version =
        v_reservoir_eligibility_policy_version

      and intent.reevaluation_policy_version =
        v_reevaluation_policy_version

      and intent.membership_policy_version =
        v_membership_policy_version

      and intent.reconstruction_policy_version =
        v_reconstruction_policy_version

      and intent.reconstruction_reason =
        v_reconstruction_reason;

    if found then
      return query
      select
        v_existing.id,
        v_existing.organization_id,
        v_existing.child_assembly_id,

        v_existing.selected_first_evidence_id,
        v_existing.selected_second_evidence_id,

        v_existing.historical_evidence_id,
        v_existing.historical_evidence_integrity_fingerprint,

        v_existing.replacement_evidence_id,
        v_existing.replacement_evidence_integrity_fingerprint,

        v_existing.selection_source,

        v_existing.discovery_policy_version,
        v_existing.pair_scheduling_version,

        v_existing.reservoir_eligibility_policy_version,

        v_existing.reevaluation_policy_version,
        v_existing.membership_policy_version,

        v_existing.reconstruction_policy_version,
        v_existing.reconstruction_reason,

        v_existing.intent_version,
        v_existing.created_at,

        true;

      return;
    end if;


    raise exception
      'Concurrent successor reconstruction intent claim conflict did not resolve to the exact durable decision';
  end if;


  -- Recheck cross-table child ownership before returning the fresh claim.

  if exists (
    select 1
    from
      public.hspp_evidence_assemblies
        as existing_assembly
    where
      existing_assembly.id =
        p_proposed_child_assembly_id
  ) then
    raise exception
      'New successor reconstruction intent child UUID became owned by an HSPP assembly before intent claim completed';
  end if;


  return query
  select
    v_inserted.id,
    v_inserted.organization_id,
    v_inserted.child_assembly_id,

    v_inserted.selected_first_evidence_id,
    v_inserted.selected_second_evidence_id,

    v_inserted.historical_evidence_id,
    v_inserted.historical_evidence_integrity_fingerprint,

    v_inserted.replacement_evidence_id,
    v_inserted.replacement_evidence_integrity_fingerprint,

    v_inserted.selection_source,

    v_inserted.discovery_policy_version,
    v_inserted.pair_scheduling_version,

    v_inserted.reservoir_eligibility_policy_version,

    v_inserted.reevaluation_policy_version,
    v_inserted.membership_policy_version,

    v_inserted.reconstruction_policy_version,
    v_inserted.reconstruction_reason,

    v_inserted.intent_version,
    v_inserted.created_at,

    false;
end;
$$;


comment on function
  public.claim_hspp_reconstruction_execution_intent_v2(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
is
  'B7490-Q14AG33B service-role-only successor atomic claim-or-recover authority for immutable HSPP reconstruction execution intent. It supports B07B_DISCOVERY and SCHEDULED_PAIR producer provenance without fabricating discovery authority, persists producer-neutral B06A Reservoir eligibility plus B07A/B11A2/reconstruction provenance, preserves exact pair orientation and canonical child retry identity, and converges concurrent identical claims through the durable unique identity. This function does not perform Reservoir discovery, schedule pairs, advance pair cursors, execute reconstruction, create H2, seal or assess assemblies, or mutate evidence/trust/lifecycle state.';


revoke all on function
  public.claim_hspp_reconstruction_execution_intent_v2(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from public;


revoke all on function
  public.claim_hspp_reconstruction_execution_intent_v2(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from anon;


revoke all on function
  public.claim_hspp_reconstruction_execution_intent_v2(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
from authenticated;


grant execute on function
  public.claim_hspp_reconstruction_execution_intent_v2(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text
  )
to service_role;


commit;