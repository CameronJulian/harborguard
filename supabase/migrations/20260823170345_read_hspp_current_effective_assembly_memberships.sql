-- B7490-14AF
-- Current-effective HSPP assembly membership read authority.
--
-- Historical hspp_evidence_assembly_members rows remain immutable.
--
-- This authority answers a narrower lifecycle question:
--
--   Does this evidence currently participate in the effective
--   composition at the current reconstruction lineage leaf?
--
-- A historical membership is CURRENTLY EFFECTIVE only when:
--
--   1. its assembly is still a reconstruction lineage leaf; and
--   2. the exact immutable membership row has no effective-cessation fact.
--
-- Therefore:
--
--   H1 = A + B + C
--
--   C cessation recorded
--
--       C -> not currently effective
--
--   A/B remain in current leaf
--
--       A/B -> currently effective
--
-- and after:
--
--   H1 -> H2
--
-- historical H1 memberships are not treated as current merely because
-- their immutable rows continue to exist.
--
-- This function does NOT:
--
-- - delete or modify historical membership;
-- - alter evidence trust;
-- - make evidence Reservoir eligible by itself;
-- - select replacement evidence;
-- - create H2;
-- - persist reconstruction provenance;
-- - seal or validate an assembly;
-- - grant Route Safety, Crowd Intelligence, ML or other downstream authority.
--
-- Reservoir discovery may consume this read authority separately.

create or replace function
  public.read_hspp_current_effective_assembly_memberships(
    p_organization_id uuid,
    p_evidence_ids uuid[]
  )
returns table (
  evidence_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_requested_count integer;
begin

  if p_organization_id is null then
    raise exception
      'Q14af organization id is required.';
  end if;


  if p_evidence_ids is null then
    raise exception
      'Q14af evidence id array is required.';
  end if;


  v_requested_count :=
    cardinality(p_evidence_ids);


  if v_requested_count > 100 then
    raise exception
      'Q14af accepts at most 100 evidence ids per bounded read.';
  end if;


  if
    array_position(
      p_evidence_ids,
      null::uuid
    ) is not null
  then
    raise exception
      'Q14af evidence id array must not contain NULL.';
  end if;


  if v_requested_count = 0 then
    return;
  end if;


  return query

  select distinct
    member.evidence_id

  from
    public.hspp_evidence_assembly_members
      as member

  where
    member.organization_id =
      p_organization_id

    and member.evidence_id =
      any(p_evidence_ids)

    -- Current lineage leaf:
    --
    -- If this membership's assembly already has a reconstruction
    -- successor, this immutable row belongs to historical ancestry,
    -- not the currently effective composition leaf.
    and not exists (

      select
        1

      from
        public.hspp_evidence_assembly_reconstructions
          as reconstruction

      where
        reconstruction.organization_id =
          p_organization_id

        and reconstruction.parent_assembly_id =
          member.assembly_id
    )

    -- Exact effective-membership cessation:
    --
    -- The historical member remains intact but is no longer currently
    -- effective once Q14ab has recorded cessation for this exact row.
    and not exists (

      select
        1

      from
        public.hspp_assembly_member_effective_cessations
          as cessation

      where
        cessation.organization_id =
          p_organization_id

        and cessation.historical_membership_id =
          member.id
    )

  order by
    member.evidence_id;

end;
$$;


comment on function
  public.read_hspp_current_effective_assembly_memberships(
    uuid,
    uuid[]
  )
is
  'B7490-14AF bounded current-effective assembly-membership read authority. An immutable historical membership is reported only when its assembly remains a current reconstruction lineage leaf and the exact membership has no effective-cessation fact. Historical membership is never deleted or rewritten. This function grants no trust, Reservoir, replacement, reconstruction, validation or downstream authority.';


revoke all on function
  public.read_hspp_current_effective_assembly_memberships(
    uuid,
    uuid[]
  )
from public;


revoke all on function
  public.read_hspp_current_effective_assembly_memberships(
    uuid,
    uuid[]
  )
from anon;


revoke all on function
  public.read_hspp_current_effective_assembly_memberships(
    uuid,
    uuid[]
  )
from authenticated;


grant execute on function
  public.read_hspp_current_effective_assembly_memberships(
    uuid,
    uuid[]
  )
to service_role;