-- HarborGuard HSPP
-- Harden post-positive lifecycle fair-scan CAS contention.
--
-- Forward-only replacement of the existing RPC.
--
-- The organization-scoped transaction advisory lock remains the
-- serialization authority, but acquisition is now non-blocking.
-- Failure to acquire it returns CONTENDED without claiming any
-- durable cursor observation.

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
  /*
   * Do not wait behind another transaction already deciding this
   * organization's fair-scan cursor.
   *
   * CONTENDED is deliberately not a persisted-state observation.
   * In particular, the null cursor fields below do not prove that
   * durable cursor state is absent. The caller may retry in a later
   * lifecycle cycle.
   */
  if not pg_try_advisory_xact_lock(
    hashtextextended(
      'harborguard:hspp-post-positive-lifecycle-scan-state:' ||
      p_organization_id::text,
      0
    )
  ) then
    return query
    select
      'CONTENDED'::text,

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
