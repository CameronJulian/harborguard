-- B7490-07Q13e5a
--
-- Recovery-only fenced HSPP assessment persistence boundary.
--
-- This RPC prevents a stale recovery runner from mutating evidence after
-- another runner has taken ownership of the same assembly execution lease.
--
-- The lease ownership check, exact persisted assembly-membership check and
-- evidence assessment mutation all occur inside this PostgreSQL transaction.
--
-- This migration does NOT:
--
-- - acquire, renew or release an execution lease;
-- - execute Q12;
-- - record whole-Q12 completion;
-- - alter membership;
-- - seal or rebuild an assembly;
-- - generate assessed_at;
-- - replace the existing generic applyHsppAssessmentDecision boundary;
-- - grant public, anon or authenticated execution.

create or replace function
public.apply_hspp_assessment_decision_under_execution_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid,
  p_evidence_id uuid,
  p_integrity_fingerprint text,
  p_trust_state text,
  p_operational_eligible boolean,
  p_crowd_eligible boolean,
  p_training_eligible boolean,
  p_validation_eligible boolean,
  p_assessment_policy_version text,
  p_assessment_reason text,
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
  assessed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;

  v_lease
    public.hspp_assembly_assessment_execution_leases%rowtype;
begin

  -- ----------------------------------------------------------
  -- Required immutable identities.
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
    or p_integrity_fingerprint !~ '^[0-9a-f]{64}$'
  ) then
    raise exception
      'integrity_fingerprint must be a lowercase SHA-256 hexadecimal fingerprint';
  end if;

  -- ----------------------------------------------------------
  -- Exact assessment decision.
  -- ----------------------------------------------------------

  if (
    p_trust_state is null
    or p_trust_state not in (
      'UNASSESSED',
      'PLAUSIBLE',
      'CORROBORATED',
      'VERIFIED'
    )
  ) then
    raise exception
      'trust_state is invalid';
  end if;

  if (
    p_operational_eligible is null
    or p_crowd_eligible is null
    or p_training_eligible is null
    or p_validation_eligible is null
  ) then
    raise exception
      'assessment eligibility values are required';
  end if;

  if (
    p_assessment_policy_version is null
    or length(trim(p_assessment_policy_version)) = 0
  ) then
    raise exception
      'assessment_policy_version is required';
  end if;

  if (
    p_assessment_reason is null
    or length(trim(p_assessment_reason)) = 0
  ) then
    raise exception
      'assessment_reason is required';
  end if;

  if p_assessed_at is null then
    raise exception
      'assessed_at is required';
  end if;

  -- ----------------------------------------------------------
  -- Fence ownership.
  --
  -- Locking the exact lease row prevents token replacement while this
  -- transaction verifies ownership and mutates the evidence row.
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

  v_now := clock_timestamp();

  if v_lease.lease_token <> p_lease_token then
    raise exception
      'HSPP assessment execution lease is owned by another token';
  end if;

  if v_lease.expires_at <= v_now then
    raise exception
      'HSPP assessment execution lease has expired';
  end if;

  -- ----------------------------------------------------------
  -- Exact persisted membership.
  --
  -- A valid lease for assembly A must never authorize mutation of
  -- arbitrary same-organization evidence. The exact immutable evidence
  -- identity must already be a persisted member of that assembly.
  -- ----------------------------------------------------------

  perform
    member.id
  from
    public.hspp_evidence_assembly_members as member
  where
    member.organization_id = p_organization_id
    and member.assembly_id = p_assembly_id
    and member.evidence_id = p_evidence_id
    and member.evidence_integrity_fingerprint =
      p_integrity_fingerprint
  for key share;

  if not found then
    raise exception
      'HSPP evidence is not an exact persisted member of the leased assembly';
  end if;

  -- Re-check the bounded lease immediately before mutation.
  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before evidence mutation';
  end if;

  -- ----------------------------------------------------------
  -- Fenced evidence assessment mutation.
  --
  -- These are the same assessment columns controlled by the existing
  -- generic applyHsppAssessmentDecision boundary.
  -- ----------------------------------------------------------

  return query

  update
    public.hspp_evidence as evidence
  set
    trust_state =
      p_trust_state,

    operational_eligible =
      p_operational_eligible,

    crowd_eligible =
      p_crowd_eligible,

    training_eligible =
      p_training_eligible,

    validation_eligible =
      p_validation_eligible,

    assessment_policy_version =
      p_assessment_policy_version,

    assessment_reason =
      p_assessment_reason,

    assessed_at =
      p_assessed_at

  where
    evidence.organization_id = p_organization_id
    and evidence.id = p_evidence_id
    and evidence.integrity_fingerprint =
      p_integrity_fingerprint

  returning
    evidence.id,
    evidence.trust_state,
    evidence.operational_eligible,
    evidence.crowd_eligible,
    evidence.training_eligible,
    evidence.validation_eligible,
    evidence.assessment_policy_version,
    evidence.assessment_reason,
    evidence.assessed_at;

  if not found then
    raise exception
      'HSPP evidence assessment target was not found or no longer matched its integrity identity';
  end if;

  -- If this database transaction itself crossed the lease expiry boundary,
  -- fail closed. Raising here rolls back the evidence UPDATE above.
  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before fenced assessment transaction completed';
  end if;
end;
$$;


-- Service-role-only mutation boundary.

revoke all
on function
public.apply_hspp_assessment_decision_under_execution_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
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
public.apply_hspp_assessment_decision_under_execution_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  text,
  timestamptz
)
to service_role;


comment on function
public.apply_hspp_assessment_decision_under_execution_lease(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  text,
  text,
  timestamptz
)
is
  'B7490-07Q13e5a recovery-only fenced HSPP evidence assessment mutation. The function locks and verifies the exact active assembly execution lease, proves the exact persisted assembly-member evidence identity, and only then mutates the assessment fields. A stale, expired or wrong lease token cannot mutate evidence. The function does not acquire or renew leases, execute Q12, record completion, alter membership or generate assessed_at.';
