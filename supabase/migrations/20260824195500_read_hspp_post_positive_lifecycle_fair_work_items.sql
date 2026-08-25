begin;

-- ============================================================
-- Post-positive lifecycle fair work discovery
-- ============================================================
--
-- This is a bounded READ authority only.
--
-- It preserves the exact eligibility semantics of
-- read_hspp_post_positive_lifecycle_work_items while preventing
-- ordinary REEVALUATION_REQUIRED rows from permanently occupying
-- the front of the bounded page.
--
-- Selection policy:
--
-- 1. CESSATION_REQUIRED work is selected first.
-- 2. Remaining capacity is used for REEVALUATION_REQUIRED work.
-- 3. Reevaluation starts strictly after the durable scan cursor.
-- 4. If capacity remains, selection wraps to the beginning.
-- 5. Only selected reevaluation work contributes to proposed cursor.
-- 6. A cessation-only page exposes no cursor-advance proposal.
--
-- This function does NOT mutate the scan cursor. The later caller
-- may separately attempt the already-audited CAS after processing
-- the captured page.
--
-- This function does NOT evaluate unsuitability, persist Q14v,
-- persist cessation, acquire a lease, return evidence to Reservoir,
-- create reconstruction, seal/assess descendants, or grant downstream
-- authority.
-- ============================================================

create or replace function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    p_organization_id uuid,
    p_limit integer
  )
returns table (
  positive_checkpoint_id uuid,
  organization_id uuid,
  assembly_id uuid,
  membership_id uuid,
  evidence_id uuid,
  integrity_fingerprint text,
  positive_assessed_at timestamptz,
  unsuitability_checkpoint_id uuid,
  unsuitability_observed_at timestamptz,
  unsuitability_decided_at timestamptz,
  work_state text,
  cursor_expected_positive_assessed_at timestamptz,
  cursor_expected_positive_checkpoint_id uuid,
  cursor_proposed_positive_assessed_at timestamptz,
  cursor_proposed_positive_checkpoint_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_scan_state_version text;

  v_cursor_positive_assessed_at timestamptz;

  v_cursor_positive_checkpoint_id uuid;
begin
  if p_organization_id is null then
    raise exception
      'Post-positive fair lifecycle work organization id is required.';
  end if;


  if (
    p_limit is null
    or p_limit < 1
    or p_limit > 100
  ) then
    raise exception
      'Post-positive fair lifecycle work limit must be between 1 and 100.';
  end if;


  -- One statement snapshot owns both the cursor observation and
  -- candidate selection. A later CAS rejects this page if another
  -- execution advanced the durable cursor in the meantime.
  select
    scan_state.state_version,
    scan_state.cursor_positive_assessed_at,
    scan_state.cursor_positive_checkpoint_id

  into
    v_scan_state_version,
    v_cursor_positive_assessed_at,
    v_cursor_positive_checkpoint_id

  from
    public.hspp_post_positive_lifecycle_scan_states
      as scan_state

  where
    scan_state.organization_id =
      p_organization_id;


  if found then

    if
      v_scan_state_version <>
        'hspp-post-positive-lifecycle-scan-state-v1'
    then
      raise exception
        'Unsupported post-positive lifecycle scan-state version.';
    end if;


    if (
      (
        v_cursor_positive_assessed_at is null
        and v_cursor_positive_checkpoint_id is not null
      )
      or
      (
        v_cursor_positive_assessed_at is not null
        and v_cursor_positive_checkpoint_id is null
      )
    ) then
      raise exception
        'Persisted post-positive lifecycle scan cursor is incomplete.';
    end if;

  else

    v_scan_state_version :=
      null;

    v_cursor_positive_assessed_at :=
      null;

    v_cursor_positive_checkpoint_id :=
      null;

  end if;


  return query

  with eligible as (

    select
      positive.id
        as positive_checkpoint_id,

      positive.organization_id,

      positive.assembly_id,

      member.id
        as membership_id,

      positive.evidence_id,

      positive.integrity_fingerprint,

      positive.assessed_at
        as positive_assessed_at,

      unsuitability.id
        as unsuitability_checkpoint_id,

      unsuitability.observed_at
        as unsuitability_observed_at,

      unsuitability.decided_at
        as unsuitability_decided_at

    from
      public.hspp_assembly_positive_assessment_checkpoints
        as positive

    inner join
      public.hspp_evidence_assemblies
        as assembly
      on
        assembly.organization_id =
          positive.organization_id
        and assembly.id =
          positive.assembly_id
        and assembly.assembly_state =
          'SEALED'

    inner join
      public.hspp_evidence_assembly_members
        as member
      on
        member.organization_id =
          positive.organization_id
        and member.assembly_id =
          positive.assembly_id
        and member.evidence_id =
          positive.evidence_id
        and member.evidence_integrity_fingerprint =
          positive.integrity_fingerprint

    inner join
      public.hspp_assembly_assessment_completions
        as completion
      on
        completion.organization_id =
          positive.organization_id
        and completion.assembly_id =
          positive.assembly_id

    left join
      public.hspp_assembly_member_unsuitability_checkpoints
        as unsuitability
      on
        unsuitability.organization_id =
          positive.organization_id
        and unsuitability.assembly_id =
          positive.assembly_id
        and unsuitability.evidence_id =
          positive.evidence_id
        and unsuitability.prior_positive_checkpoint_id =
          positive.id

    where
      positive.organization_id =
        p_organization_id

      -- Current reconstruction-lineage leaf only.
      and not exists (

        select
          1

        from
          public.hspp_evidence_assembly_reconstructions
            as reconstruction

        where
          reconstruction.organization_id =
            positive.organization_id

          and reconstruction.parent_assembly_id =
            positive.assembly_id
      )

      -- Exact membership remains currently effective only until
      -- immutable Q14ab/Q14ac cessation exists.
      and not exists (

        select
          1

        from
          public.hspp_assembly_member_effective_cessations
            as cessation

        where
          cessation.organization_id =
            positive.organization_id

          and cessation.historical_membership_id =
            member.id
      )
  ),


  cessation_page as (

    select
      eligible.*,

      row_number() over (
        order by
          eligible.positive_assessed_at asc,
          eligible.positive_checkpoint_id asc
      )
        as lane_position

    from
      eligible

    where
      eligible.unsuitability_checkpoint_id
        is not null

    order by
      eligible.positive_assessed_at asc,
      eligible.positive_checkpoint_id asc

    limit p_limit
  ),


  capacity as (

    select
      greatest(
        p_limit -
          count(*)::integer,
        0
      )
        as remaining

    from
      cessation_page
  ),


  reevaluation_after_cursor as (

    select
      eligible.*,

      row_number() over (
        order by
          eligible.positive_assessed_at asc,
          eligible.positive_checkpoint_id asc
      )
        as lane_position

    from
      eligible

    where
      eligible.unsuitability_checkpoint_id
        is null

      and (
        select
          remaining

        from
          capacity
      ) > 0

      and (
        v_cursor_positive_checkpoint_id
          is null

        or row(
          eligible.positive_assessed_at,
          eligible.positive_checkpoint_id
        ) > row(
          v_cursor_positive_assessed_at,
          v_cursor_positive_checkpoint_id
        )
      )

    order by
      eligible.positive_assessed_at asc,
      eligible.positive_checkpoint_id asc

    limit (
      select
        remaining

      from
        capacity
    )
  ),


  after_count as (

    select
      count(*)::integer
        as selected_count

    from
      reevaluation_after_cursor
  ),


  reevaluation_wrap as (

    select
      eligible.*,

      (
        select
          selected_count

        from
          after_count
      )::bigint
      +
      row_number() over (
        order by
          eligible.positive_assessed_at asc,
          eligible.positive_checkpoint_id asc
      )
        as lane_position

    from
      eligible

    where
      eligible.unsuitability_checkpoint_id
        is null

      and v_cursor_positive_checkpoint_id
        is not null

      and row(
        eligible.positive_assessed_at,
        eligible.positive_checkpoint_id
      ) <= row(
        v_cursor_positive_assessed_at,
        v_cursor_positive_checkpoint_id
      )

    order by
      eligible.positive_assessed_at asc,
      eligible.positive_checkpoint_id asc

    limit (
      select
        greatest(
          capacity.remaining -
            after_count.selected_count,
          0
        )

      from
        capacity

      cross join
        after_count
    )
  ),


  reevaluation_page as (

    select
      *

    from
      reevaluation_after_cursor

    union all

    select
      *

    from
      reevaluation_wrap
  ),


  proposed_cursor as (

    select
      reevaluation_page.positive_assessed_at,

      reevaluation_page.positive_checkpoint_id

    from
      reevaluation_page

    order by
      reevaluation_page.lane_position desc

    limit 1
  ),


  selected_work as (

    select
      cessation_page.positive_checkpoint_id,

      cessation_page.organization_id,

      cessation_page.assembly_id,

      cessation_page.membership_id,

      cessation_page.evidence_id,

      cessation_page.integrity_fingerprint,

      cessation_page.positive_assessed_at,

      cessation_page.unsuitability_checkpoint_id,

      cessation_page.unsuitability_observed_at,

      cessation_page.unsuitability_decided_at,

      'CESSATION_REQUIRED'::text
        as work_state,

      0::integer
        as lane_order,

      cessation_page.lane_position

    from
      cessation_page

    union all

    select
      reevaluation_page.positive_checkpoint_id,

      reevaluation_page.organization_id,

      reevaluation_page.assembly_id,

      reevaluation_page.membership_id,

      reevaluation_page.evidence_id,

      reevaluation_page.integrity_fingerprint,

      reevaluation_page.positive_assessed_at,

      reevaluation_page.unsuitability_checkpoint_id,

      reevaluation_page.unsuitability_observed_at,

      reevaluation_page.unsuitability_decided_at,

      'REEVALUATION_REQUIRED'::text
        as work_state,

      1::integer
        as lane_order,

      reevaluation_page.lane_position

    from
      reevaluation_page
  )


  select
    selected_work.positive_checkpoint_id,

    selected_work.organization_id,

    selected_work.assembly_id,

    selected_work.membership_id,

    selected_work.evidence_id,

    selected_work.integrity_fingerprint,

    selected_work.positive_assessed_at,

    selected_work.unsuitability_checkpoint_id,

    selected_work.unsuitability_observed_at,

    selected_work.unsuitability_decided_at,

    selected_work.work_state,

    case
      when proposed_cursor.positive_checkpoint_id
        is null
      then null
      else v_cursor_positive_assessed_at
    end
      as cursor_expected_positive_assessed_at,

    case
      when proposed_cursor.positive_checkpoint_id
        is null
      then null
      else v_cursor_positive_checkpoint_id
    end
      as cursor_expected_positive_checkpoint_id,

    proposed_cursor.positive_assessed_at
      as cursor_proposed_positive_assessed_at,

    proposed_cursor.positive_checkpoint_id
      as cursor_proposed_positive_checkpoint_id

  from
    selected_work

  left join
    proposed_cursor
    on true

  order by
    selected_work.lane_order asc,
    selected_work.lane_position asc;

end;
$function$;


comment on function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    uuid,
    integer
  )
is
  'Bounded service-role fair post-positive lifecycle work discovery. CESSATION_REQUIRED is selected first. Remaining capacity selects REEVALUATION_REQUIRED by circular positive-assessed-at plus positive-checkpoint-id keyset after the durable organization scan cursor, wrapping to the beginning when required. Only reevaluation selection proposes cursor advancement. This read authority does not mutate lifecycle, scan state or downstream authority.';


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    uuid,
    integer
  )
from public;


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    uuid,
    integer
  )
from anon;


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    uuid,
    integer
  )
from authenticated;


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    uuid,
    integer
  )
from service_role;


grant execute on function
  public.read_hspp_post_positive_lifecycle_fair_work_items(
    uuid,
    integer
  )
to service_role;


commit;
