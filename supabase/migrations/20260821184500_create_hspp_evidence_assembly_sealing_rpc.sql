-- B7490-07C3
-- Atomic HSPP evidence-assembly sealing boundary.
--
-- Responsibility:
--
--   Transition exactly one organization-scoped HSPP evidence assembly:
--
--       OPEN -> SEALED
--
--   and set sealed_at inside one PostgreSQL transaction.
--
-- Existing B11A1 lifecycle triggers remain the authoritative
-- database invariants for:
--
-- - permitting only OPEN -> SEALED;
-- - rejecting mutation after SEALED;
-- - preserving assembly identity and policy metadata;
-- - requiring sealed_at for SEALED assemblies;
-- - refusing to seal an assembly with no members;
-- - closing membership against concurrent inserts.
--
-- This function deliberately does NOT:
--
-- - decide whether evidence belongs together;
-- - add, update, or remove assembly members;
-- - rescan or reinterpret evidence;
-- - perform canonical comparison;
-- - detect corroboration or contradiction;
-- - run scanHsppEvidenceAssembly;
-- - evaluate an HSPP assembly decision;
-- - persist an HSPP assembly decision;
-- - alter evidence trust;
-- - apply HSPP assessments;
-- - establish physical-world truth;
-- - grant Route Safety authority;
-- - grant Crowd Intelligence eligibility;
-- - grant ML training or validation eligibility;
-- - schedule or automatically execute later HSPP stages.


create or replace function public.seal_hspp_evidence_assembly(
  p_organization_id uuid,
  p_assembly_id uuid
)
returns table (
  assembly_id uuid,
  organization_id uuid,
  assembly_state text,
  sealed_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_assembly public.hspp_evidence_assemblies%rowtype;
begin

  -- ----------------------------------------------------------
  -- Identity validation.
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
  -- Lock the organization-scoped assembly before deciding
  -- whether the one-time lifecycle transition may occur.
  --
  -- This serializes competing seal attempts and also coordinates
  -- with the existing membership-insert trigger, which locks the
  -- same assembly row before admitting new members.
  -- ----------------------------------------------------------

  select assembly.*
  into v_assembly
  from public.hspp_evidence_assemblies
    as assembly
  where
    assembly.organization_id =
      p_organization_id
    and assembly.id =
      p_assembly_id
  for update;


  if not found then
    raise exception
      'HSPP evidence assembly was not found for this organization.';
  end if;


  -- ----------------------------------------------------------
  -- Fail closed for duplicate/replayed sealing.
  --
  -- SEALED is not treated as idempotent success because sealing
  -- is explicitly a one-time protocol state transition.
  -- ----------------------------------------------------------

  if v_assembly.assembly_state <> 'OPEN' then
    raise exception
      'HSPP evidence assembly is not OPEN and cannot be sealed.';
  end if;


  -- ----------------------------------------------------------
  -- Perform only the lifecycle transition.
  --
  -- The existing enforce_hspp_evidence_assembly_update trigger
  -- validates the transition and membership preconditions.
  -- ----------------------------------------------------------

  update public.hspp_evidence_assemblies
  set
    assembly_state = 'SEALED',
    sealed_at = now()
  where
    organization_id =
      p_organization_id
    and id =
      p_assembly_id
  returning
    hspp_evidence_assemblies.*
  into v_assembly;


  return query
  select
    v_assembly.id,
    v_assembly.organization_id,
    v_assembly.assembly_state,
    v_assembly.sealed_at;

end;
$$;


revoke all
on function public.seal_hspp_evidence_assembly(
  uuid,
  uuid
)
from
  public,
  anon,
  authenticated;


grant execute
on function public.seal_hspp_evidence_assembly(
  uuid,
  uuid
)
to service_role;


comment on function
  public.seal_hspp_evidence_assembly(
    uuid,
    uuid
  )
is
  'B7490-07C3 atomic HSPP assembly sealing boundary. Locks one organization-scoped OPEN assembly and performs only the one-time OPEN -> SEALED lifecycle transition with sealed_at. Existing assembly lifecycle triggers remain authoritative. It does not scan evidence, evaluate canonical consistency, persist assembly decisions, alter trust, apply assessments, or grant downstream authority.';