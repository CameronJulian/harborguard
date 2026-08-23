-- Q14s / B7490-07C3 corrective migration.
--
-- Runtime proof exposed a PL/pgSQL identifier ambiguity in the
-- historical seal_hspp_evidence_assembly(uuid, uuid) definition.
--
-- The function RETURNS TABLE includes an output variable named
-- organization_id. The historical UPDATE referenced organization_id
-- without a table qualifier, so PostgreSQL could not distinguish the
-- output variable from hspp_evidence_assemblies.organization_id.
--
-- This migration intentionally:
--
-- - preserves the existing function name and two-UUID signature;
-- - preserves the exact RETURNS TABLE contract;
-- - preserves SECURITY INVOKER and search_path = public;
-- - preserves OPEN -> SEALED as the only lifecycle mutation;
-- - preserves all existing trigger authority;
-- - preserves service_role-only execution;
-- - changes only the UPDATE target references so PostgreSQL resolves
--   them explicitly against the assembly table alias.
--
-- The historical migration is intentionally left unchanged.

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

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if p_assembly_id is null then
    raise exception
      'p_assembly_id is required';
  end if;


  select
    assembly.*
  into
    v_assembly
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
      'HSPP evidence assembly was not found for this organization.';
  end if;


  if v_assembly.assembly_state <> 'OPEN' then
    raise exception
      'HSPP evidence assembly is not OPEN and cannot be sealed.';
  end if;


  update
    public.hspp_evidence_assemblies
      as assembly
  set
    assembly_state = 'SEALED',
    sealed_at = now()
  where
    assembly.organization_id =
      p_organization_id
    and assembly.id =
      p_assembly_id
  returning
    assembly.*
  into
    v_assembly;


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