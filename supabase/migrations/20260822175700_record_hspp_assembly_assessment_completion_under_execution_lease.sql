-- B7490-07Q13e5b
--
-- Recovery-only token-fenced immutable whole-Q12 completion writer.
--
-- Q13d4 remains the sole completion fact:
--
--   row absent  = no immutable whole-Q12 completion recorded
--   row present = immutable whole-Q12 completion recorded
--
-- Q13d5 already established the structural completion contract.
-- Q13e5b adds only one additional authorization invariant:
--
--   the caller must still own the exact unexpired assembly execution lease.
--
-- Lock ordering deliberately follows the existing lease acquisition order:
--
--   assembly row FOR UPDATE
--       ->
--   execution lease row FOR UPDATE
--
-- This avoids introducing a lease-row -> assembly-row lock inversion.
--
-- This function does NOT:
--
-- - execute Q12;
-- - acquire, renew or release execution ownership;
-- - create another completion state;
-- - duplicate assessed_at;
-- - mutate trust or eligibility;
-- - mutate assembly membership;
-- - update or delete an immutable completion;
-- - create STARTED/RUNNING/FAILED workflow state.

create or replace function
public.record_hspp_assembly_assessment_completion_under_execution_lease(
  p_organization_id uuid,
  p_assembly_id uuid,
  p_lease_token uuid
)
returns table (
  organization_id uuid,
  assembly_id uuid,
  completion_version text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assembly_state text;

  v_lease
    public.hspp_assembly_assessment_execution_leases%rowtype;

  v_retry_identity
    public.hspp_assembly_assessment_retry_identities%rowtype;

  v_completion
    public.hspp_assembly_assessment_completions%rowtype;

  v_now
    timestamptz;
begin

  -- ----------------------------------------------------------
  -- Required caller-owned identities.
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

  -- ----------------------------------------------------------
  -- Canonical row-lock order, part 1:
  --
  -- assembly first.
  --
  -- Q13d5 already uses this row as the completion serialization
  -- boundary, and Q13e3 lease acquisition locks it before the lease
  -- row. Preserve that ordering here.
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
  for update;

  if not found then
    raise exception
      'Referenced HSPP evidence assembly does not exist.';
  end if;

  if v_assembly_state <> 'SEALED' then
    raise exception
      'HSPP assembly assessment completion may be recorded only for a SEALED assembly.';
  end if;

  -- ----------------------------------------------------------
  -- Canonical row-lock order, part 2:
  --
  -- exact execution lease second.
  --
  -- Once this row is locked, renew/release/takeover cannot change
  -- ownership until this transaction completes.
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
  -- Completion may only exist for the canonical immutable retry
  -- identity already established by Q13d1/Q13d2.
  -- ----------------------------------------------------------

  select
    identity.*
  into
    v_retry_identity
  from
    public.hspp_assembly_assessment_retry_identities as identity
  where
    identity.organization_id = p_organization_id
    and identity.assembly_id = p_assembly_id;

  if not found then
    raise exception
      'HSPP assembly assessment completion requires an existing retry identity.';
  end if;

  -- ----------------------------------------------------------
  -- Existing immutable completion remains authoritative.
  --
  -- No UPDATE is permitted.
  -- ----------------------------------------------------------

  select
    completion.*
  into
    v_completion
  from
    public.hspp_assembly_assessment_completions as completion
  where
    completion.organization_id = p_organization_id
    and completion.assembly_id = p_assembly_id;

  if found then

    -- The call itself remains fenced while returning an existing fact.
    if v_lease.expires_at <= clock_timestamp() then
      raise exception
        'HSPP assessment execution lease expired before fenced completion return';
    end if;

    return query
    select
      v_completion.organization_id,
      v_completion.assembly_id,
      v_completion.completion_version,
      v_completion.created_at;

    return;
  end if;

  -- ----------------------------------------------------------
  -- First authorized writer inserts exactly one immutable Q13d4
  -- completion fact.
  --
  -- The assembly row lock serializes completion insertion for this
  -- exact organization-scoped assembly.
  -- ----------------------------------------------------------

  insert into
    public.hspp_assembly_assessment_completions (
      organization_id,
      assembly_id
    )
  values (
    p_organization_id,
    p_assembly_id
  )
  returning
    *
  into
    v_completion;

  -- ----------------------------------------------------------
  -- Fail closed if wall-clock lease expiry was crossed while this
  -- transaction executed.
  --
  -- Raising after INSERT rolls the INSERT back atomically.
  -- Token takeover cannot occur while this transaction owns the
  -- exact lease-row lock.
  -- ----------------------------------------------------------

  if v_lease.expires_at <= clock_timestamp() then
    raise exception
      'HSPP assessment execution lease expired before fenced completion transaction completed';
  end if;

  return query
  select
    v_completion.organization_id,
    v_completion.assembly_id,
    v_completion.completion_version,
    v_completion.created_at;
end;
$$;


-- PostgreSQL grants function execution to PUBLIC by default.
-- Keep the recovery-only completion mutation service-role only.

revoke all
on function
public.record_hspp_assembly_assessment_completion_under_execution_lease(
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
public.record_hspp_assembly_assessment_completion_under_execution_lease(
  uuid,
  uuid,
  uuid
)
to service_role;


comment on function
public.record_hspp_assembly_assessment_completion_under_execution_lease(
  uuid,
  uuid,
  uuid
)
is
  'B7490-07Q13e5b recovery-only token-fenced immutable whole-Q12 completion record-or-recover boundary. PostgreSQL locks the exact SEALED assembly first and its execution lease second, requires the caller-owned lease token to remain current and unexpired, requires the canonical retry identity, returns an existing immutable completion unchanged, or inserts the Q13d4 completion fact exactly once. It does not execute Q12, duplicate assessed_at, mutate trust, renew/release ownership or create mutable processing state.';
