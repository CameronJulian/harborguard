-- Q14r
--
-- Controlled durable positive-assessment checkpoint writer.
--
-- This function composes:
--
--   1. the existing execution-lease-fenced evidence assessment mutation; and
--   2. the immutable Q14p positive-assessment checkpoint;
--
-- inside one PostgreSQL transaction.
--
-- It does not:
--
-- - promote or supersede an assembly;
-- - establish effective membership;
-- - detach evidence;
-- - return evidence to the Reservoir;
-- - select replacement evidence;
-- - reconstruct a child assembly;
-- - grant Route Safety, Crowd, ML or validation authority;
-- - replace the existing generic assessment writer;
-- - weaken the existing fenced assessment writer.
--
-- A non-lease Q6 persistence path does not call this function and therefore
-- cannot create this durable checkpoint.

create or replace function
public.persist_hspp_positive_assessment_checkpoint_under_execution_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid,
  p_assembly_decision_id uuid,
  p_evidence_id uuid,
  p_integrity_fingerprint text,
  p_assessed_at timestamptz
)
returns table (
  evidence_id uuid,
  trust_state text,
  operational_eligible boolean,
  crowd_eligible boolean,
  training_eligible boolean,
  validation_eligible boolean,
  assessment_policy_version text,
  assessment_reason text,
  assessed_at timestamptz,
  checkpoint_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assembly_state text;

  v_decision
    public.hspp_assembly_decisions%rowtype;

  v_checkpoint
    public.hspp_assembly_positive_assessment_checkpoints%rowtype;

  v_applied record;
begin
  if p_organization_id is null then
    raise exception
      'organization_id is required';
  end if;

  if p_assembly_id is null then
    raise exception
      'assembly_id is required';
  end if;

  if p_lease_token is null then
    raise exception
      'lease_token is required';
  end if;

  if p_assembly_decision_id is null then
    raise exception
      'assembly_decision_id is required';
  end if;

  if p_evidence_id is null then
    raise exception
      'evidence_id is required';
  end if;

  if (
    p_integrity_fingerprint is null
    or p_integrity_fingerprint !~ '^[a-f0-9]{64}$'
  ) then
    raise exception
      'integrity_fingerprint must be a lowercase SHA-256 fingerprint';
  end if;

  if p_assessed_at is null then
    raise exception
      'assessed_at is required';
  end if;


  -- ----------------------------------------------------------
  -- Exact SEALED assembly authority boundary.
  -- ----------------------------------------------------------

  select
    assembly.assembly_state
  into
    v_assembly_state
  from
    public.hspp_evidence_assemblies as assembly
  where
    assembly.organization_id = p_organization_id
    and assembly.id = p_assembly_id
  for key share;

  if not found then
    raise exception
      'HSPP assembly does not exist for organization';
  end if;

  if v_assembly_state <> 'SEALED' then
    raise exception
      'Positive HSPP checkpoint requires a SEALED assembly';
  end if;


  -- ----------------------------------------------------------
  -- Exact immutable assembly-decision provenance.
  --
  -- The Q14p table intentionally stores only the decision id.
  -- This writer independently proves that the immutable decision
  -- belongs to this exact organization and assembly.
  -- ----------------------------------------------------------

  select
    decision.*
  into
    v_decision
  from
    public.hspp_assembly_decisions as decision
  where
    decision.id = p_assembly_decision_id
    and decision.organization_id = p_organization_id
    and decision.assembly_id = p_assembly_id
  for key share;

  if not found then
    raise exception
      'Assembly decision does not belong to the exact organization and assembly';
  end if;

  if (
    v_decision.assembly_decision_state <> 'CONSISTENT'
    or v_decision.assembly_decision_reason <>
      'CANONICAL_AGREEMENT_WITHOUT_CONFLICT'
    or v_decision.authority <> 'NONE'
  ) then
    raise exception
      'Positive HSPP checkpoint requires the exact consistent assembly decision';
  end if;


  -- ----------------------------------------------------------
  -- Existing fenced assessment mutation.
  --
  -- The exact positive Q6 tuple is database-owned here rather
  -- than caller-selectable.
  --
  -- Because this nested function call executes in this same
  -- PostgreSQL transaction, any later checkpoint failure rolls
  -- back the evidence mutation as well.
  -- ----------------------------------------------------------

  select
    applied.*
  into
    v_applied
  from
    public.apply_hspp_assessment_decision_under_execution_lease(
      p_organization_id,
      p_assembly_id,
      p_lease_token,
      p_evidence_id,
      p_integrity_fingerprint,
      'CORROBORATED',
      true,
      false,
      false,
      false,
      'hspp-corroborated-operational-assessment-v1',
      'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED',
      p_assessed_at
    ) as applied;

  if not found then
    raise exception
      'Fenced positive HSPP assessment mutation returned no row';
  end if;


  if (
    v_applied.evidence_id <> p_evidence_id
    or v_applied.trust_state <> 'CORROBORATED'
    or v_applied.operational_eligible <> true
    or v_applied.crowd_eligible <> false
    or v_applied.training_eligible <> false
    or v_applied.validation_eligible <> false
    or v_applied.assessment_policy_version <>
      'hspp-corroborated-operational-assessment-v1'
    or v_applied.assessment_reason <>
      'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED'
    or v_applied.assessed_at <> p_assessed_at
  ) then
    raise exception
      'Fenced positive HSPP assessment result is not the exact Q6 tuple';
  end if;


  -- ----------------------------------------------------------
  -- Immutable positive checkpoint.
  -- ----------------------------------------------------------

  insert into
    public.hspp_assembly_positive_assessment_checkpoints (
      organization_id,
      assembly_id,
      assembly_decision_id,
      evidence_id,
      integrity_fingerprint,
      assessment_persistence_version,
      assessment_policy_version,
      trust_state,
      operational_eligible,
      crowd_eligible,
      training_eligible,
      validation_eligible,
      assessment_reason,
      assessed_at
    )
  values (
    p_organization_id,
    p_assembly_id,
    p_assembly_decision_id,
    p_evidence_id,
    p_integrity_fingerprint,
    'hspp-corroborated-operational-assessment-persistence-v1',
    'hspp-corroborated-operational-assessment-v1',
    'CORROBORATED',
    true,
    false,
    false,
    false,
    'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED',
    p_assessed_at
  )
  on conflict (
    organization_id,
    assembly_id
  )
  do nothing
  returning
    *
  into
    v_checkpoint;


  -- ----------------------------------------------------------
  -- Deterministic exact-retry recovery.
  --
  -- One already-existing checkpoint is success only when every
  -- immutable positive-assessment identity is exactly identical.
  --
  -- A conflicting retry raises an exception. Because this is one
  -- transaction, that exception also rolls back the fenced evidence
  -- mutation performed above.
  -- ----------------------------------------------------------

  if not found then
    select
      checkpoint.*
    into
      v_checkpoint
    from
      public.hspp_assembly_positive_assessment_checkpoints as checkpoint
    where
      checkpoint.organization_id = p_organization_id
      and checkpoint.assembly_id = p_assembly_id
    for key share;

    if not found then
      raise exception
        'Positive HSPP checkpoint conflict occurred but existing checkpoint could not be recovered';
    end if;
  end if;


  if (
    v_checkpoint.organization_id <> p_organization_id
    or v_checkpoint.assembly_id <> p_assembly_id
    or v_checkpoint.assembly_decision_id <> p_assembly_decision_id
    or v_checkpoint.evidence_id <> p_evidence_id
    or v_checkpoint.integrity_fingerprint <> p_integrity_fingerprint
    or v_checkpoint.checkpoint_version <>
      'hspp-assembly-positive-assessment-checkpoint-v1'
    or v_checkpoint.assessment_persistence_version <>
      'hspp-corroborated-operational-assessment-persistence-v1'
    or v_checkpoint.assessment_policy_version <>
      'hspp-corroborated-operational-assessment-v1'
    or v_checkpoint.trust_state <> 'CORROBORATED'
    or v_checkpoint.operational_eligible <> true
    or v_checkpoint.crowd_eligible <> false
    or v_checkpoint.training_eligible <> false
    or v_checkpoint.validation_eligible <> false
    or v_checkpoint.assessment_reason <>
      'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED'
    or v_checkpoint.assessed_at <> p_assessed_at
  ) then
    raise exception
      'Conflicting positive HSPP checkpoint retry';
  end if;


  return query
  select
    v_applied.evidence_id,
    v_applied.trust_state,
    v_applied.operational_eligible,
    v_applied.crowd_eligible,
    v_applied.training_eligible,
    v_applied.validation_eligible,
    v_applied.assessment_policy_version,
    v_applied.assessment_reason,
    v_applied.assessed_at,
    v_checkpoint.id;
end;
$$;


revoke all
on function
public.persist_hspp_positive_assessment_checkpoint_under_execution_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz
)
from
  public,
  anon,
  authenticated,
  service_role;


grant execute
on function
public.persist_hspp_positive_assessment_checkpoint_under_execution_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz
)
to
  service_role;


comment on function
public.persist_hspp_positive_assessment_checkpoint_under_execution_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz
)
is
'Q14r controlled lease-only atomic positive Q6 persistence boundary. It validates the SEALED assembly and exact immutable assembly decision, delegates the evidence mutation to the existing fenced assessment RPC, and persists the append-only Q14p positive checkpoint in the same PostgreSQL transaction. Exact retry is recoverable; conflicting retry fails closed. This function does not promote or supersede assemblies, alter effective membership, detach evidence, return evidence to the Reservoir, select replacement evidence, reconstruct child assemblies, or grant Route Safety, Crowd, ML or validation authority.';