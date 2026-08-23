-- B7490-14AG8
-- Bounded HSPP evidence assembly-membership lifecycle classification.
--
-- Purpose
-- -------
--
-- Reservoir discovery now distinguishes CURRENT-EFFECTIVE membership
-- from immutable historical membership.
--
-- A later handoff must additionally distinguish:
--
--   NEVER_ASSEMBLED
--
--       No immutable assembly-membership row exists for this exact
--       evidence identity inside the organization.
--
--   HISTORICAL_NOT_CURRENT
--
--       At least one immutable historical assembly-membership row
--       exists, but no membership is currently effective at the
--       reconstruction lineage leaf.
--
--   CURRENT_EFFECTIVE
--
--       At least one immutable membership participates in the current
--       effective composition at the current reconstruction lineage
--       leaf and has no effective-cessation fact.
--
-- This read authority intentionally evaluates historical existence and
-- current-effective existence inside one RETURN QUERY statement so the
-- two classifications are derived from one database statement snapshot.
--
-- Historical membership remains immutable.
--
-- This function does NOT:
--
-- - make evidence Reservoir eligible;
-- - change B06A trust or operational eligibility;
-- - create an assembly;
-- - create ORIGINAL or RETAINED membership;
-- - persist reconstruction;
-- - choose replacement evidence;
-- - seal or validate an assembly;
-- - alter evidence trust;
-- - grant Route Safety, Crowd Intelligence or ML authority;
-- - create API, cron or scheduler behavior.


create or replace function
  public.read_hspp_evidence_assembly_membership_classifications(
    p_organization_id uuid,
    p_evidence_ids uuid[]
  )
returns table (
  evidence_id uuid,
  has_historical_membership boolean,
  has_current_effective_membership boolean,
  membership_classification text
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
      'HSPP membership classification organization id is required.';
  end if;


  if p_evidence_ids is null then
    raise exception
      'HSPP membership classification evidence id array is required.';
  end if;


  v_requested_count :=
    cardinality(p_evidence_ids);


  if v_requested_count > 100 then
    raise exception
      'HSPP membership classification accepts at most 100 evidence ids per bounded read.';
  end if;


  if
    array_position(
      p_evidence_ids,
      null::uuid
    ) is not null
  then
    raise exception
      'HSPP membership classification evidence ids cannot contain null.';
  end if;


  if v_requested_count = 0 then
    return;
  end if;


  return query

  with requested as (
    select distinct
      requested_evidence_id as evidence_id
    from
      unnest(p_evidence_ids)
        as requested_ids(requested_evidence_id)
  ),

  classified as (
    select
      requested.evidence_id,

      exists (
        select 1
        from
          public.hspp_evidence_assembly_members
            as historical_member
        where
          historical_member.organization_id =
            p_organization_id
          and historical_member.evidence_id =
            requested.evidence_id
      ) as has_historical_membership,

      exists (
        select 1
        from
          public.hspp_evidence_assembly_members
            as current_member
        where
          current_member.organization_id =
            p_organization_id
          and current_member.evidence_id =
            requested.evidence_id

          and not exists (
            select 1
            from
              public.hspp_evidence_assembly_reconstructions
                as reconstruction
            where
              reconstruction.organization_id =
                p_organization_id
              and reconstruction.parent_assembly_id =
                current_member.assembly_id
          )

          and not exists (
            select 1
            from
              public.hspp_assembly_member_effective_cessations
                as cessation
            where
              cessation.organization_id =
                p_organization_id
              and cessation.historical_membership_id =
                current_member.id
          )
      ) as has_current_effective_membership

    from
      requested
  )

  select
    classified.evidence_id,

    classified.has_historical_membership,

    classified.has_current_effective_membership,

    case
      when
        classified.has_current_effective_membership
      then
        'CURRENT_EFFECTIVE'

      when
        classified.has_historical_membership
      then
        'HISTORICAL_NOT_CURRENT'

      else
        'NEVER_ASSEMBLED'
    end as membership_classification

  from
    classified

  order by
    classified.evidence_id;

end;
$$;


comment on function
  public.read_hspp_evidence_assembly_membership_classifications(
    uuid,
    uuid[]
  )
is
  'B7490-14AG8 bounded service-role-only HSPP membership lifecycle classifier. For each requested evidence identity it derives NEVER_ASSEMBLED, HISTORICAL_NOT_CURRENT or CURRENT_EFFECTIVE from immutable assembly membership, reconstruction lineage and exact effective-cessation facts in one read statement. It does not grant Reservoir, trust, replacement, reconstruction, validation or downstream authority.';


revoke all on function
  public.read_hspp_evidence_assembly_membership_classifications(
    uuid,
    uuid[]
  )
from public;


revoke all on function
  public.read_hspp_evidence_assembly_membership_classifications(
    uuid,
    uuid[]
  )
from anon;


revoke all on function
  public.read_hspp_evidence_assembly_membership_classifications(
    uuid,
    uuid[]
  )
from authenticated;


grant execute on function
  public.read_hspp_evidence_assembly_membership_classifications(
    uuid,
    uuid[]
  )
to service_role;
