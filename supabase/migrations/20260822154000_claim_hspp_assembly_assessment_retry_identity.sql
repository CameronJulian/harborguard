-- ============================================================
-- B7490-07Q13d2
-- Atomic assembly assessment retry-identity claim-or-recover
-- ============================================================
--
-- Q13d1 created an immutable assembly-bound retry-identity table.
--
-- Q13d2 introduces the sole intended write boundary for that table.
--
-- Input:
--
--   organization_id
--   assembly_id
--   caller-owned proposed assessed_at
--
-- Semantics:
--
--   1. lock the exact organization-scoped assembly row;
--   2. require the persisted assembly to be SEALED;
--   3. if an identity already exists, return it unchanged;
--   4. otherwise persist the caller-proposed assessed_at exactly once;
--   5. return the persisted canonical identity.
--
-- The existing persisted identity always outranks a later proposal.
--
-- Q13d1 deliberately revoked direct service-role INSERT permission on
-- the retry-identity table. Existing HSPP mutation RPCs commonly use
-- SECURITY INVOKER where service_role has direct table write access.
--
-- This boundary intentionally does NOT reopen direct table INSERT.
-- Instead, this one narrowly-scoped mutation function is SECURITY
-- DEFINER and executable only by service_role.
--
-- The organization-scoped assembly row itself is the concurrency lock.
-- SELECT ... FOR UPDATE serializes concurrent claims for the same
-- assembly without inventing a second lock identity.
--
-- Q13d2 does NOT:
--
-- - update or replace an existing assessed_at;
-- - generate assessed_at from database wall-clock time;
-- - infer assessed_at from assembly created_at or sealed_at;
-- - create Q12 pending/running/completed state;
-- - invoke Q12;
-- - scan or reinterpret evidence;
-- - alter evidence trust or eligibility;
-- - mutate assembly membership or assembly lifecycle state;
-- - grant Route Safety, Crowd Intelligence or ML authority;
-- - schedule downstream execution.

create or replace function
  public.claim_hspp_assembly_assessment_retry_identity(
    p_organization_id uuid,
    p_assembly_id uuid,
    p_proposed_assessed_at timestamptz
  )
returns table (
  organization_id uuid,
  assembly_id uuid,
  retry_identity_version text,
  assessed_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assembly_state text;

  v_identity
    public.hspp_assembly_assessment_retry_identities%rowtype;
begin
  -- ----------------------------------------------------------
  -- Caller-owned identity validation.
  -- ----------------------------------------------------------

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if p_assembly_id is null then
    raise exception
      'p_assembly_id is required';
  end if;

  if p_proposed_assessed_at is null then
    raise exception
      'p_proposed_assessed_at is required';
  end if;

  -- ----------------------------------------------------------
  -- Serialize all identity claims for this exact assembly and
  -- prove that the persisted lifecycle state is SEALED.
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
    and assembly.id =
      p_assembly_id
  for update;

  if not found then
    raise exception
      'Referenced HSPP evidence assembly does not exist.';
  end if;

  if v_assembly_state <> 'SEALED' then
    raise exception
      'HSPP assessment retry identity may be claimed only for a SEALED assembly.';
  end if;

  -- ----------------------------------------------------------
  -- Persisted identity is authoritative.
  --
  -- A later caller may propose a different timestamp. That
  -- proposal never replaces the existing canonical identity.
  -- ----------------------------------------------------------

  select
    identity.*
  into
    v_identity
  from
    public.hspp_assembly_assessment_retry_identities
      as identity
  where
    identity.organization_id =
      p_organization_id
    and identity.assembly_id =
      p_assembly_id;

  if found then
    return query
    select
      v_identity.organization_id,
      v_identity.assembly_id,
      v_identity.retry_identity_version,
      v_identity.assessed_at,
      v_identity.created_at;

    return;
  end if;

  -- ----------------------------------------------------------
  -- First successful caller owns the canonical assessed_at.
  --
  -- No ON CONFLICT DO UPDATE is permitted. The parent assembly
  -- row remains locked until this transaction completes, so a
  -- concurrent caller cannot pass the existence check before
  -- the first caller's identity becomes durable.
  -- ----------------------------------------------------------

  insert into
    public.hspp_assembly_assessment_retry_identities (
      organization_id,
      assembly_id,
      assessed_at
    )
  values (
    p_organization_id,
    p_assembly_id,
    p_proposed_assessed_at
  )
  returning
    *
  into
    v_identity;

  return query
  select
    v_identity.organization_id,
    v_identity.assembly_id,
    v_identity.retry_identity_version,
    v_identity.assessed_at,
    v_identity.created_at;
end;
$$;

-- PostgreSQL functions otherwise receive PUBLIC execute by default.
-- Keep this mutation boundary service-role only.

revoke all
on function
  public.claim_hspp_assembly_assessment_retry_identity(
    uuid,
    uuid,
    timestamptz
  )
from
  public,
  anon,
  authenticated,
  service_role;

grant execute
on function
  public.claim_hspp_assembly_assessment_retry_identity(
    uuid,
    uuid,
    timestamptz
  )
to service_role;

comment on function
  public.claim_hspp_assembly_assessment_retry_identity(
    uuid,
    uuid,
    timestamptz
  )
is
  'B7490-07Q13d2 atomic retry-identity claim-or-recover boundary. Locks one exact organization-scoped SEALED HSPP assembly. If an immutable retry identity already exists it returns that persisted identity unchanged; otherwise it persists the caller-owned proposed assessed_at exactly once. It does not generate assessment time, replace identity, execute Q12, create completion state, alter evidence trust, or grant downstream authority.';
