-- ============================================================
-- B7490-Q14AG22A
-- Child-keyed HSPP reconstruction recovery read authority.
-- ============================================================
--
-- Purpose:
--
--   Resolve an already-persisted HSPP reconstruction by the
--   caller-owned child assembly UUID before a future execution
--   bridge attempts the Q14ag14 actionable-history path.
--
-- Input:
--
--   organization_id + child_assembly_id
--
-- Result semantics:
--
--   CHILD DOES NOT EXIST
--     -> zero rows
--     -> valid NOT_FOUND recovery result
--
--   CHILD EXISTS IN ANOTHER ORGANIZATION
--     -> fail closed
--
--   CHILD EXISTS IN THIS ORGANIZATION BUT HAS NO RECONSTRUCTION
--   PROVENANCE
--     -> fail closed
--
--   CHILD IS RECONSTRUCTION-OWNED
--     -> return exactly one canonical reconstruction snapshot
--
-- The snapshot deliberately permits either current child state:
--
--   OPEN
--   SEALED
--
-- because successful H2 persistence may subsequently progress
-- through the existing OPEN -> SEALED lifecycle before a retry.
--
-- The function returns immutable persisted identity/provenance and
-- current child membership sufficient for a later typed recovery
-- reader to distinguish exact recovery from conflicting child reuse.
--
-- It does NOT:
--
-- - create or modify H1/H2;
-- - invoke Q14h;
-- - select replacement evidence;
-- - rerun Reservoir discovery or B07A;
-- - decide that reconstruction should occur;
-- - derive new reconstruction provenance;
-- - seal or assess an assembly;
-- - alter trust;
-- - return evidence to Reservoir;
-- - create API, cron, queue or scheduler behavior;
-- - grant downstream authority.
--
-- This is a service-role-only, read-only, single-snapshot authority.
-- ============================================================

create or replace function
  public.read_hspp_evidence_assembly_reconstruction_recovery(
    p_organization_id uuid,
    p_child_assembly_id uuid
  )

returns table (
  reconstruction_id uuid,
  organization_id uuid,
  parent_assembly_id uuid,
  child_assembly_id uuid,
  assembly_version text,
  membership_policy_version text,
  reconstruction_policy_version text,
  reconstruction_reason text,
  assembly_state text,
  sealed_at timestamptz,
  persisted_member_count integer,
  retained_member_count integer,
  original_member_count integer,
  removed_change_count integer,
  added_change_count integer,
  members jsonb
)

language plpgsql
stable
security definer
set search_path = public

as $$
declare
  v_child_organization_id uuid;

begin

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;


  if p_child_assembly_id is null then
    raise exception
      'p_child_assembly_id is required';
  end if;


  -- ----------------------------------------------------------
  -- Distinguish true NOT_FOUND from child-identity collision.
  --
  -- Q14h treats the caller-owned child UUID as immutable retry
  -- identity. An already-existing assembly with this UUID must
  -- therefore never be silently treated as a fresh NOT_FOUND.
  -- ----------------------------------------------------------

  select
    child_assembly.organization_id
  into
    v_child_organization_id
  from
    public.hspp_evidence_assemblies
      as child_assembly
  where
    child_assembly.id =
      p_child_assembly_id;


  if not found then

    -- Valid recovery NOT_FOUND:
    -- no assembly currently owns the caller-provided child UUID.
    return;

  end if;


  if
    v_child_organization_id <>
    p_organization_id
  then

    raise exception
      'Existing HSPP child assembly belongs to a different organization.';

  end if;


  if not exists (
    select
      1
    from
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
    where
      reconstruction.organization_id =
        p_organization_id
      and reconstruction.child_assembly_id =
        p_child_assembly_id
  ) then

    raise exception
      'Existing HSPP child assembly is not owned by reconstruction provenance.';

  end if;


  -- ----------------------------------------------------------
  -- One canonical database snapshot.
  --
  -- Q14ag21 now guarantees at most one immediate successor per
  -- parent, while the pre-existing child uniqueness invariant
  -- guarantees one reconstruction row for this organization +
  -- child identity.
  -- ----------------------------------------------------------

  return query

  with target as (

    select
      reconstruction.id
        as reconstruction_id,

      reconstruction.organization_id,
      reconstruction.parent_assembly_id,
      reconstruction.child_assembly_id,

      child_assembly.assembly_version,
      child_assembly.membership_policy_version,
      child_assembly.assembly_state,
      child_assembly.sealed_at,

      reconstruction.reconstruction_policy_version,
      reconstruction.reconstruction_reason

    from
      public.hspp_evidence_assembly_reconstructions
        as reconstruction

    join
      public.hspp_evidence_assemblies
        as child_assembly
      on
        child_assembly.id =
          reconstruction.child_assembly_id
        and child_assembly.organization_id =
          reconstruction.organization_id

    where
      reconstruction.organization_id =
        p_organization_id

      and reconstruction.child_assembly_id =
        p_child_assembly_id
  ),

  member_snapshot as (

    select
      member.organization_id,
      member.assembly_id,

      count(member.id)::integer
        as persisted_member_count,

      (
        count(member.id)
          filter (
            where
              member.membership_kind =
                'RETAINED'
          )
      )::integer
        as retained_member_count,

      (
        count(member.id)
          filter (
            where
              member.membership_kind =
                'ORIGINAL'
          )
      )::integer
        as original_member_count,

      jsonb_agg(
        jsonb_build_object(
          'membership_id',
            member.id,

          'evidence_id',
            member.evidence_id,

          'evidence_integrity_fingerprint',
            member.evidence_integrity_fingerprint,

          'member_ordinal',
            member.member_ordinal,

          'membership_kind',
            member.membership_kind,

          'source_membership_id',
            member.source_membership_id
        )

        order by
          member.member_ordinal,
          member.evidence_id
      )
        as member_rows

    from
      public.hspp_evidence_assembly_members
        as member

    join
      target
        on
          target.organization_id =
            member.organization_id

          and target.child_assembly_id =
            member.assembly_id

    group by
      member.organization_id,
      member.assembly_id
  ),

  change_snapshot as (

    select
      change.organization_id,
      change.reconstruction_id,

      (
        count(change.id)
          filter (
            where
              change.change_kind =
                'REMOVED'
          )
      )::integer
        as removed_change_count,

      (
        count(change.id)
          filter (
            where
              change.change_kind =
                'ADDED'
          )
      )::integer
        as added_change_count

    from
      public.hspp_evidence_assembly_reconstruction_changes
        as change

    join
      target
        on
          target.organization_id =
            change.organization_id

          and target.reconstruction_id =
            change.reconstruction_id

    group by
      change.organization_id,
      change.reconstruction_id
  )

  select
    target.reconstruction_id,
    target.organization_id,
    target.parent_assembly_id,
    target.child_assembly_id,
    target.assembly_version,
    target.membership_policy_version,
    target.reconstruction_policy_version,
    target.reconstruction_reason,
    target.assembly_state,
    target.sealed_at,

    coalesce(
      member_snapshot.persisted_member_count,
      0
    )::integer,

    coalesce(
      member_snapshot.retained_member_count,
      0
    )::integer,

    coalesce(
      member_snapshot.original_member_count,
      0
    )::integer,

    coalesce(
      change_snapshot.removed_change_count,
      0
    )::integer,

    coalesce(
      change_snapshot.added_change_count,
      0
    )::integer,

    coalesce(
      member_snapshot.member_rows,
      '[]'::jsonb
    )

  from
    target

  left join
    member_snapshot
      on
        member_snapshot.organization_id =
          target.organization_id

        and member_snapshot.assembly_id =
          target.child_assembly_id

  left join
    change_snapshot
      on
        change_snapshot.organization_id =
          target.organization_id

        and change_snapshot.reconstruction_id =
          target.reconstruction_id;

end;
$$;


comment on function
  public.read_hspp_evidence_assembly_reconstruction_recovery(
    uuid,
    uuid
  )
is
  'B7490-Q14AG22A service-role-only child-keyed HSPP reconstruction recovery read authority. A missing child UUID yields zero rows. Existing cross-organization or non-reconstruction child UUID collisions fail closed. A valid reconstruction child returns its persisted reconstruction identity, current OPEN or SEALED lifecycle state, immutable child membership snapshot and derived persistence counts. This function is read-only and grants no reconstruction execution, replacement selection, sealing, assessment, trust, Reservoir, scheduling or downstream authority.';


revoke all on function
  public.read_hspp_evidence_assembly_reconstruction_recovery(
    uuid,
    uuid
  )
from public;


revoke all on function
  public.read_hspp_evidence_assembly_reconstruction_recovery(
    uuid,
    uuid
  )
from anon;


revoke all on function
  public.read_hspp_evidence_assembly_reconstruction_recovery(
    uuid,
    uuid
  )
from authenticated;


grant execute on function
  public.read_hspp_evidence_assembly_reconstruction_recovery(
    uuid,
    uuid
  )
to service_role;
