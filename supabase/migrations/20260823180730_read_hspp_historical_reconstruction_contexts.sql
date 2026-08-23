-- ============================================================
-- B7490-Q14AG14
-- Bounded historical reconstruction-context read authority.
-- ============================================================
--
-- Purpose:
--
-- Resolve an evidence identity that is no longer currently effective
-- back to the exact immutable membership/assembly context whose
-- effective membership was explicitly ceased by Q14ab.
--
-- This is intentionally narrower than HISTORICAL_NOT_CURRENT.
--
-- HISTORICAL_NOT_CURRENT means historical membership exists but no
-- membership is currently effective. That alone does NOT authorize
-- reconstruction.
--
-- This authority returns a reconstruction source context only when:
--
-- 1. an exact Q14ab cessation exists for the requested evidence;
-- 2. that cessation still binds the exact immutable membership row;
-- 3. the bound historical assembly remains SEALED; and
-- 4. that assembly still has no reconstruction successor.
--
-- Therefore an old ancestor membership, an already-reconstructed
-- cessation, or an ambiguous historical state cannot silently become a
-- new H2 parent.
--
-- The caller still does NOT receive authority to:
--
-- - select replacement evidence;
-- - decide that reconstruction should occur;
-- - create H2;
-- - invoke Q14h;
-- - derive RETAINED / ORIGINAL membership;
-- - derive REMOVED / ADDED provenance;
-- - seal or validate an assembly;
-- - mutate evidence trust;
-- - grant Route Safety, Crowd Intelligence, ML, or other downstream
--   authority.
--
-- Q14h remains responsible for deriving immutable reconstruction
-- membership and delta provenance once a separate caller has made the
-- complete reconstruction decision.
-- ============================================================


create or replace function
  public.read_hspp_historical_reconstruction_contexts(
    p_organization_id uuid,
    p_evidence_ids uuid[]
  )
returns table (
  evidence_id uuid,
  historical_membership_id uuid,
  parent_assembly_id uuid,
  evidence_integrity_fingerprint text,
  parent_member_ordinal integer,
  cessation_id uuid,
  unsuitability_checkpoint_id uuid,
  cessation_version text,
  cessation_policy_version text,
  cessation_reason text,
  ceased_at timestamptz
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
      'Q14ag14 organization id is required.';
  end if;


  if p_evidence_ids is null then
    raise exception
      'Q14ag14 evidence id array is required.';
  end if;


  v_requested_count :=
    cardinality(p_evidence_ids);


  if v_requested_count > 100 then
    raise exception
      'Q14ag14 accepts at most 100 evidence ids per bounded read.';
  end if;


  if
    array_position(
      p_evidence_ids,
      null
    ) is not null
  then
    raise exception
      'Q14ag14 evidence id array cannot contain null identities.';
  end if;


  if v_requested_count = 0 then
    return;
  end if;


  return query

  with requested as (

    select distinct
      requested_evidence.evidence_id

    from
      unnest(p_evidence_ids)
        as requested_evidence(evidence_id)

  ),

  actionable as (

    select
      requested.evidence_id,

      cessation.historical_membership_id,

      cessation.assembly_id
        as parent_assembly_id,

      membership.evidence_integrity_fingerprint,

      membership.member_ordinal
        as parent_member_ordinal,

      cessation.id
        as cessation_id,

      cessation.unsuitability_checkpoint_id,

      cessation.cessation_version,

      cessation.cessation_policy_version,

      cessation.cessation_reason,

      cessation.ceased_at

    from
      requested

    join
      public.hspp_assembly_member_effective_cessations
        as cessation
      on
        cessation.organization_id =
          p_organization_id

        and cessation.evidence_id =
          requested.evidence_id

    join
      public.hspp_evidence_assembly_members
        as membership
      on
        membership.id =
          cessation.historical_membership_id

        and membership.organization_id =
          cessation.organization_id

        and membership.assembly_id =
          cessation.assembly_id

        and membership.evidence_id =
          cessation.evidence_id

        and membership.evidence_integrity_fingerprint =
          cessation.integrity_fingerprint

    join
      public.hspp_evidence_assemblies
        as parent_assembly
      on
        parent_assembly.organization_id =
          p_organization_id

        and parent_assembly.id =
          cessation.assembly_id

        and parent_assembly.assembly_state =
          'SEALED'

    where
      not exists (

        select
          1

        from
          public.hspp_evidence_assembly_reconstructions
            as reconstruction

        where
          reconstruction.organization_id =
            p_organization_id

          and reconstruction.parent_assembly_id =
            cessation.assembly_id
      )
  ),

  unambiguous as (

    select
      candidate.*

    from
      actionable
        as candidate

    where
      not exists (

        select
          1

        from
          actionable
            as conflicting

        where
          conflicting.evidence_id =
            candidate.evidence_id

          and conflicting.historical_membership_id <>
            candidate.historical_membership_id
      )
  )

  select
    context.evidence_id,
    context.historical_membership_id,
    context.parent_assembly_id,
    context.evidence_integrity_fingerprint,
    context.parent_member_ordinal,
    context.cessation_id,
    context.unsuitability_checkpoint_id,
    context.cessation_version,
    context.cessation_policy_version,
    context.cessation_reason,
    context.ceased_at

  from
    unambiguous
      as context

  order by
    context.evidence_id;

end;
$$;


comment on function
  public.read_hspp_historical_reconstruction_contexts(
    uuid,
    uuid[]
  )
is
  'B7490-Q14AG14 bounded read-only reconstruction-source context authority. A result exists only for an exact Q14ab effective-membership cessation whose immutable membership remains bound to a SEALED assembly with no reconstruction successor. HISTORICAL_NOT_CURRENT alone does not authorize reconstruction. Ambiguous or already-reconstructed history yields no actionable context. This function does not select replacement evidence, create H2, invoke Q14h, derive reconstruction provenance, seal or validate assemblies, alter trust, or grant downstream authority.';


revoke all on function
  public.read_hspp_historical_reconstruction_contexts(
    uuid,
    uuid[]
  )
from public;


revoke all on function
  public.read_hspp_historical_reconstruction_contexts(
    uuid,
    uuid[]
  )
from anon;


revoke all on function
  public.read_hspp_historical_reconstruction_contexts(
    uuid,
    uuid[]
  )
from authenticated;


grant execute on function
  public.read_hspp_historical_reconstruction_contexts(
    uuid,
    uuid[]
  )
to service_role;
