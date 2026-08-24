-- ============================================================
-- Post-positive lifecycle fairness scan state
-- ============================================================
--
-- This table is non-authoritative processing state only.
--
-- It exists solely to allow bounded post-positive reevaluation
-- discovery to make durable circular progress across outer recovery
-- executions.
--
-- Row existence or cursor position does NOT prove:
--
-- - evidence truth or integrity;
-- - validation, trust or operational eligibility;
-- - post-positive unsuitability;
-- - Q14v existence;
-- - effective-membership cessation;
-- - Reservoir eligibility;
-- - descendant reconstruction;
-- - assembly sealing or assessment;
-- - Route Safety, Crowd Intelligence, ML or validation authority.
--
-- The cursor pair intentionally uses the same immutable deterministic
-- ordering identity as post-positive discovery:
--
--   positive_assessed_at
--   positive_checkpoint_id
--
-- Circular wrap-around means a legitimate next cursor may compare
-- lower than the current cursor. Therefore key ordering itself MUST
-- NOT be used as concurrency authority.
--
-- Concurrency is instead controlled by exact compare-and-swap
-- identity:
--
--   expected cursor -> proposed cursor
--
-- The previous cursor is retained so an exact retry can be
-- distinguished from an unrelated stale writer which happens to
-- propose the currently-persisted cursor.
-- ============================================================


create table public.hspp_post_positive_lifecycle_scan_states (
  organization_id uuid
    primary key
    references public.organizations(id)
    on delete cascade,

  state_version text
    not null
    default 'hspp-post-positive-lifecycle-scan-state-v1',

  cursor_positive_assessed_at timestamptz null,

  cursor_positive_checkpoint_id uuid null,

  previous_cursor_positive_assessed_at timestamptz null,

  previous_cursor_positive_checkpoint_id uuid null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint hspp_post_positive_lifecycle_scan_state_version_exact
    check (
      state_version =
        'hspp-post-positive-lifecycle-scan-state-v1'
    ),

  constraint hspp_post_positive_lifecycle_scan_current_cursor_pair
    check (
      (
        cursor_positive_assessed_at is null
        and cursor_positive_checkpoint_id is null
      )
      or
      (
        cursor_positive_assessed_at is not null
        and cursor_positive_checkpoint_id is not null
      )
    ),

  constraint hspp_post_positive_lifecycle_scan_previous_cursor_pair
    check (
      (
        previous_cursor_positive_assessed_at is null
        and previous_cursor_positive_checkpoint_id is null
      )
      or
      (
        previous_cursor_positive_assessed_at is not null
        and previous_cursor_positive_checkpoint_id is not null
      )
    )
);


alter table
  public.hspp_post_positive_lifecycle_scan_states
enable row level security;


-- Direct writes remain closed even to the service role.
--
-- Future orchestration may read the non-authoritative cursor, but all
-- mutation must pass through the audited CAS RPC below.

revoke all
on table
  public.hspp_post_positive_lifecycle_scan_states
from public,
     anon,
     authenticated,
     service_role;


grant select
on table
  public.hspp_post_positive_lifecycle_scan_states
to service_role;


create or replace function
  public.compare_and_swap_hspp_post_positive_lifecycle_scan_state(
    p_organization_id uuid,

    p_expected_cursor_positive_assessed_at timestamptz,

    p_expected_cursor_positive_checkpoint_id uuid,

    p_proposed_cursor_positive_assessed_at timestamptz,

    p_proposed_cursor_positive_checkpoint_id uuid
  )
returns table (
  cas_state text,

  state_version text,

  organization_id uuid,

  cursor_positive_assessed_at timestamptz,

  cursor_positive_checkpoint_id uuid,

  previous_cursor_positive_assessed_at timestamptz,

  previous_cursor_positive_checkpoint_id uuid,

  created_at timestamptz,

  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state
    public.hspp_post_positive_lifecycle_scan_states%rowtype;

  v_expected_assessed_at timestamptz;

  v_proposed_assessed_at timestamptz;
begin
  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;


  if (
    (
      p_expected_cursor_positive_assessed_at is null
      and p_expected_cursor_positive_checkpoint_id is not null
    )
    or
    (
      p_expected_cursor_positive_assessed_at is not null
      and p_expected_cursor_positive_checkpoint_id is null
    )
  ) then
    raise exception
      'Expected post-positive lifecycle cursor requires both positive_assessed_at and positive_checkpoint_id or neither.';
  end if;


  if (
    p_proposed_cursor_positive_assessed_at is null
    or p_proposed_cursor_positive_checkpoint_id is null
  ) then
    raise exception
      'Proposed post-positive lifecycle cursor requires both positive_assessed_at and positive_checkpoint_id.';
  end if;


  /*
   * Serialize all scan-state CAS decisions for this exact
   * organization, including the first transition when no state row
   * exists yet.
   *
   * This lock is transaction-scoped only. It does not represent an
   * application execution lease.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-post-positive-lifecycle-scan-state:' ||
      p_organization_id::text,
      0
    )
  );


  perform 1
  from public.organizations as organization
  where organization.id =
    p_organization_id;

  if not found then
    raise exception
      'Unknown HSPP post-positive lifecycle scan-state organization.';
  end if;


  /*
   * If the caller supplied an expected cursor, prove that it is a
   * real immutable positive checkpoint identity for this organization.
   */
  if p_expected_cursor_positive_checkpoint_id is not null then
    select
      positive.assessed_at
    into
      v_expected_assessed_at
    from
      public.hspp_assembly_positive_assessment_checkpoints
        as positive
    where
      positive.organization_id =
        p_organization_id
      and positive.id =
        p_expected_cursor_positive_checkpoint_id;

    if not found then
      raise exception
        'Expected post-positive lifecycle cursor checkpoint does not exist for organization.';
    end if;

    if
      v_expected_assessed_at is distinct from
        p_expected_cursor_positive_assessed_at
    then
      raise exception
        'Expected post-positive lifecycle cursor assessed_at conflicts with positive checkpoint.';
    end if;
  end if;


  /*
   * The proposed cursor must also be one exact immutable Q14p
   * positive-checkpoint ordering identity.
   */
  select
    positive.assessed_at
  into
    v_proposed_assessed_at
  from
    public.hspp_assembly_positive_assessment_checkpoints
      as positive
  where
    positive.organization_id =
      p_organization_id
    and positive.id =
      p_proposed_cursor_positive_checkpoint_id;

  if not found then
    raise exception
      'Proposed post-positive lifecycle cursor checkpoint does not exist for organization.';
  end if;

  if
    v_proposed_assessed_at is distinct from
      p_proposed_cursor_positive_assessed_at
  then
    raise exception
      'Proposed post-positive lifecycle cursor assessed_at conflicts with positive checkpoint.';
  end if;


  select
    scan_state.*
  into
    v_state
  from
    public.hspp_post_positive_lifecycle_scan_states
      as scan_state
  where
    scan_state.organization_id =
      p_organization_id
  for update;


  /*
   * No durable cursor exists yet.
   *
   * Only a caller which observed the same null cursor may create the
   * first state. A caller expecting an older non-null state is stale.
   */
  if not found then
    if p_expected_cursor_positive_checkpoint_id is not null then
      return query
      select
        'STALE'::text,

        'hspp-post-positive-lifecycle-scan-state-v1'::text,

        p_organization_id,

        null::timestamptz,

        null::uuid,

        null::timestamptz,

        null::uuid,

        null::timestamptz,

        null::timestamptz;

      return;
    end if;


    insert into
      public.hspp_post_positive_lifecycle_scan_states (
        organization_id,

        state_version,

        cursor_positive_assessed_at,

        cursor_positive_checkpoint_id,

        previous_cursor_positive_assessed_at,

        previous_cursor_positive_checkpoint_id
      )
    values (
      p_organization_id,

      'hspp-post-positive-lifecycle-scan-state-v1',

      p_proposed_cursor_positive_assessed_at,

      p_proposed_cursor_positive_checkpoint_id,

      null,

      null
    )
    returning *
    into v_state;


    return query
    select
      'ADVANCED'::text,

      v_state.state_version,

      v_state.organization_id,

      v_state.cursor_positive_assessed_at,

      v_state.cursor_positive_checkpoint_id,

      v_state.previous_cursor_positive_assessed_at,

      v_state.previous_cursor_positive_checkpoint_id,

      v_state.created_at,

      v_state.updated_at;

    return;
  end if;


  if
    v_state.state_version <>
      'hspp-post-positive-lifecycle-scan-state-v1'
  then
    raise exception
      'Unsupported HSPP post-positive lifecycle scan-state version.';
  end if;


  /*
   * An explicit expected -> same proposed cursor is a no-op when the
   * persisted current cursor still equals that same cursor.
   */
  if (
    v_state.cursor_positive_assessed_at
      is not distinct from
        p_expected_cursor_positive_assessed_at

    and v_state.cursor_positive_checkpoint_id
      is not distinct from
        p_expected_cursor_positive_checkpoint_id

    and v_state.cursor_positive_assessed_at
      is not distinct from
        p_proposed_cursor_positive_assessed_at

    and v_state.cursor_positive_checkpoint_id
      is not distinct from
        p_proposed_cursor_positive_checkpoint_id
  ) then
    return query
    select
      'NO_CHANGE'::text,

      v_state.state_version,

      v_state.organization_id,

      v_state.cursor_positive_assessed_at,

      v_state.cursor_positive_checkpoint_id,

      v_state.previous_cursor_positive_assessed_at,

      v_state.previous_cursor_positive_checkpoint_id,

      v_state.created_at,

      v_state.updated_at;

    return;
  end if;


  /*
   * Exact retry:
   *
   *   previous == caller expected
   *   current  == caller proposed
   *
   * No mutation occurs.
   */
  if (
    v_state.cursor_positive_assessed_at
      is not distinct from
        p_proposed_cursor_positive_assessed_at

    and v_state.cursor_positive_checkpoint_id
      is not distinct from
        p_proposed_cursor_positive_checkpoint_id

    and v_state.previous_cursor_positive_assessed_at
      is not distinct from
        p_expected_cursor_positive_assessed_at

    and v_state.previous_cursor_positive_checkpoint_id
      is not distinct from
        p_expected_cursor_positive_checkpoint_id
  ) then
    return query
    select
      'EXACT_RETRY'::text,

      v_state.state_version,

      v_state.organization_id,

      v_state.cursor_positive_assessed_at,

      v_state.cursor_positive_checkpoint_id,

      v_state.previous_cursor_positive_assessed_at,

      v_state.previous_cursor_positive_checkpoint_id,

      v_state.created_at,

      v_state.updated_at;

    return;
  end if;


  /*
   * A caller which did not observe the currently persisted cursor is
   * stale.
   *
   * Critically, it is not permitted to replace that state.
   */
  if not (
    v_state.cursor_positive_assessed_at
      is not distinct from
        p_expected_cursor_positive_assessed_at

    and v_state.cursor_positive_checkpoint_id
      is not distinct from
        p_expected_cursor_positive_checkpoint_id
  ) then
    return query
    select
      'STALE'::text,

      v_state.state_version,

      v_state.organization_id,

      v_state.cursor_positive_assessed_at,

      v_state.cursor_positive_checkpoint_id,

      v_state.previous_cursor_positive_assessed_at,

      v_state.previous_cursor_positive_checkpoint_id,

      v_state.created_at,

      v_state.updated_at;

    return;
  end if;


  /*
   * The expected cursor still owns the CAS transition.
   *
   * Deliberately do NOT compare cursor key ordering here. Circular
   * fairness requires a valid wrap transition to be able to move from
   * a later key to an earlier key.
   */
  update
    public.hspp_post_positive_lifecycle_scan_states
  set
    previous_cursor_positive_assessed_at =
      v_state.cursor_positive_assessed_at,

    previous_cursor_positive_checkpoint_id =
      v_state.cursor_positive_checkpoint_id,

    cursor_positive_assessed_at =
      p_proposed_cursor_positive_assessed_at,

    cursor_positive_checkpoint_id =
      p_proposed_cursor_positive_checkpoint_id,

    updated_at =
      now()
  where
    organization_id =
      p_organization_id
  returning *
  into v_state;


  return query
  select
    'ADVANCED'::text,

    v_state.state_version,

    v_state.organization_id,

    v_state.cursor_positive_assessed_at,

    v_state.cursor_positive_checkpoint_id,

    v_state.previous_cursor_positive_assessed_at,

    v_state.previous_cursor_positive_checkpoint_id,

    v_state.created_at,

    v_state.updated_at;
end;
$$;


revoke all
on function
  public.compare_and_swap_hspp_post_positive_lifecycle_scan_state(
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


grant execute
on function
  public.compare_and_swap_hspp_post_positive_lifecycle_scan_state(
    uuid,
    timestamptz,
    uuid,
    timestamptz,
    uuid
  )
to service_role;


comment on table
  public.hspp_post_positive_lifecycle_scan_states
is
  'Organization-scoped non-authoritative processing cursor for bounded post-positive lifecycle reevaluation fairness. The cursor records scan progress only and does not establish evidence truth, trust, operational eligibility, member unsuitability, effective cessation, Reservoir eligibility, reconstruction provenance or downstream authority.';


comment on function
  public.compare_and_swap_hspp_post_positive_lifecycle_scan_state(
    uuid,
    timestamptz,
    uuid,
    timestamptz,
    uuid
  )
is
  'Service-role-only HSPP post-positive lifecycle scan-state CAS boundary. Serializes one organization, validates expected/proposed immutable positive-checkpoint cursor identities, accepts exact retry, returns stale state without mutation, and permits circular keyset wrap by deliberately imposing no monotonic cursor ordering. It mutates processing state only.';
