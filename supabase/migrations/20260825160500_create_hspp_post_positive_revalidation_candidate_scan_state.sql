begin;

-- Dormant R1 post-positive revalidation candidate scan-state substrate.
--
-- This state is scheduling/progress metadata only.
-- It cannot qualify an R1 item, create an unsuitability checkpoint,
-- cease membership, return evidence to Reservoir, reconstruct H2,
-- or grant downstream authority.
--
-- One independent cursor is scoped to one immutable Q14p positive
-- checkpoint. The candidate ordering identity is:
--
--   observed_at ASC,
--   evidence id ASC
--
-- Current and previous cursor pairs are retained so the CAS can
-- distinguish exact retry from stale contention.
--
-- Circular scanning deliberately requires no monotonic cursor rule.

create table
  public.hspp_post_positive_revalidation_candidate_scan_states (
    positive_checkpoint_id uuid
      primary key
      references
        public.hspp_assembly_positive_assessment_checkpoints(id)
      on delete restrict,

    organization_id uuid
      not null,

    subject_evidence_id uuid
      not null,

    subject_integrity_fingerprint text
      not null,

    state_version text
      not null
      default
        'hspp-post-positive-revalidation-candidate-scan-state-v1',

    cursor_observed_at timestamptz
      null,

    cursor_evidence_id uuid
      null,

    previous_cursor_observed_at timestamptz
      null,

    previous_cursor_evidence_id uuid
      null,

    created_at timestamptz
      not null
      default now(),

    updated_at timestamptz
      not null
      default now(),

    constraint
      hspp_post_positive_revalidation_candidate_scan_subject_fingerprint
    check (
      subject_integrity_fingerprint ~ '^[0-9a-f]{64}$'
    ),

    constraint
      hspp_post_positive_revalidation_candidate_scan_state_version_exact
    check (
      state_version =
        'hspp-post-positive-revalidation-candidate-scan-state-v1'
    ),

    constraint
      hspp_post_positive_revalidation_candidate_scan_current_cursor_pair
    check (
      (
        cursor_observed_at is null
        and cursor_evidence_id is null
      )
      or
      (
        cursor_observed_at is not null
        and cursor_evidence_id is not null
      )
    ),

    constraint
      hspp_post_positive_revalidation_candidate_scan_previous_cursor_pair
    check (
      (
        previous_cursor_observed_at is null
        and previous_cursor_evidence_id is null
      )
      or
      (
        previous_cursor_observed_at is not null
        and previous_cursor_evidence_id is not null
      )
    ),

    constraint
      hspp_post_positive_revalidation_candidate_scan_subject_fk
    foreign key (
      organization_id,
      subject_evidence_id,
      subject_integrity_fingerprint
    )
    references public.hspp_evidence (
      organization_id,
      id,
      integrity_fingerprint
    )
    on delete restrict,

    constraint
      hspp_post_positive_revalidation_candidate_scan_cursor_evidence_fk
    foreign key (
      cursor_evidence_id
    )
    references public.hspp_evidence (
      id
    )
    on delete restrict,

    constraint
      hspp_post_positive_revalidation_candidate_scan_previous_evidence_fk
    foreign key (
      previous_cursor_evidence_id
    )
    references public.hspp_evidence (
      id
    )
    on delete restrict
  );


alter table
  public.hspp_post_positive_revalidation_candidate_scan_states
enable row level security;


-- Direct mutation remains closed, including to service_role.
revoke all
on table
  public.hspp_post_positive_revalidation_candidate_scan_states
from public,
     anon,
     authenticated,
     service_role;


-- Read access is harmless scheduling visibility.
grant select
on table
  public.hspp_post_positive_revalidation_candidate_scan_states
to service_role;


create or replace function
  public.compare_and_swap_hspp_post_positive_revalidation_candidate_scan_state(
    p_positive_checkpoint_id uuid,

    p_expected_cursor_observed_at timestamptz,

    p_expected_cursor_evidence_id uuid,

    p_proposed_cursor_observed_at timestamptz,

    p_proposed_cursor_evidence_id uuid
  )
returns table (
  cas_state text,

  state_version text,

  positive_checkpoint_id uuid,

  organization_id uuid,

  subject_evidence_id uuid,

  subject_integrity_fingerprint text,

  cursor_observed_at timestamptz,

  cursor_evidence_id uuid,

  previous_cursor_observed_at timestamptz,

  previous_cursor_evidence_id uuid,

  created_at timestamptz,

  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_state
    public.hspp_post_positive_revalidation_candidate_scan_states%rowtype;

  v_organization_id uuid;

  v_subject_evidence_id uuid;

  v_subject_integrity_fingerprint text;

  v_positive_assessed_at timestamptz;
begin

  if p_positive_checkpoint_id is null then
    raise exception
      'p_positive_checkpoint_id is required';
  end if;


  if (
    (
      p_expected_cursor_observed_at is null
      and p_expected_cursor_evidence_id is not null
    )
    or
    (
      p_expected_cursor_observed_at is not null
      and p_expected_cursor_evidence_id is null
    )
  ) then
    raise exception
      'Expected R1 candidate cursor requires both observed_at and evidence_id or neither.';
  end if;


  if (
    p_proposed_cursor_observed_at is null
    or p_proposed_cursor_evidence_id is null
  ) then
    raise exception
      'Proposed R1 candidate cursor requires both observed_at and evidence_id.';
  end if;


  /*
   * Serialize all state transitions for one immutable Q14p scope.
   * This is transaction-scoped scheduling serialization only.
   * It is not an HSPP execution lease.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-post-positive-revalidation-candidate-scan-state:' ||
      p_positive_checkpoint_id::text,
      0
    )
  );


  /*
   * Derive the authoritative organization and historical C identity
   * directly from Q14p rather than trusting caller-supplied copies.
   */
  select
    positive.organization_id,
    positive.evidence_id,
    positive.integrity_fingerprint,
    positive.assessed_at
  into
    v_organization_id,
    v_subject_evidence_id,
    v_subject_integrity_fingerprint,
    v_positive_assessed_at
  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive
  where
    positive.id =
      p_positive_checkpoint_id
  for key share;


  if not found then
    raise exception
      'R1 candidate scan positive checkpoint does not exist.';
  end if;


  /*
   * An expected cursor, when supplied, must itself be one immutable
   * structural R1 candidate for this exact Q14p / historical C.
   *
   * No semantic payload decision or integrity result is interpreted
   * here. Those remain owned by the verifier/evaluator.
   */
  if p_expected_cursor_evidence_id is not null then

    perform 1
    from
      public.hspp_evidence
        as candidate
    where
      candidate.id =
        p_expected_cursor_evidence_id

      and candidate.organization_id =
        v_organization_id

      and candidate.observed_at =
        p_expected_cursor_observed_at

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
        'hspp-post-positive-revalidation-v1';


    if not found then
      raise exception
        'Expected R1 candidate cursor is not a canonical structural candidate for this positive checkpoint.';
    end if;

  end if;


  /*
   * Proposed advancement must also point at one exact structural R1
   * candidate. Qualification remains a separate semantic authority.
   */
  perform 1
  from
    public.hspp_evidence
      as candidate
  where
    candidate.id =
      p_proposed_cursor_evidence_id

    and candidate.organization_id =
      v_organization_id

    and candidate.observed_at =
      p_proposed_cursor_observed_at

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
      'hspp-post-positive-revalidation-v1';


  if not found then
    raise exception
      'Proposed R1 candidate cursor is not a canonical structural candidate for this positive checkpoint.';
  end if;


  select
    scan_state.*
  into
    v_state
  from
    public.hspp_post_positive_revalidation_candidate_scan_states
      as scan_state
  where
    scan_state.positive_checkpoint_id =
      p_positive_checkpoint_id
  for update;


  /*
   * No durable state exists yet.
   *
   * Only a caller which observed null may establish the first cursor.
   * A caller expecting an older non-null state is stale.
   */
  if not found then

    if p_expected_cursor_evidence_id is not null then
      return query
      select
        'STALE'::text,

        'hspp-post-positive-revalidation-candidate-scan-state-v1'::text,

        p_positive_checkpoint_id,

        v_organization_id,

        v_subject_evidence_id,

        v_subject_integrity_fingerprint,

        null::timestamptz,

        null::uuid,

        null::timestamptz,

        null::uuid,

        null::timestamptz,

        null::timestamptz;

      return;
    end if;


    insert into
      public.hspp_post_positive_revalidation_candidate_scan_states (
        positive_checkpoint_id,
        organization_id,
        subject_evidence_id,
        subject_integrity_fingerprint,
        state_version,
        cursor_observed_at,
        cursor_evidence_id,
        previous_cursor_observed_at,
        previous_cursor_evidence_id
      )
    values (
      p_positive_checkpoint_id,
      v_organization_id,
      v_subject_evidence_id,
      v_subject_integrity_fingerprint,
      'hspp-post-positive-revalidation-candidate-scan-state-v1',
      p_proposed_cursor_observed_at,
      p_proposed_cursor_evidence_id,
      null,
      null
    )
    returning *
    into v_state;


    return query
    select
      'ADVANCED'::text,
      v_state.state_version,
      v_state.positive_checkpoint_id,
      v_state.organization_id,
      v_state.subject_evidence_id,
      v_state.subject_integrity_fingerprint,
      v_state.cursor_observed_at,
      v_state.cursor_evidence_id,
      v_state.previous_cursor_observed_at,
      v_state.previous_cursor_evidence_id,
      v_state.created_at,
      v_state.updated_at;

    return;
  end if;


  if
    v_state.state_version <>
      'hspp-post-positive-revalidation-candidate-scan-state-v1'
  then
    raise exception
      'Unsupported R1 candidate scan-state version.';
  end if;


  /*
   * The mutable scheduling row must remain bound to the same immutable
   * Q14p organization and historical C identity.
   */
  if (
    v_state.organization_id <>
      v_organization_id

    or v_state.subject_evidence_id <>
      v_subject_evidence_id

    or v_state.subject_integrity_fingerprint <>
      v_subject_integrity_fingerprint
  ) then
    raise exception
      'Persisted R1 candidate scan-state conflicts with Q14p scope.';
  end if;


  /*
   * Explicit expected -> same proposed while current is also the same
   * cursor is an ordinary no-op.
   */
  if (
    v_state.cursor_observed_at
      is not distinct from
        p_expected_cursor_observed_at

    and v_state.cursor_evidence_id
      is not distinct from
        p_expected_cursor_evidence_id

    and v_state.cursor_observed_at
      is not distinct from
        p_proposed_cursor_observed_at

    and v_state.cursor_evidence_id
      is not distinct from
        p_proposed_cursor_evidence_id
  ) then

    return query
    select
      'NO_CHANGE'::text,
      v_state.state_version,
      v_state.positive_checkpoint_id,
      v_state.organization_id,
      v_state.subject_evidence_id,
      v_state.subject_integrity_fingerprint,
      v_state.cursor_observed_at,
      v_state.cursor_evidence_id,
      v_state.previous_cursor_observed_at,
      v_state.previous_cursor_evidence_id,
      v_state.created_at,
      v_state.updated_at;

    return;
  end if;


  /*
   * Exact retry:
   *
   *   current  == caller proposed
   *   previous == caller expected
   *
   * No mutation occurs.
   */
  if (
    v_state.cursor_observed_at
      is not distinct from
        p_proposed_cursor_observed_at

    and v_state.cursor_evidence_id
      is not distinct from
        p_proposed_cursor_evidence_id

    and v_state.previous_cursor_observed_at
      is not distinct from
        p_expected_cursor_observed_at

    and v_state.previous_cursor_evidence_id
      is not distinct from
        p_expected_cursor_evidence_id
  ) then

    return query
    select
      'EXACT_RETRY'::text,
      v_state.state_version,
      v_state.positive_checkpoint_id,
      v_state.organization_id,
      v_state.subject_evidence_id,
      v_state.subject_integrity_fingerprint,
      v_state.cursor_observed_at,
      v_state.cursor_evidence_id,
      v_state.previous_cursor_observed_at,
      v_state.previous_cursor_evidence_id,
      v_state.created_at,
      v_state.updated_at;

    return;
  end if;


  /*
   * A caller that did not observe the persisted current cursor is
   * stale and may not replace it.
   */
  if not (
    v_state.cursor_observed_at
      is not distinct from
        p_expected_cursor_observed_at

    and v_state.cursor_evidence_id
      is not distinct from
        p_expected_cursor_evidence_id
  ) then

    return query
    select
      'STALE'::text,
      v_state.state_version,
      v_state.positive_checkpoint_id,
      v_state.organization_id,
      v_state.subject_evidence_id,
      v_state.subject_integrity_fingerprint,
      v_state.cursor_observed_at,
      v_state.cursor_evidence_id,
      v_state.previous_cursor_observed_at,
      v_state.previous_cursor_evidence_id,
      v_state.created_at,
      v_state.updated_at;

    return;
  end if;


  /*
   * The expected cursor owns this transition.
   *
   * Deliberately do NOT compare ordering between expected and proposed.
   * A circular scan must be able to wrap from a later immutable key
   * to an earlier immutable key.
   */
  update
    public.hspp_post_positive_revalidation_candidate_scan_states
  set
    previous_cursor_observed_at =
      v_state.cursor_observed_at,

    previous_cursor_evidence_id =
      v_state.cursor_evidence_id,

    cursor_observed_at =
      p_proposed_cursor_observed_at,

    cursor_evidence_id =
      p_proposed_cursor_evidence_id,

    updated_at =
      now()
  where
    positive_checkpoint_id =
      p_positive_checkpoint_id
  returning *
  into v_state;


  return query
  select
    'ADVANCED'::text,
    v_state.state_version,
    v_state.positive_checkpoint_id,
    v_state.organization_id,
    v_state.subject_evidence_id,
    v_state.subject_integrity_fingerprint,
    v_state.cursor_observed_at,
    v_state.cursor_evidence_id,
    v_state.previous_cursor_observed_at,
    v_state.previous_cursor_evidence_id,
    v_state.created_at,
    v_state.updated_at;
end;
$function$;


-- Keep the future mutation boundary completely dormant.
revoke all
on function
  public.compare_and_swap_hspp_post_positive_revalidation_candidate_scan_state(
    uuid,
    timestamptz,
    uuid,
    timestamptz,
    uuid
  )
from public,
     anon,
     authenticated,
     service_role;


comment on table
  public.hspp_post_positive_revalidation_candidate_scan_states
is
  'Dormant per-Q14p R1 candidate circular scan progress. Current and previous observed-at/evidence-id cursor pairs are scheduling metadata only and grant no semantic or lifecycle authority.';


comment on function
  public.compare_and_swap_hspp_post_positive_revalidation_candidate_scan_state(
    uuid,
    timestamptz,
    uuid,
    timestamptz,
    uuid
  )
is
  'Dormant CAS substrate for one Q14p-scoped R1 structural-candidate cursor. Validates exact immutable structural candidate identities, supports exact retry/stale detection and circular wrap, and grants no semantic or downstream authority. Execution remains revoked from service_role.';


commit;
