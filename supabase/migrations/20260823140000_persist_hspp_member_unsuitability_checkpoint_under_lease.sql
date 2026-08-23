-- ============================================================
-- B7490-14X1
-- Lease-fenced writer for the immutable Q14v post-positive
-- assembly-member unsuitability checkpoint.
--
-- The writer:
-- - accepts surrounding organization + historical H1 assembly identity;
-- - accepts one execution-lease ownership token;
-- - accepts exact evidence + immutable fingerprint identity;
-- - accepts caller-owned observed_at and decided_at;
-- - derives the unique prior Q14p positive checkpoint internally;
-- - hardcodes the Q14v checkpoint version, policy and reason;
-- - permits only an exact immutable retry;
-- - fails closed on conflicting retry.
--
-- It deliberately does NOT:
-- - call the generic assessment mutation writer;
-- - mutate hspp_evidence;
-- - mutate historical H1 membership;
-- - mutate or revoke Q14p;
-- - establish effective membership;
-- - return evidence to Reservoir;
-- - select replacement evidence;
-- - create H2;
-- - run reconstruction;
-- - run whole-composite validation.
-- ============================================================

begin;


create or replace function
public.persist_hspp_member_unsuitability_checkpoint_under_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid,
  p_evidence_id uuid,
  p_integrity_fingerprint text,
  p_observed_at timestamptz,
  p_decided_at timestamptz
)
returns table (
  checkpoint_id uuid,
  organization_id uuid,
  assembly_id uuid,
  evidence_id uuid,
  integrity_fingerprint text,
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

  v_checkpoint
    public.hspp_assembly_member_unsuitability_checkpoints%rowtype;

begin

  -- ----------------------------------------------------------
  -- Required caller-owned immutable identities.
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
    or p_integrity_fingerprint !~ '^[a-f0-9]{64}$'
  ) then
    raise exception
      'integrity_fingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint';
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
  -- Canonical lock order, part 1:
  -- historical assembly before execution lease.
  --
  -- Preserve the existing HSPP assembly/lease ordering used by
  -- controlled assessment persistence.
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
      'Post-positive member unsuitability requires a historical SEALED assembly';
  end if;


  -- ----------------------------------------------------------
  -- Canonical lock order, part 2:
  -- exact execution lease.
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
  -- Derive the exact prior positive Q14p/Q14r checkpoint.
  --
  -- Q14p guarantees at most one positive checkpoint for one
  -- organization-scoped assembly, so the application caller does
  -- not select or supply this identity.
  -- ----------------------------------------------------------

  select
    positive.*
  into
    v_positive
  from
    public.hspp_assembly_positive_assessment_checkpoints as positive
  where
    positive.organization_id = p_organization_id
    and positive.assembly_id = p_assembly_id
  for key share;


  if not found then
    raise exception
      'Prior positive HSPP assessment checkpoint is required';
  end if;


  if (
    v_positive.evidence_id <> p_evidence_id
    or v_positive.integrity_fingerprint <> p_integrity_fingerprint
  ) then
    raise exception
      'Post-positive member unsuitability target does not match the exact prior positive checkpoint';
  end if;


  if p_observed_at < v_positive.assessed_at then
    raise exception
      'Post-positive member unsuitability observation must not precede the prior positive assessment';
  end if;


  -- Re-check bounded ownership immediately before durable write.
  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before unsuitability persistence';
  end if;


  -- ----------------------------------------------------------
  -- Immutable Q14v fact.
  --
  -- Version, policy and reason are database-owned constants.
  -- The Q14v BEFORE INSERT validator independently re-proves the
  -- prior positive identity, chronology, historical SEALED state
  -- and exact immutable historical membership.
  -- ----------------------------------------------------------

  insert into
    public.hspp_assembly_member_unsuitability_checkpoints (
      organization_id,
      assembly_id,
      evidence_id,
      integrity_fingerprint,
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
    v_positive.id,
    'hspp-assembly-member-unsuitability-checkpoint-v1',
    'hspp-post-positive-member-unsuitability-v1',
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
  -- Deterministic exact-retry recovery.
  --
  -- Two Q14v uniqueness boundaries exist:
  -- 1. prior positive checkpoint;
  -- 2. organization + assembly + evidence.
  --
  -- Recover a pre-existing row only to prove an exact immutable
  -- retry. Any difference fails closed.
  -- ----------------------------------------------------------

  if not found then

    select
      checkpoint.*
    into
      v_checkpoint
    from
      public.hspp_assembly_member_unsuitability_checkpoints as checkpoint
    where
      checkpoint.organization_id = p_organization_id
      and checkpoint.assembly_id = p_assembly_id
      and checkpoint.evidence_id = p_evidence_id
    for key share;


    if not found then

      select
        checkpoint.*
      into
        v_checkpoint
      from
        public.hspp_assembly_member_unsuitability_checkpoints as checkpoint
      where
        checkpoint.prior_positive_checkpoint_id =
          v_positive.id
      for key share;

    end if;


    if not found then
      raise exception
        'Unsuitability checkpoint conflict occurred but existing checkpoint could not be recovered';
    end if;

  end if;


  if (
    v_checkpoint.organization_id <> p_organization_id
    or v_checkpoint.assembly_id <> p_assembly_id
    or v_checkpoint.evidence_id <> p_evidence_id
    or v_checkpoint.integrity_fingerprint <> p_integrity_fingerprint
    or v_checkpoint.prior_positive_checkpoint_id <> v_positive.id
    or v_checkpoint.checkpoint_version <>
      'hspp-assembly-member-unsuitability-checkpoint-v1'
    or v_checkpoint.unsuitability_policy_version <>
      'hspp-post-positive-member-unsuitability-v1'
    or v_checkpoint.unsuitability_reason <>
      'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'
    or v_checkpoint.observed_at <> p_observed_at
    or v_checkpoint.decided_at <> p_decided_at
  ) then
    raise exception
      'Conflicting post-positive HSPP member-unsuitability checkpoint retry';
  end if;


  -- Crossing lease expiry during this transaction fails closed and
  -- rolls back a newly inserted Q14v row.
  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before unsuitability transaction completed';
  end if;


  return query
  select
    v_checkpoint.id,
    v_checkpoint.organization_id,
    v_checkpoint.assembly_id,
    v_checkpoint.evidence_id,
    v_checkpoint.integrity_fingerprint,
    v_checkpoint.prior_positive_checkpoint_id,
    v_checkpoint.checkpoint_version,
    v_checkpoint.unsuitability_policy_version,
    v_checkpoint.unsuitability_reason,
    v_checkpoint.observed_at,
    v_checkpoint.decided_at,
    v_checkpoint.created_at;

end;
$function$;


revoke all
on function
public.persist_hspp_member_unsuitability_checkpoint_under_lease(
  uuid,
  uuid,
  uuid,
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


grant execute
on function
public.persist_hspp_member_unsuitability_checkpoint_under_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz
)
to
  service_role;


comment on function
public.persist_hspp_member_unsuitability_checkpoint_under_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  timestamptz,
  timestamptz
)
is
  'B7490-14X1 service-role-only lease-fenced persistence boundary for one immutable Q14v post-positive member-unsuitability checkpoint. The RPC locks and verifies the exact active organization-scoped assembly execution lease, derives the unique prior Q14p positive checkpoint internally, binds exact evidence and fingerprint identity, and permits only an exact immutable retry. It does not mutate evidence, historical H1 membership, prior positive provenance, effective membership, Reservoir state, replacement selection, descendant reconstruction or whole-composite validation.';


commit;