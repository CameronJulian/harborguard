-- ============================================================
-- B7490-14X2
-- Dormant R1-aware lease-fenced Q14v persistence authority.
--
-- This migration extends the Q14v revalidation-basis substrate
-- introduced by B7490-14V2.
--
-- Historical member:
--
--   C
--
-- Later immutable evidence:
--
--   R1
--   parent_evidence_id = C.id
--   parent_integrity_fingerprint = C.integrity_fingerprint
--   derivation_type = post_positive_revalidation
--   derivation_version = hspp-post-positive-revalidation-v1
--
-- The new RPC accepts both exact C identity and exact R1 identity.
-- PostgreSQL independently verifies that R1 is cryptographically
-- lineage-bound to C and that its observation is post-positive.
--
-- IMPORTANT:
-- The new RPC intentionally receives NO EXECUTE grant in this
-- migration. It remains dormant until the R1 reader/evaluator and
-- application orchestration are complete and a later cutover grants
-- service_role execution.
--
-- This migration does NOT:
-- - mutate C;
-- - mutate H1;
-- - revoke Q14p;
-- - create R1;
-- - interpret R1 normalized-payload semantics;
-- - create cessation;
-- - return evidence to Reservoir;
-- - select C2;
-- - create H2;
-- - run reconstruction;
-- - run whole-composite validation;
-- - alter the existing seven-argument Q14x V1 RPC.
-- ============================================================

begin;


-- ============================================================
-- Independent INSERT-time R1 provenance validation.
--
-- NULL/NULL is retained for historical/pre-extension Q14v rows.
-- When R1 identity is present, its exact immutable evidence row,
-- lineage to C, derivation identity, and chronology are enforced.
-- ============================================================

create or replace function
  public.enforce_hspp_member_unsuitability_revalidation_basis_insert()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_revalidation
    public.hspp_evidence%rowtype;

  v_positive
    public.hspp_assembly_positive_assessment_checkpoints%rowtype;
begin

  if
    new.revalidation_evidence_id is null
    and
    new.revalidation_integrity_fingerprint is null
  then
    return new;
  end if;


  if
    new.revalidation_evidence_id is null
    or
    new.revalidation_integrity_fingerprint is null
  then
    raise exception
      'Q14v revalidation basis requires complete R1 evidence identity.';
  end if;


  if
    new.revalidation_evidence_id =
      new.evidence_id
  then
    raise exception
      'Q14v revalidation evidence must be distinct from historical member C.';
  end if;


  select
    revalidation.*
  into
    v_revalidation
  from
    public.hspp_evidence
      as revalidation
  where
    revalidation.organization_id =
      new.organization_id
    and
    revalidation.id =
      new.revalidation_evidence_id
    and
    revalidation.integrity_fingerprint =
      new.revalidation_integrity_fingerprint
  for key share;


  if not found then
    raise exception
      'Q14v revalidation basis does not resolve exact immutable R1 evidence identity.';
  end if;


  if
    v_revalidation.parent_evidence_id
      is distinct from
      new.evidence_id
    or
    v_revalidation.parent_integrity_fingerprint
      is distinct from
      new.integrity_fingerprint
  then
    raise exception
      'Q14v revalidation basis is not lineage-bound to the exact historical member C.';
  end if;


  if
    v_revalidation.derivation_type
      is distinct from
      'post_positive_revalidation'
    or
    v_revalidation.derivation_version
      is distinct from
      'hspp-post-positive-revalidation-v1'
  then
    raise exception
      'Q14v revalidation basis does not use the canonical post-positive revalidation derivation.';
  end if;


  select
    positive.*
  into
    v_positive
  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive
  where
    positive.id =
      new.prior_positive_checkpoint_id
  for key share;


  if not found then
    raise exception
      'Q14v revalidation basis requires the exact prior positive checkpoint.';
  end if;


  if
    v_positive.organization_id <>
      new.organization_id
    or
    v_positive.assembly_id <>
      new.assembly_id
    or
    v_positive.evidence_id <>
      new.evidence_id
    or
    v_positive.integrity_fingerprint <>
      new.integrity_fingerprint
  then
    raise exception
      'Q14v revalidation basis does not match the exact prior positive C identity.';
  end if;


  if
    v_revalidation.observed_at <
      v_positive.assessed_at
  then
    raise exception
      'Q14v R1 observation must not precede the prior positive assessment.';
  end if;


  if
    new.observed_at <>
      v_revalidation.observed_at
  then
    raise exception
      'Q14v observed_at must equal the exact R1 evidence observation time.';
  end if;


  return new;

end;
$function$;


drop trigger if exists
  hspp_member_unsuitability_revalidation_validate_insert
on
  public.hspp_assembly_member_unsuitability_checkpoints;


create trigger
  hspp_member_unsuitability_revalidation_validate_insert
before insert
on
  public.hspp_assembly_member_unsuitability_checkpoints
for each row
execute function
  public.enforce_hspp_member_unsuitability_revalidation_basis_insert();


-- ============================================================
-- New R1-aware writer.
--
-- The old seven-argument Q14x RPC remains unchanged.
-- This new RPC is deliberately NOT executable by service_role yet.
-- ============================================================

create or replace function
  public.persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease(
    p_organization_id uuid,
    p_assembly_id uuid,
    p_lease_token uuid,
    p_evidence_id uuid,
    p_integrity_fingerprint text,
    p_revalidation_evidence_id uuid,
    p_revalidation_integrity_fingerprint text,
    p_observed_at timestamptz,
    p_decided_at timestamptz
  )
returns table (
  checkpoint_id uuid,
  organization_id uuid,
  assembly_id uuid,
  evidence_id uuid,
  integrity_fingerprint text,
  revalidation_evidence_id uuid,
  revalidation_integrity_fingerprint text,
  prior_positive_checkpoint_id uuid,
  checkpoint_version text,
  unsuitability_policy_version text,
  unsuitability_reason text,
  observed_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_assembly_state text;

  v_now timestamptz;

  v_lease
    public.hspp_assembly_assessment_execution_leases%rowtype;

  v_positive
    public.hspp_assembly_positive_assessment_checkpoints%rowtype;

  v_revalidation
    public.hspp_evidence%rowtype;

  v_checkpoint
    public.hspp_assembly_member_unsuitability_checkpoints%rowtype;
begin

  -- ----------------------------------------------------------
  -- Exact caller-owned identities.
  -- ----------------------------------------------------------

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


  if p_evidence_id is null then
    raise exception
      'evidence_id is required';
  end if;


  if (
    p_integrity_fingerprint is null
    or
    p_integrity_fingerprint !~ '^[a-f0-9]{64}$'
  ) then
    raise exception
      'integrity_fingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint';
  end if;


  if p_revalidation_evidence_id is null then
    raise exception
      'revalidation_evidence_id is required';
  end if;


  if
    p_revalidation_evidence_id =
      p_evidence_id
  then
    raise exception
      'revalidation_evidence_id must be distinct from historical evidence_id';
  end if;


  if (
    p_revalidation_integrity_fingerprint is null
    or
    p_revalidation_integrity_fingerprint !~ '^[a-f0-9]{64}$'
  ) then
    raise exception
      'revalidation_integrity_fingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint';
  end if;


  if p_observed_at is null then
    raise exception
      'observed_at is required';
  end if;


  if p_decided_at is null then
    raise exception
      'decided_at is required';
  end if;


  if p_decided_at < p_observed_at then
    raise exception
      'decided_at must not precede observed_at';
  end if;


  -- ----------------------------------------------------------
  -- Canonical lock order: assembly then lease.
  -- ----------------------------------------------------------

  select
    assembly.assembly_state
  into
    v_assembly_state
  from
    public.hspp_evidence_assemblies
      as assembly
  where
    assembly.organization_id =
      p_organization_id
    and
    assembly.id =
      p_assembly_id
  for key share;


  if not found then
    raise exception
      'HSPP assembly does not exist for organization';
  end if;


  if v_assembly_state <> 'SEALED' then
    raise exception
      'Post-positive member unsuitability requires a historical SEALED assembly';
  end if;


  select
    lease.*
  into
    v_lease
  from
    public.hspp_assembly_assessment_execution_leases
      as lease
  where
    lease.organization_id =
      p_organization_id
    and
    lease.assembly_id =
      p_assembly_id
  for update;


  if not found then
    raise exception
      'Active HSPP assessment execution lease is required';
  end if;


  v_now :=
    clock_timestamp();


  if v_lease.lease_token <> p_lease_token then
    raise exception
      'HSPP assessment execution lease is owned by another token';
  end if;


  if v_lease.expires_at <= v_now then
    raise exception
      'HSPP assessment execution lease has expired';
  end if;


  -- ----------------------------------------------------------
  -- Derive exact prior positive C identity.
  -- ----------------------------------------------------------

  select
    positive.*
  into
    v_positive
  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive
  where
    positive.organization_id =
      p_organization_id
    and
    positive.assembly_id =
      p_assembly_id
  for key share;


  if not found then
    raise exception
      'Prior positive HSPP assessment checkpoint is required';
  end if;


  if (
    v_positive.evidence_id <>
      p_evidence_id
    or
    v_positive.integrity_fingerprint <>
      p_integrity_fingerprint
  ) then
    raise exception
      'Post-positive member unsuitability target does not match the exact prior positive checkpoint';
  end if;


  -- ----------------------------------------------------------
  -- Resolve and independently bind exact immutable R1.
  -- ----------------------------------------------------------

  select
    revalidation.*
  into
    v_revalidation
  from
    public.hspp_evidence
      as revalidation
  where
    revalidation.organization_id =
      p_organization_id
    and
    revalidation.id =
      p_revalidation_evidence_id
    and
    revalidation.integrity_fingerprint =
      p_revalidation_integrity_fingerprint
  for key share;


  if not found then
    raise exception
      'Exact R1 revalidation evidence does not exist.';
  end if;


  if
    v_revalidation.parent_evidence_id
      is distinct from
      p_evidence_id
    or
    v_revalidation.parent_integrity_fingerprint
      is distinct from
      p_integrity_fingerprint
  then
    raise exception
      'R1 is not lineage-bound to the exact historical member C.';
  end if;


  if
    v_revalidation.derivation_type
      is distinct from
      'post_positive_revalidation'
    or
    v_revalidation.derivation_version
      is distinct from
      'hspp-post-positive-revalidation-v1'
  then
    raise exception
      'R1 does not use the canonical post-positive revalidation derivation.';
  end if;


  if
    v_revalidation.observed_at <
      v_positive.assessed_at
  then
    raise exception
      'R1 observation must not precede the prior positive assessment';
  end if;


  if
    p_observed_at <>
      v_revalidation.observed_at
  then
    raise exception
      'observed_at must equal exact R1 observed_at';
  end if;


  -- ----------------------------------------------------------
  -- Re-check lease immediately before durable Q14v write.
  -- ----------------------------------------------------------

  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before R1-based unsuitability persistence';
  end if;


  -- ----------------------------------------------------------
  -- Persist exact C + exact R1 provenance.
  --
  -- The INSERT trigger independently re-proves R1 lineage,
  -- derivation identity and chronology.
  -- ----------------------------------------------------------

  insert into
    public.hspp_assembly_member_unsuitability_checkpoints (
      organization_id,
      assembly_id,
      evidence_id,
      integrity_fingerprint,
      revalidation_evidence_id,
      revalidation_integrity_fingerprint,
      prior_positive_checkpoint_id,
      checkpoint_version,
      unsuitability_policy_version,
      unsuitability_reason,
      observed_at,
      decided_at
    )
  values (
    p_organization_id,
    p_assembly_id,
    p_evidence_id,
    p_integrity_fingerprint,
    p_revalidation_evidence_id,
    p_revalidation_integrity_fingerprint,
    v_positive.id,
    'hspp-assembly-member-unsuitability-checkpoint-v2',
    'hspp-post-positive-member-unsuitability-v2',
    'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION',
    p_observed_at,
    p_decided_at
  )
  on conflict
    do nothing
  returning
    *
  into
    v_checkpoint;


  -- ----------------------------------------------------------
  -- Exact immutable retry recovery.
  -- ----------------------------------------------------------

  if not found then

    select
      checkpoint.*
    into
      v_checkpoint
    from
      public.hspp_assembly_member_unsuitability_checkpoints
        as checkpoint
    where
      checkpoint.organization_id =
        p_organization_id
      and
      checkpoint.assembly_id =
        p_assembly_id
      and
      checkpoint.evidence_id =
        p_evidence_id
    for key share;


    if not found then

      select
        checkpoint.*
      into
        v_checkpoint
      from
        public.hspp_assembly_member_unsuitability_checkpoints
          as checkpoint
      where
        checkpoint.prior_positive_checkpoint_id =
          v_positive.id
      for key share;

    end if;

  end if;


  if not found then
    raise exception
      'R1-based unsuitability checkpoint conflict occurred but existing checkpoint could not be recovered';
  end if;


  if (
    v_checkpoint.organization_id <>
      p_organization_id
    or
    v_checkpoint.assembly_id <>
      p_assembly_id
    or
    v_checkpoint.evidence_id <>
      p_evidence_id
    or
    v_checkpoint.integrity_fingerprint <>
      p_integrity_fingerprint
    or
    v_checkpoint.revalidation_evidence_id
      is distinct from
      p_revalidation_evidence_id
    or
    v_checkpoint.revalidation_integrity_fingerprint
      is distinct from
      p_revalidation_integrity_fingerprint
    or
    v_checkpoint.prior_positive_checkpoint_id <>
      v_positive.id
    or
    v_checkpoint.checkpoint_version <>
      'hspp-assembly-member-unsuitability-checkpoint-v2'
    or
    v_checkpoint.unsuitability_policy_version <>
      'hspp-post-positive-member-unsuitability-v2'
    or
    v_checkpoint.unsuitability_reason <>
      'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'
    or
    v_checkpoint.observed_at <>
      p_observed_at
    or
    v_checkpoint.decided_at <>
      p_decided_at
  ) then
    raise exception
      'Conflicting R1-based post-positive HSPP member-unsuitability checkpoint retry';
  end if;


  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before R1-based unsuitability transaction completed';
  end if;


  return query
  select
    v_checkpoint.id,
    v_checkpoint.organization_id,
    v_checkpoint.assembly_id,
    v_checkpoint.evidence_id,
    v_checkpoint.integrity_fingerprint,
    v_checkpoint.revalidation_evidence_id,
    v_checkpoint.revalidation_integrity_fingerprint,
    v_checkpoint.prior_positive_checkpoint_id,
    v_checkpoint.checkpoint_version,
    v_checkpoint.unsuitability_policy_version,
    v_checkpoint.unsuitability_reason,
    v_checkpoint.observed_at,
    v_checkpoint.decided_at,
    v_checkpoint.created_at;

end;
$function$;


-- ============================================================
-- IMPORTANT: remain dormant.
--
-- PostgreSQL functions normally receive PUBLIC EXECUTE by default,
-- therefore revoke from every application role including
-- service_role. A later cutover migration may grant only
-- service_role after R1 semantics and orchestration are proven.
-- ============================================================

revoke all
on function
  public.persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    timestamptz,
    timestamptz
  )
from
  public,
  anon,
  authenticated,
  service_role;


revoke all
on function
  public.enforce_hspp_member_unsuitability_revalidation_basis_insert()
from
  public,
  anon,
  authenticated,
  service_role;


comment on function
  public.persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    text,
    timestamptz,
    timestamptz
  )
is
  'B7490-14X2 dormant lease-fenced Q14v writer binding one exact historical positive member C to one exact later immutable R1 evidence identity. PostgreSQL independently verifies active lease ownership, prior-positive C identity, exact R1 identity, exact R1-to-C lineage, canonical post-positive revalidation derivation and post-positive chronology. No application role receives EXECUTE authority in this migration.';


commit;
