-- ============================================================
-- HSPP Q14ab / Q14ac exact Q14v compatibility extension
--
-- Existing cessation semantics remain unchanged.
--
-- Accepted Q14v authority families:
--
--   legacy:
--     checkpoint-v1 + policy-v1 + no R1 provenance
--
--   R1:
--     checkpoint-v2 + policy-v2 + complete R1 provenance
--
-- Both retain the same canonical unsuitability reason.
-- Every mixed version/basis family fails closed.
--
-- This migration deliberately does not:
-- - alter the cessation table shape;
-- - alter cessation-v1 identity;
-- - alter Q14ac arguments or return shape;
-- - expose R1 provenance to the lifecycle work item;
-- - wire the R1 authoritative runner into the lifecycle cycle;
-- - grant Q14x-v2 execution authority.
-- ============================================================

begin;

create or replace function
  public.enforce_hspp_assembly_member_effective_cessation_insert()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_checkpoint
    public.hspp_assembly_member_unsuitability_checkpoints%rowtype;

  v_membership
    public.hspp_evidence_assembly_members%rowtype;

  v_assembly_state text;
begin

  if new.unsuitability_checkpoint_id is null then
    raise exception
      'Q14ab requires one exact Q14v unsuitability checkpoint id.';
  end if;


  select
    checkpoint.*
  into
    v_checkpoint
  from
    public.hspp_assembly_member_unsuitability_checkpoints
      as checkpoint
  where
    checkpoint.id =
      new.unsuitability_checkpoint_id
  for key share;


  if not found then
    raise exception
      'Q14ab referenced Q14v unsuitability checkpoint does not exist.';
  end if;


  if not (
    (
      v_checkpoint.checkpoint_version =
        'hspp-assembly-member-unsuitability-checkpoint-v1'

      and

      v_checkpoint.unsuitability_policy_version =
        'hspp-post-positive-member-unsuitability-v1'

      and

      v_checkpoint.unsuitability_reason =
        'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'

      and

      v_checkpoint.revalidation_evidence_id is null

      and

      v_checkpoint.revalidation_integrity_fingerprint is null
    )

    or

    (
      v_checkpoint.checkpoint_version =
        'hspp-assembly-member-unsuitability-checkpoint-v2'

      and

      v_checkpoint.unsuitability_policy_version =
        'hspp-post-positive-member-unsuitability-v2'

      and

      v_checkpoint.unsuitability_reason =
        'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'

      and

      v_checkpoint.revalidation_evidence_id is not null

      and

      v_checkpoint.revalidation_integrity_fingerprint is not null
    )
  ) then
    raise exception
      'Q14ab requires the exact canonical Q14v post-positive unsuitability authority.';
  end if;


  /*
   * Serialize a new cessation against Q14h reconstruction of the
   * same historical parent.
   *
   * Q14h locks the historical parent FOR UPDATE. This KEY SHARE
   * lock conflicts with that reconstruction lock so the lineage
   * leaf decision is not made independently of a concurrent H2
   * reconstruction.
   */

  select
    assembly.assembly_state
  into
    v_assembly_state
  from
    public.hspp_evidence_assemblies
      as assembly
  where
    assembly.organization_id =
      v_checkpoint.organization_id

    and

    assembly.id =
      v_checkpoint.assembly_id
  for key share;


  if not found then
    raise exception
      'Q14ab historical assembly does not exist.';
  end if;


  if v_assembly_state <> 'SEALED' then
    raise exception
      'Q14ab effective-membership cessation requires the exact historical SEALED assembly.';
  end if;


  /*
   * Q14k guarantees at most one direct successor.
   *
   * A new cessation is authorized only while this exact assembly
   * remains the current lineage leaf. Once H2 exists, any later
   * post-positive cessation must target the appropriate descendant
   * membership rather than rewriting H1 lifecycle state.
   */

  if exists (
    select 1
    from
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
    where
      reconstruction.organization_id =
        v_checkpoint.organization_id

      and

      reconstruction.parent_assembly_id =
        v_checkpoint.assembly_id
  ) then
    raise exception
      'Q14ab cannot create a new cessation for an assembly that already has a reconstruction successor.';
  end if;


  select
    membership.*
  into
    v_membership
  from
    public.hspp_evidence_assembly_members
      as membership
  where
    membership.organization_id =
      v_checkpoint.organization_id

    and

    membership.assembly_id =
      v_checkpoint.assembly_id

    and

    membership.evidence_id =
      v_checkpoint.evidence_id

    and

    membership.evidence_integrity_fingerprint =
      v_checkpoint.integrity_fingerprint
  for key share;


  if not found then
    raise exception
      'Q14ab cannot resolve the exact immutable historical membership authorized by Q14v.';
  end if;


  /*
   * Callers may omit every derived provenance field.
   *
   * If any future privileged writer supplies one explicitly, a
   * mismatch fails closed rather than silently rewriting identity.
   */

  if
    new.organization_id is not null

    and

    new.organization_id <>
      v_checkpoint.organization_id
  then
    raise exception
      'Q14ab organization identity conflicts with Q14v.';
  end if;


  if
    new.assembly_id is not null

    and

    new.assembly_id <>
      v_checkpoint.assembly_id
  then
    raise exception
      'Q14ab assembly identity conflicts with Q14v.';
  end if;


  if
    new.evidence_id is not null

    and

    new.evidence_id <>
      v_checkpoint.evidence_id
  then
    raise exception
      'Q14ab evidence identity conflicts with Q14v.';
  end if;


  if
    new.integrity_fingerprint is not null

    and

    new.integrity_fingerprint <>
      v_checkpoint.integrity_fingerprint
  then
    raise exception
      'Q14ab integrity fingerprint conflicts with Q14v.';
  end if;


  if
    new.historical_membership_id is not null

    and

    new.historical_membership_id <>
      v_membership.id
  then
    raise exception
      'Q14ab historical membership identity conflicts with the exact Q14v member.';
  end if;


  if
    new.ceased_at is not null

    and

    new.ceased_at <>
      v_checkpoint.decided_at
  then
    raise exception
      'Q14ab ceased_at must equal the exact Q14v decided_at authority time.';
  end if;


  if
    new.cessation_version is distinct from
      'hspp-assembly-member-effective-cessation-v1'

    or

    new.cessation_policy_version is distinct from
      'hspp-post-positive-effective-membership-cessation-v1'

    or

    new.cessation_reason is distinct from
      'POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP'
  then
    raise exception
      'Q14ab cessation version, policy and reason are database-owned constants.';
  end if;


  /*
   * Database-owned derivation.
   *
   * No caller invents membership identity or cessation time.
   */

  new.organization_id :=
    v_checkpoint.organization_id;

  new.assembly_id :=
    v_checkpoint.assembly_id;

  new.evidence_id :=
    v_checkpoint.evidence_id;

  new.integrity_fingerprint :=
    v_checkpoint.integrity_fingerprint;

  new.historical_membership_id :=
    v_membership.id;

  new.ceased_at :=
    v_checkpoint.decided_at;


  return new;
end;
$function$;


create or replace function
public.persist_hspp_assembly_member_effective_cessation_under_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid,
  p_unsuitability_checkpoint_id uuid
)
returns table (
  cessation_id uuid,
  organization_id uuid,
  assembly_id uuid,
  evidence_id uuid,
  integrity_fingerprint text,
  historical_membership_id uuid,
  unsuitability_checkpoint_id uuid,
  cessation_version text,
  cessation_policy_version text,
  cessation_reason text,
  ceased_at timestamptz,
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

  v_checkpoint
    public.hspp_assembly_member_unsuitability_checkpoints%rowtype;

  v_membership
    public.hspp_evidence_assembly_members%rowtype;

  v_cessation
    public.hspp_assembly_member_effective_cessations%rowtype;
begin

  -- ----------------------------------------------------------
  -- Required caller-owned scope and fencing identities.
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


  if p_unsuitability_checkpoint_id is null then
    raise exception
      'unsuitability_checkpoint_id is required';
  end if;


  -- ----------------------------------------------------------
  -- Canonical HSPP lock order, part 1:
  -- exact historical assembly.
  --
  -- Q14h locks this same parent FOR UPDATE. This KEY SHARE lock
  -- therefore serializes this writer against reconstruction of
  -- the same historical parent.
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
      'Effective-membership cessation requires a historical SEALED assembly';
  end if;


  -- ----------------------------------------------------------
  -- Canonical HSPP lock order, part 2:
  -- exact active execution lease.
  -- ----------------------------------------------------------

  select
    lease.*
  into
    v_lease
  from
    public.hspp_assembly_assessment_execution_leases as lease
  where
    lease.organization_id = p_organization_id
    and lease.assembly_id = p_assembly_id
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
  -- Exact Q14v authority.
  --
  -- The checkpoint, not the application caller, owns evidence,
  -- fingerprint and lifecycle decision-time identity.
  -- ----------------------------------------------------------

  select
    checkpoint.*
  into
    v_checkpoint
  from
    public.hspp_assembly_member_unsuitability_checkpoints
      as checkpoint
  where
    checkpoint.id =
      p_unsuitability_checkpoint_id
  for key share;


  if not found then
    raise exception
      'Referenced Q14v unsuitability checkpoint does not exist';
  end if;


  if (
    v_checkpoint.organization_id <> p_organization_id
    or v_checkpoint.assembly_id <> p_assembly_id
  ) then
    raise exception
      'Q14v unsuitability checkpoint conflicts with requested organization or assembly';
  end if;


  if not (
    (
      v_checkpoint.checkpoint_version =
        'hspp-assembly-member-unsuitability-checkpoint-v1'

      and

      v_checkpoint.unsuitability_policy_version =
        'hspp-post-positive-member-unsuitability-v1'

      and

      v_checkpoint.unsuitability_reason =
        'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'

      and

      v_checkpoint.revalidation_evidence_id is null

      and

      v_checkpoint.revalidation_integrity_fingerprint is null
    )

    or

    (
      v_checkpoint.checkpoint_version =
        'hspp-assembly-member-unsuitability-checkpoint-v2'

      and

      v_checkpoint.unsuitability_policy_version =
        'hspp-post-positive-member-unsuitability-v2'

      and

      v_checkpoint.unsuitability_reason =
        'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'

      and

      v_checkpoint.revalidation_evidence_id is not null

      and

      v_checkpoint.revalidation_integrity_fingerprint is not null
    )
  ) then
    raise exception
      'Q14ac requires the exact canonical Q14v post-positive unsuitability authority';
  end if;


  -- ----------------------------------------------------------
  -- Resolve the exact immutable historical membership so exact
  -- retry validation can independently prove Q14ab identity.
  -- ----------------------------------------------------------

  select
    membership.*
  into
    v_membership
  from
    public.hspp_evidence_assembly_members
      as membership
  where
    membership.organization_id =
      v_checkpoint.organization_id
    and membership.assembly_id =
      v_checkpoint.assembly_id
    and membership.evidence_id =
      v_checkpoint.evidence_id
    and membership.evidence_integrity_fingerprint =
      v_checkpoint.integrity_fingerprint
  for key share;


  if not found then
    raise exception
      'Q14ac cannot resolve the exact immutable historical membership authorized by Q14v';
  end if;


  -- ----------------------------------------------------------
  -- Exact immutable retry recovery.
  --
  -- IMPORTANT:
  -- This lookup occurs BEFORE any new Q14ab INSERT. Therefore an
  -- already-persisted cessation remains retryable even if Q14h
  -- has subsequently created a child and H1 is no longer the
  -- lineage leaf.
  --
  -- The retry remains execution-lease fenced.
  -- ----------------------------------------------------------

  select
    cessation.*
  into
    v_cessation
  from
    public.hspp_assembly_member_effective_cessations
      as cessation
  where
    cessation.unsuitability_checkpoint_id =
      p_unsuitability_checkpoint_id
  for key share;


  if found then

    if (
      v_cessation.organization_id <>
        v_checkpoint.organization_id
      or v_cessation.assembly_id <>
        v_checkpoint.assembly_id
      or v_cessation.evidence_id <>
        v_checkpoint.evidence_id
      or v_cessation.integrity_fingerprint <>
        v_checkpoint.integrity_fingerprint
      or v_cessation.historical_membership_id <>
        v_membership.id
      or v_cessation.unsuitability_checkpoint_id <>
        v_checkpoint.id
      or v_cessation.cessation_version <>
        'hspp-assembly-member-effective-cessation-v1'
      or v_cessation.cessation_policy_version <>
        'hspp-post-positive-effective-membership-cessation-v1'
      or v_cessation.cessation_reason <>
        'POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP'
      or v_cessation.ceased_at <>
        v_checkpoint.decided_at
    ) then
      raise exception
        'Conflicting HSPP effective-membership cessation retry';
    end if;


    if v_lease.expires_at <= clock_timestamp() then
      raise exception
        'HSPP assessment execution lease expired before effective-cessation retry completed';
    end if;


    return query
    select
      v_cessation.id,
      v_cessation.organization_id,
      v_cessation.assembly_id,
      v_cessation.evidence_id,
      v_cessation.integrity_fingerprint,
      v_cessation.historical_membership_id,
      v_cessation.unsuitability_checkpoint_id,
      v_cessation.cessation_version,
      v_cessation.cessation_policy_version,
      v_cessation.cessation_reason,
      v_cessation.ceased_at,
      v_cessation.created_at;

    return;
  end if;


  -- ----------------------------------------------------------
  -- NEW cessation.
  --
  -- Bounded ownership is re-checked immediately before write.
  -- Q14ab's BEFORE INSERT trigger remains the sole authority for
  -- current-leaf/no-successor validation and all derived fields.
  -- ----------------------------------------------------------

  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before effective-cessation persistence';
  end if;


  insert into
    public.hspp_assembly_member_effective_cessations (
      unsuitability_checkpoint_id
    )
  values (
    p_unsuitability_checkpoint_id
  )
  returning *
  into
    v_cessation;


  -- ----------------------------------------------------------
  -- Independently validate what Q14ab persisted.
  -- ----------------------------------------------------------

  if (
    v_cessation.organization_id <>
      v_checkpoint.organization_id
    or v_cessation.assembly_id <>
      v_checkpoint.assembly_id
    or v_cessation.evidence_id <>
      v_checkpoint.evidence_id
    or v_cessation.integrity_fingerprint <>
      v_checkpoint.integrity_fingerprint
    or v_cessation.historical_membership_id <>
      v_membership.id
    or v_cessation.unsuitability_checkpoint_id <>
      v_checkpoint.id
    or v_cessation.cessation_version <>
      'hspp-assembly-member-effective-cessation-v1'
    or v_cessation.cessation_policy_version <>
      'hspp-post-positive-effective-membership-cessation-v1'
    or v_cessation.cessation_reason <>
      'POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP'
    or v_cessation.ceased_at <>
      v_checkpoint.decided_at
  ) then
    raise exception
      'Persisted HSPP effective-membership cessation conflicts with canonical Q14v/Q14ab identity';
  end if;


  -- Crossing expiry fails closed and rolls back a newly-created
  -- Q14ab row in this transaction.
  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before effective-cessation transaction completed';
  end if;


  return query
  select
    v_cessation.id,
    v_cessation.organization_id,
    v_cessation.assembly_id,
    v_cessation.evidence_id,
    v_cessation.integrity_fingerprint,
    v_cessation.historical_membership_id,
    v_cessation.unsuitability_checkpoint_id,
    v_cessation.cessation_version,
    v_cessation.cessation_policy_version,
    v_cessation.cessation_reason,
    v_cessation.ceased_at,
    v_cessation.created_at;

end;
$function$;

commit;
