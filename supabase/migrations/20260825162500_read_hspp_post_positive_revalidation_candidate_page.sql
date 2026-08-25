begin;

-- ============================================================
-- HSPP post-positive R1 circular structural candidate page
-- ============================================================
--
-- This migration introduces a bounded READ authority only.
--
-- It does not:
-- - evaluate R1 semantic payload meaning;
-- - verify cryptographic integrity;
-- - mutate candidate scan state;
-- - invoke candidate scan-state CAS;
-- - persist Q14v;
-- - persist member cessation;
-- - invoke Reservoir or reconstruction;
-- - grant production execution.
--
-- The page is scoped by immutable Q14p. Organization, assembly,
-- historical C identity, fingerprint, and positive assessment time
-- are derived from Q14p rather than trusted from caller copies.
--
-- Ordering:
--
--   candidate.observed_at ASC,
--   candidate.id ASC
--
-- Selection begins strictly after the durable R1 cursor. If the
-- requested page still has capacity, it wraps to the beginning
-- through the current cursor. Every selected page proposes its
-- final candidate as the later CAS target.
--
-- No CAS occurs in this function.

create index if not exists
  hspp_evidence_post_positive_revalidation_candidate_scan_idx
on public.hspp_evidence (
  organization_id,
  parent_evidence_id,
  parent_integrity_fingerprint,
  observed_at asc,
  id asc
)
where
  source_class = 'derived'
  and source_provider = 'harborguard'
  and source_stream = 'post-positive-revalidation'
  and payload_schema_version = 'hspp-post-positive-revalidation-v1'
  and derivation_type = 'post_positive_revalidation'
  and derivation_version = 'hspp-post-positive-revalidation-v1';


create or replace function
  public.read_hspp_post_positive_revalidation_candidate_page(
    p_positive_checkpoint_id uuid,
    p_limit integer
  )
returns table (
  reader_version text,

  positive_checkpoint_id uuid,
  organization_id uuid,
  assembly_id uuid,

  subject_evidence_id uuid,
  subject_integrity_fingerprint text,
  positive_assessed_at timestamptz,

  cursor_expected_observed_at timestamptz,
  cursor_expected_evidence_id uuid,

  cursor_proposed_observed_at timestamptz,
  cursor_proposed_evidence_id uuid,

  candidate_evidence_id uuid,
  candidate_observed_at timestamptz,
  candidate_position integer
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_organization_id uuid;
  v_assembly_id uuid;
  v_subject_evidence_id uuid;
  v_subject_integrity_fingerprint text;
  v_positive_assessed_at timestamptz;

  v_state_version text;
  v_state_organization_id uuid;
  v_state_subject_evidence_id uuid;
  v_state_subject_integrity_fingerprint text;

  v_cursor_observed_at timestamptz;
  v_cursor_evidence_id uuid;
begin
  if p_positive_checkpoint_id is null then
    raise exception
      'R1 candidate page positive checkpoint id is required.';
  end if;


  if (
    p_limit is null
    or p_limit < 1
    or p_limit > 25
  ) then
    raise exception
      'R1 candidate page limit must be between 1 and 25.';
  end if;


  /*
   * Q14p is the immutable authority for the page scope.
   */
  select
    positive.organization_id,
    positive.assembly_id,
    positive.evidence_id,
    positive.integrity_fingerprint,
    positive.assessed_at
  into
    v_organization_id,
    v_assembly_id,
    v_subject_evidence_id,
    v_subject_integrity_fingerprint,
    v_positive_assessed_at
  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive
  where
    positive.id =
      p_positive_checkpoint_id;


  if not found then
    raise exception
      'R1 candidate page positive checkpoint does not exist.';
  end if;


  /*
   * Observe the current durable scheduling cursor.
   *
   * This is a read only observation. A later independent CAS is
   * responsible for detecting any concurrent advancement.
   */
  select
    scan_state.state_version,
    scan_state.organization_id,
    scan_state.subject_evidence_id,
    scan_state.subject_integrity_fingerprint,
    scan_state.cursor_observed_at,
    scan_state.cursor_evidence_id
  into
    v_state_version,
    v_state_organization_id,
    v_state_subject_evidence_id,
    v_state_subject_integrity_fingerprint,
    v_cursor_observed_at,
    v_cursor_evidence_id
  from
    public.hspp_post_positive_revalidation_candidate_scan_states
      as scan_state
  where
    scan_state.positive_checkpoint_id =
      p_positive_checkpoint_id;


  if found then

    if
      v_state_version <>
        'hspp-post-positive-revalidation-candidate-scan-state-v1'
    then
      raise exception
        'Unsupported R1 candidate scan-state version.';
    end if;


    if (
      v_state_organization_id <>
        v_organization_id

      or v_state_subject_evidence_id <>
        v_subject_evidence_id

      or v_state_subject_integrity_fingerprint <>
        v_subject_integrity_fingerprint
    ) then
      raise exception
        'R1 candidate scan-state conflicts with immutable Q14p scope.';
    end if;


    if (
      (
        v_cursor_observed_at is null
        and v_cursor_evidence_id is not null
      )
      or
      (
        v_cursor_observed_at is not null
        and v_cursor_evidence_id is null
      )
    ) then
      raise exception
        'Persisted R1 candidate scan cursor is incomplete.';
    end if;

  else

    v_state_version :=
      null;

    v_cursor_observed_at :=
      null;

    v_cursor_evidence_id :=
      null;

  end if;


  /*
   * When a durable cursor exists, independently prove that it still
   * names one structural R1 candidate for this immutable Q14p.
   *
   * No normalized payload semantics or assessment state is read here.
   */
  if v_cursor_evidence_id is not null then

    perform 1
    from
      public.hspp_evidence
        as cursor_candidate
    where
      cursor_candidate.id =
        v_cursor_evidence_id

      and cursor_candidate.organization_id =
        v_organization_id

      and cursor_candidate.observed_at =
        v_cursor_observed_at

      and cursor_candidate.observed_at >=
        v_positive_assessed_at

      and cursor_candidate.source_class =
        'derived'

      and cursor_candidate.source_provider =
        'harborguard'

      and cursor_candidate.source_stream =
        'post-positive-revalidation'

      and cursor_candidate.payload_schema_version =
        'hspp-post-positive-revalidation-v1'

      and cursor_candidate.parent_evidence_id =
        v_subject_evidence_id

      and cursor_candidate.parent_integrity_fingerprint =
        v_subject_integrity_fingerprint

      and cursor_candidate.derivation_type =
        'post_positive_revalidation'

      and cursor_candidate.derivation_version =
        'hspp-post-positive-revalidation-v1';


    if not found then
      raise exception
        'Persisted R1 candidate cursor is not a structural candidate for this positive checkpoint.';
    end if;

  end if;


  return query

  with eligible as (

    select
      candidate.id
        as evidence_id,

      candidate.observed_at
        as observed_at

    from
      public.hspp_evidence
        as candidate

    where
      candidate.organization_id =
        v_organization_id

      and candidate.observed_at >=
        v_positive_assessed_at

      and candidate.source_class =
        'derived'

      and candidate.source_provider =
        'harborguard'

      and candidate.source_stream =
        'post-positive-revalidation'

      and candidate.payload_schema_version =
        'hspp-post-positive-revalidation-v1'

      and candidate.parent_evidence_id =
        v_subject_evidence_id

      and candidate.parent_integrity_fingerprint =
        v_subject_integrity_fingerprint

      and candidate.derivation_type =
        'post_positive_revalidation'

      and candidate.derivation_version =
        'hspp-post-positive-revalidation-v1'
  ),


  after_cursor as (

    select
      eligible.evidence_id,
      eligible.observed_at,

      (
        row_number() over (
          order by
            eligible.observed_at asc,
            eligible.evidence_id asc
        )
      )::integer
        as page_position

    from
      eligible

    where
      v_cursor_evidence_id is null

      or row(
        eligible.observed_at,
        eligible.evidence_id
      ) > row(
        v_cursor_observed_at,
        v_cursor_evidence_id
      )

    order by
      eligible.observed_at asc,
      eligible.evidence_id asc

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
      eligible.evidence_id,
      eligible.observed_at,

      (
        (
          select
            selected_count

          from
            after_count
        )
        +
        (
          row_number() over (
            order by
              eligible.observed_at asc,
              eligible.evidence_id asc
          )
        )::integer
      )::integer
        as page_position

    from
      eligible

    where
      v_cursor_evidence_id is not null

      and row(
        eligible.observed_at,
        eligible.evidence_id
      ) <= row(
        v_cursor_observed_at,
        v_cursor_evidence_id
      )

    order by
      eligible.observed_at asc,
      eligible.evidence_id asc

    limit (
      select
        greatest(
          p_limit - selected_count,
          0
        )

      from
        after_count
    )
  ),


  selected_page as (

    select
      after_cursor.evidence_id,
      after_cursor.observed_at,
      after_cursor.page_position

    from
      after_cursor

    union all

    select
      wrap_page.evidence_id,
      wrap_page.observed_at,
      wrap_page.page_position

    from
      wrap_page
  ),


  proposed as (

    select
      selected_page.observed_at,
      selected_page.evidence_id

    from
      selected_page

    order by
      selected_page.page_position desc

    limit 1
  ),


  page_rows as (

    select
      'hspp-post-positive-revalidation-candidate-page-reader-v1'::text
        as reader_version,

      p_positive_checkpoint_id
        as positive_checkpoint_id,

      v_organization_id
        as organization_id,

      v_assembly_id
        as assembly_id,

      v_subject_evidence_id
        as subject_evidence_id,

      v_subject_integrity_fingerprint
        as subject_integrity_fingerprint,

      v_positive_assessed_at
        as positive_assessed_at,

      v_cursor_observed_at
        as cursor_expected_observed_at,

      v_cursor_evidence_id
        as cursor_expected_evidence_id,

      proposed.observed_at
        as cursor_proposed_observed_at,

      proposed.evidence_id
        as cursor_proposed_evidence_id,

      selected_page.evidence_id
        as candidate_evidence_id,

      selected_page.observed_at
        as candidate_observed_at,

      selected_page.page_position
        as candidate_position

    from
      selected_page

    cross join
      proposed
  ),


  sentinel as (

    select
      'hspp-post-positive-revalidation-candidate-page-reader-v1'::text
        as reader_version,

      p_positive_checkpoint_id
        as positive_checkpoint_id,

      v_organization_id
        as organization_id,

      v_assembly_id
        as assembly_id,

      v_subject_evidence_id
        as subject_evidence_id,

      v_subject_integrity_fingerprint
        as subject_integrity_fingerprint,

      v_positive_assessed_at
        as positive_assessed_at,

      v_cursor_observed_at
        as cursor_expected_observed_at,

      v_cursor_evidence_id
        as cursor_expected_evidence_id,

      null::timestamptz
        as cursor_proposed_observed_at,

      null::uuid
        as cursor_proposed_evidence_id,

      null::uuid
        as candidate_evidence_id,

      null::timestamptz
        as candidate_observed_at,

      null::integer
        as candidate_position

    where
      not exists (
        select 1
        from selected_page
      )
  )


  select
    result.reader_version,

    result.positive_checkpoint_id,
    result.organization_id,
    result.assembly_id,

    result.subject_evidence_id,
    result.subject_integrity_fingerprint,
    result.positive_assessed_at,

    result.cursor_expected_observed_at,
    result.cursor_expected_evidence_id,

    result.cursor_proposed_observed_at,
    result.cursor_proposed_evidence_id,

    result.candidate_evidence_id,
    result.candidate_observed_at,
    result.candidate_position

  from (

    select *
    from page_rows

    union all

    select *
    from sentinel

  ) as result

  order by
    result.candidate_position asc
      nulls first;

end;
$function$;


comment on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
is
  'Dormant bounded read-only R1 structural candidate page. Scope is derived from immutable Q14p. Selection uses circular observed_at plus evidence-id keyset ordering and exposes expected/proposed cursor identity for a later independent CAS. It does not evaluate semantic payload meaning, verify integrity, mutate scan state, or persist lifecycle authority.';


-- Keep the new read boundary dormant until the later cutover unit.
revoke all on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
from public;

revoke all on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
from anon;

revoke all on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
from authenticated;

revoke all on function
  public.read_hspp_post_positive_revalidation_candidate_page(
    uuid,
    integer
  )
from service_role;

commit;
