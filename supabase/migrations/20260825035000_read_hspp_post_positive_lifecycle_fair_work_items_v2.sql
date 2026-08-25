begin;

-- ============================================================
-- Post-positive lifecycle fair work discovery V2
-- ============================================================
--
-- This is a bounded READ authority only.
--
-- V2 preserves the exact eligibility substrate of the deployed
-- V1 reader but removes state-specific scheduling lanes.
--
-- Every currently eligible lifecycle work item participates in
-- one circular ordering:
--
--   positive.assessed_at ASC,
--   positive.id ASC
--
-- The one durable organization scan cursor therefore rotates
-- across BOTH:
--
--   REEVALUATION_REQUIRED
--   CESSATION_REQUIRED
--
-- A selected non-empty page always proposes advancement to its
-- final selected positive checkpoint, regardless of work state.
--
-- LEASE_BUSY, isolated item failure, SUITABLE and INDETERMINATE
-- cannot permanently pin another work-state lane because no
-- separate lane exists.
--
-- This function does NOT mutate scan state or lifecycle authority.
-- The caller may attempt the existing exact CAS after processing
-- the captured page.
-- ============================================================

create or replace function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
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


  after_cursor as (

    select
      eligible.*,

      row_number() over (
        order by
          eligible.positive_assessed_at asc,
          eligible.positive_checkpoint_id asc
      )
        as page_position

    from
      eligible

    where
      v_cursor_positive_checkpoint_id
        is null

      or row(
        eligible.positive_assessed_at,
        eligible.positive_checkpoint_id
      ) > row(
        v_cursor_positive_assessed_at,
        v_cursor_positive_checkpoint_id
      )

    order by
      eligible.positive_assessed_at asc,
      eligible.positive_checkpoint_id asc

    limit p_limit
  ),


  after_count as (

    select
      count(*)::integer
        as selected_count

    from
      after_cursor
  ),


  wrap_page as (

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
        as page_position

    from
      eligible

    where
      v_cursor_positive_checkpoint_id
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
          p_limit -
            selected_count,
          0
        )

      from
        after_count
    )
  ),


  selected_page as (

    select
      *

    from
      after_cursor

    union all

    select
      *

    from
      wrap_page
  ),


  proposed_cursor as (

    select
      selected_page.positive_assessed_at,
      selected_page.positive_checkpoint_id

    from
      selected_page

    order by
      selected_page.page_position desc

    limit 1
  )


  select
    selected_page.positive_checkpoint_id,
    selected_page.organization_id,
    selected_page.assembly_id,
    selected_page.membership_id,
    selected_page.evidence_id,
    selected_page.integrity_fingerprint,
    selected_page.positive_assessed_at,
    selected_page.unsuitability_checkpoint_id,
    selected_page.unsuitability_observed_at,
    selected_page.unsuitability_decided_at,

    case
      when selected_page.unsuitability_checkpoint_id
        is null
      then 'REEVALUATION_REQUIRED'::text
      else 'CESSATION_REQUIRED'::text
    end
      as work_state,

    v_cursor_positive_assessed_at
      as cursor_expected_positive_assessed_at,

    v_cursor_positive_checkpoint_id
      as cursor_expected_positive_checkpoint_id,

    proposed_cursor.positive_assessed_at
      as cursor_proposed_positive_assessed_at,

    proposed_cursor.positive_checkpoint_id
      as cursor_proposed_positive_checkpoint_id

  from
    selected_page

  left join
    proposed_cursor
    on true

  order by
    selected_page.page_position asc;

end;
$function$;


comment on function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
    uuid,
    integer
  )
is
  'Bounded service-role post-positive lifecycle fair discovery V2. One circular positive-assessed-at plus positive-checkpoint-id cursor rotates across all currently eligible REEVALUATION_REQUIRED and CESSATION_REQUIRED work. Every non-empty selected page proposes advancement to its final selected checkpoint. This read authority does not mutate lifecycle, scan state, or downstream authority.';


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
    uuid,
    integer
  )
from public;


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
    uuid,
    integer
  )
from anon;


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
    uuid,
    integer
  )
from authenticated;


revoke all on function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
    uuid,
    integer
  )
from service_role;


grant execute on function
  public.read_hspp_post_positive_lifecycle_fair_work_items_v2(
    uuid,
    integer
  )
to service_role;


commit;
