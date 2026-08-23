-- ============================================================
-- B7490-14AC1
-- Lease-fenced writer for one immutable Q14ab
-- assembly-member effective-membership cessation.
--
-- Caller supplies only:
-- - organization identity;
-- - historical assembly identity;
-- - active execution-lease ownership token;
-- - exact Q14v unsuitability checkpoint identity.
--
-- Evidence identity, fingerprint, historical membership identity
-- and ceased_at remain database-derived Q14ab facts.
--
-- Exact retries remain lease-fenced but recover the already
-- persisted cessation BEFORE attempting a new Q14ab INSERT.
-- This is essential because an exact retry remains valid after
-- a descendant reconstruction exists, while a NEW cessation
-- must still satisfy Q14ab's current-leaf/no-successor rule.
--
-- This writer deliberately does NOT:
-- - create or evaluate post-positive unsuitability;
-- - mutate Q14v;
-- - mutate historical H1 membership;
-- - mutate evidence;
-- - return evidence to Reservoir;
-- - select replacement evidence;
-- - create or modify H2;
-- - modify Q14h reconstruction behavior;
-- - validate a descendant composite.
-- ============================================================

begin;


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


  if (
    v_checkpoint.checkpoint_version <>
      'hspp-assembly-member-unsuitability-checkpoint-v1'
    or v_checkpoint.unsuitability_policy_version <>
      'hspp-post-positive-member-unsuitability-v1'
    or v_checkpoint.unsuitability_reason <>
      'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'
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


revoke all
on function
public.persist_hspp_assembly_member_effective_cessation_under_lease(
  uuid,
  uuid,
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated,
  service_role;


grant execute
on function
public.persist_hspp_assembly_member_effective_cessation_under_lease(
  uuid,
  uuid,
  uuid,
  uuid
)
to
  service_role;


comment on function
public.persist_hspp_assembly_member_effective_cessation_under_lease(
  uuid,
  uuid,
  uuid,
  uuid
)
is
  'B7490-14AC1 service-role-only lease-fenced persistence boundary for one immutable Q14ab effective-membership cessation. Caller supplies organization, historical assembly, active execution-lease token and exact Q14v unsuitability-checkpoint identity only. Evidence, fingerprint, historical membership and ceased_at remain database-derived. Exact retries remain lease-fenced and recover the existing cessation before invoking a new Q14ab insert, allowing exact recovery after a descendant exists while preserving Q14ab current-leaf enforcement for new cessations. This boundary does not evaluate post-positive unsuitability, mutate H1, return evidence to Reservoir, select replacement evidence, reconstruct H2 or validate a descendant.';


commit;