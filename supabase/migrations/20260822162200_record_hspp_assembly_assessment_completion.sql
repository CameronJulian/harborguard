-- ============================================================
-- B7490-07Q13d5
-- Immutable whole-Q12 completion record-or-recover boundary
-- ============================================================
--
-- Q13d4 created the immutable whole-Q12 completion checkpoint
-- table but deliberately left it without a writer.
--
-- Q13d5 introduces one narrowly privileged write boundary.
--
-- The TypeScript boundary authorizes this RPC only after it has
-- received one completed terminal Q12 result.
--
-- PostgreSQL then independently proves the durable prerequisites:
--
--   1. the exact organization-scoped assembly exists;
--   2. the assembly is SEALED;
--   3. the immutable Q13d1/Q13d2 retry identity already exists;
--   4. an existing completion fact always wins over a retry;
--   5. otherwise exactly one immutable completion row is inserted.
--
-- The parent assembly row is the concurrency lock. Concurrent
-- completion attempts for the same assembly serialize on
-- SELECT ... FOR UPDATE.
--
-- This boundary deliberately does NOT:
--
-- - invoke Q12;
-- - invoke Q13d2;
-- - discover recovery work;
-- - create a mutable pending/running/failed/completed state;
-- - duplicate assessed_at;
-- - generate assessment time;
-- - update or delete an existing completion fact;
-- - mutate evidence;
-- - mutate assembly membership or lifecycle state;
-- - grant operational, Route Safety, Crowd, training or ML authority;
-- - create API, cron, queue or scheduler execution.

create or replace function
  public.record_hspp_assembly_assessment_completion(
    p_organization_id uuid,
    p_assembly_id uuid
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

  v_retry_identity
    public.hspp_assembly_assessment_retry_identities%rowtype;

  v_completion
    public.hspp_assembly_assessment_completions%rowtype;
begin
  -- ----------------------------------------------------------
  -- Required immutable identity.
  -- ----------------------------------------------------------

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if p_assembly_id is null then
    raise exception
      'p_assembly_id is required';
  end if;

  -- ----------------------------------------------------------
  -- Serialize completion attempts for this exact assembly and
  -- prove the persisted assembly remains SEALED.
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
      'HSPP assembly assessment completion may be recorded only for a SEALED assembly.';
  end if;

  -- ----------------------------------------------------------
  -- Completion cannot exist independently of the canonical
  -- Q13d1/Q13d2 retry identity.
  -- ----------------------------------------------------------

  select
    identity.*
  into
    v_retry_identity
  from
    public.hspp_assembly_assessment_retry_identities
      as identity
  where
    identity.organization_id =
      p_organization_id
    and identity.assembly_id =
      p_assembly_id;

  if not found then
    raise exception
      'HSPP assembly assessment completion requires an existing retry identity.';
  end if;

  -- ----------------------------------------------------------
  -- Existing persisted completion is authoritative.
  --
  -- No UPDATE is permitted and no second completion lifecycle
  -- state is introduced.
  -- ----------------------------------------------------------

  select
    completion.*
  into
    v_completion
  from
    public.hspp_assembly_assessment_completions
      as completion
  where
    completion.organization_id =
      p_organization_id
    and completion.assembly_id =
      p_assembly_id;

  if found then
    return query
    select
      v_completion.organization_id,
      v_completion.assembly_id,
      v_completion.completion_version,
      v_completion.created_at;

    return;
  end if;

  -- ----------------------------------------------------------
  -- First successful completion writer creates the immutable
  -- completion fact.
  --
  -- No ON CONFLICT DO UPDATE is permitted. The assembly lock
  -- serializes concurrent writers for the same assembly.
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

  return query
  select
    v_completion.organization_id,
    v_completion.assembly_id,
    v_completion.completion_version,
    v_completion.created_at;
end;
$$;

-- PostgreSQL functions receive PUBLIC execute by default.
-- Keep this completion mutation boundary service-role only.

revoke all
on function
  public.record_hspp_assembly_assessment_completion(
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
  public.record_hspp_assembly_assessment_completion(
    uuid,
    uuid
  )
to service_role;

comment on function
  public.record_hspp_assembly_assessment_completion(
    uuid,
    uuid
  )
is
  'B7490-07Q13d5 immutable whole-Q12 completion record-or-recover boundary. The application boundary calls this only after a terminal Q12 result. PostgreSQL locks the exact organization-scoped assembly, requires SEALED state and an existing immutable retry identity, returns an existing completion fact unchanged on retry, or inserts the fact exactly once. It does not execute Q12, duplicate assessed_at, mutate trust or create mutable processing state.';