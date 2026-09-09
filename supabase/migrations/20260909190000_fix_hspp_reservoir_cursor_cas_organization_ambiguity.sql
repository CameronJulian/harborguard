-- Fix PostgreSQL 42702 ambiguity in the HSPP Reservoir cursor CAS functions.
--
-- Both functions return an output column named organization_id.
-- Their INSERT branches previously used:
--
--   ON CONFLICT (organization_id)
--
-- Inside PL/pgSQL that identifier can resolve either to the RETURNS TABLE
-- output variable or to the target-table column. PostgreSQL therefore raises
-- 42702 before the conflict branch can complete.
--
-- Target the existing organization_id primary-key constraints explicitly.
-- No scheduling, cursor, authority, trust, evidence, membership or recovery
-- semantics are changed.

create or replace function
  public.compare_and_swap_hspp_reservoir_pair_scan_state(
    p_organization_id uuid,

    p_expected_first_evidence_id uuid,
    p_expected_second_evidence_id uuid,

    p_proposed_first_evidence_id uuid,
    p_proposed_second_evidence_id uuid
  )
returns table (
  status text,
  state_version text,
  organization_id uuid,

  cursor_first_evidence_id uuid,
  cursor_second_evidence_id uuid,

  previous_cursor_first_evidence_id uuid,
  previous_cursor_second_evidence_id uuid,

  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_state
    public.hspp_reservoir_pair_scan_states%rowtype;
begin

  if p_organization_id is null then
    raise exception
      'Reservoir pair scheduling organization id is required.';
  end if;


  if
    (
      p_expected_first_evidence_id is null
    )
    <>
    (
      p_expected_second_evidence_id is null
    )
  then
    raise exception
      'Reservoir pair scheduling expected cursor must be fully null or fully populated.';
  end if;


  if
    p_expected_first_evidence_id is not null
  then

    if not (
      p_expected_first_evidence_id <
      p_expected_second_evidence_id
    ) then
      raise exception
        'Reservoir pair scheduling expected cursor is not canonical.';
    end if;


    if not exists (
      select
        1
      from
        public.hspp_evidence
          as first_evidence
      inner join
        public.hspp_evidence
          as second_evidence
        on
          second_evidence.organization_id =
            first_evidence.organization_id
          and
          second_evidence.id >
            first_evidence.id
      where
        first_evidence.organization_id =
          p_organization_id
        and
        first_evidence.id =
          p_expected_first_evidence_id
        and
        second_evidence.id =
          p_expected_second_evidence_id
    ) then
      raise exception
        'Reservoir pair scheduling expected cursor does not identify an exact organization-scoped raw HSPP evidence pair.';
    end if;

  end if;


  if
    p_proposed_first_evidence_id is null
    or
    p_proposed_second_evidence_id is null
  then
    raise exception
      'Reservoir pair scheduling proposed cursor is required.';
  end if;


  if not (
    p_proposed_first_evidence_id <
    p_proposed_second_evidence_id
  ) then
    raise exception
      'Reservoir pair scheduling proposed cursor is not canonical.';
  end if;


  if not exists (
    select
      1
    from
      public.hspp_evidence
        as first_evidence
    inner join
      public.hspp_evidence
        as second_evidence
      on
        second_evidence.organization_id =
          first_evidence.organization_id
        and
        second_evidence.id >
          first_evidence.id
    where
      first_evidence.organization_id =
        p_organization_id
      and
      first_evidence.id =
        p_proposed_first_evidence_id
      and
      second_evidence.id =
        p_proposed_second_evidence_id
  ) then
    raise exception
      'Reservoir pair scheduling proposed cursor does not identify an exact organization-scoped raw HSPP evidence pair.';
  end if;


  select
    scan_state.*
  into
    v_state
  from
    public.hspp_reservoir_pair_scan_states
      as scan_state
  where
    scan_state.organization_id =
      p_organization_id
  for update;


  if not found then

    if
      p_expected_first_evidence_id
        is not null
    then
      return query
      select
        'STALE'::text,
        'hspp-reservoir-pair-scheduling-v1'::text,
        p_organization_id,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::timestamp with time zone,
        null::timestamp with time zone;

      return;
    end if;


    insert into
      public.hspp_reservoir_pair_scan_states (
        organization_id,
        state_version,

        cursor_first_evidence_id,
        cursor_second_evidence_id,

        previous_cursor_first_evidence_id,
        previous_cursor_second_evidence_id
      )
    values (
      p_organization_id,
      'hspp-reservoir-pair-scheduling-v1',

      p_proposed_first_evidence_id,
      p_proposed_second_evidence_id,

      null,
      null
    )
    on conflict on constraint
      hspp_reservoir_pair_scan_states_pkey
    do nothing
    returning
      *
    into
      v_state;


    if found then
      return query
      select
        'CREATED'::text,

        v_state.state_version,
        v_state.organization_id,

        v_state.cursor_first_evidence_id,
        v_state.cursor_second_evidence_id,

        v_state.previous_cursor_first_evidence_id,
        v_state.previous_cursor_second_evidence_id,

        v_state.created_at,
        v_state.updated_at;

      return;
    end if;


    select
      scan_state.*
    into
      v_state
    from
      public.hspp_reservoir_pair_scan_states
        as scan_state
    where
      scan_state.organization_id =
        p_organization_id
    for update;

  end if;


  if
    v_state.cursor_first_evidence_id
      is distinct from
      p_expected_first_evidence_id

    or

    v_state.cursor_second_evidence_id
      is distinct from
      p_expected_second_evidence_id
  then
    return query
    select
      'STALE'::text,

      v_state.state_version,
      v_state.organization_id,

      v_state.cursor_first_evidence_id,
      v_state.cursor_second_evidence_id,

      v_state.previous_cursor_first_evidence_id,
      v_state.previous_cursor_second_evidence_id,

      v_state.created_at,
      v_state.updated_at;

    return;
  end if;


  if
    v_state.cursor_first_evidence_id =
      p_proposed_first_evidence_id

    and

    v_state.cursor_second_evidence_id =
      p_proposed_second_evidence_id
  then
    return query
    select
      'NO_CHANGE'::text,

      v_state.state_version,
      v_state.organization_id,

      v_state.cursor_first_evidence_id,
      v_state.cursor_second_evidence_id,

      v_state.previous_cursor_first_evidence_id,
      v_state.previous_cursor_second_evidence_id,

      v_state.created_at,
      v_state.updated_at;

    return;
  end if;


  update
    public.hspp_reservoir_pair_scan_states
  set
    previous_cursor_first_evidence_id =
      v_state.cursor_first_evidence_id,

    previous_cursor_second_evidence_id =
      v_state.cursor_second_evidence_id,

    cursor_first_evidence_id =
      p_proposed_first_evidence_id,

    cursor_second_evidence_id =
      p_proposed_second_evidence_id,

    updated_at =
      now()

  where
    hspp_reservoir_pair_scan_states.organization_id =
      p_organization_id

  returning
    hspp_reservoir_pair_scan_states.*
  into
    v_state;


  return query
  select
    'ADVANCED'::text,

    v_state.state_version,
    v_state.organization_id,

    v_state.cursor_first_evidence_id,
    v_state.cursor_second_evidence_id,

    v_state.previous_cursor_first_evidence_id,
    v_state.previous_cursor_second_evidence_id,

    v_state.created_at,
    v_state.updated_at;

end;
$$;


create or replace function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    p_organization_id uuid,

    p_expected_cursor_observed_at timestamp with time zone,
    p_expected_cursor_evidence_id uuid,

    p_proposed_cursor_observed_at timestamp with time zone,
    p_proposed_cursor_evidence_id uuid
  )
returns table (
  cas_state text,
  state_version text,
  organization_id uuid,

  cursor_observed_at timestamp with time zone,
  cursor_evidence_id uuid,

  previous_cursor_observed_at timestamp with time zone,
  previous_cursor_evidence_id uuid,

  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state
    public.hspp_reservoir_discovery_scan_states%rowtype;

  v_inserted integer := 0;
begin
  if p_organization_id is null then
    raise exception
      'Reservoir discovery organization identity is required.'
      using errcode = '22023';
  end if;

  if (
    p_expected_cursor_observed_at is null
  ) <> (
    p_expected_cursor_evidence_id is null
  ) then
    raise exception
      'Reservoir discovery expected cursor must be supplied as a complete pair.'
      using errcode = '22023';
  end if;

  if (
    p_proposed_cursor_observed_at is null
  ) <> (
    p_proposed_cursor_evidence_id is null
  ) then
    raise exception
      'Reservoir discovery proposed cursor must be supplied as a complete pair.'
      using errcode = '22023';
  end if;

  if
    p_proposed_cursor_observed_at is null
    or p_proposed_cursor_evidence_id is null
  then
    raise exception
      'Reservoir discovery proposed cursor is required.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.organizations as organization_row
    where
      organization_row.id =
        p_organization_id
  ) then
    raise exception
      'Reservoir discovery organization does not exist.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.hspp_evidence as proposed_evidence
    where
      proposed_evidence.organization_id =
        p_organization_id
      and proposed_evidence.id =
        p_proposed_cursor_evidence_id
      and proposed_evidence.observed_at
        is not distinct from
          p_proposed_cursor_observed_at
  ) then
    raise exception
      'Reservoir discovery proposed cursor does not identify the exact organization-scoped HSPP evidence row.'
      using errcode = '22023';
  end if;

  select
    scan_state.*
  into
    v_state
  from
    public.hspp_reservoir_discovery_scan_states
      as scan_state
  where
    scan_state.organization_id =
      p_organization_id
  for update;

  if not found then
    if
      p_expected_cursor_observed_at is not null
      or p_expected_cursor_evidence_id is not null
    then
      return query
      select
        'STALE'::text,
        'hspp-reservoir-discovery-scheduling-v1'::text,
        p_organization_id,
        null::timestamp with time zone,
        null::uuid,
        null::timestamp with time zone,
        null::uuid,
        null::timestamp with time zone,
        null::timestamp with time zone;

      return;
    end if;

    insert into
      public.hspp_reservoir_discovery_scan_states (
        organization_id,
        cursor_observed_at,
        cursor_evidence_id
      )
    values (
      p_organization_id,
      p_proposed_cursor_observed_at,
      p_proposed_cursor_evidence_id
    )
    on conflict on constraint
      hspp_reservoir_discovery_scan_states_pkey
    do nothing;

    get diagnostics
      v_inserted = row_count;

    if v_inserted = 1 then
      select
        scan_state.*
      into
        v_state
      from
        public.hspp_reservoir_discovery_scan_states
          as scan_state
      where
        scan_state.organization_id =
          p_organization_id;

      return query
      select
        'CREATED'::text,
        v_state.state_version,
        v_state.organization_id,
        v_state.cursor_observed_at,
        v_state.cursor_evidence_id,
        v_state.previous_cursor_observed_at,
        v_state.previous_cursor_evidence_id,
        v_state.created_at,
        v_state.updated_at;

      return;
    end if;

    select
      scan_state.*
    into
      v_state
    from
      public.hspp_reservoir_discovery_scan_states
        as scan_state
    where
      scan_state.organization_id =
        p_organization_id
    for update;
  end if;

  if not (
    v_state.cursor_observed_at
      is not distinct from
        p_expected_cursor_observed_at
    and
    v_state.cursor_evidence_id
      is not distinct from
        p_expected_cursor_evidence_id
  ) then
    return query
    select
      'STALE'::text,
      v_state.state_version,
      v_state.organization_id,
      v_state.cursor_observed_at,
      v_state.cursor_evidence_id,
      v_state.previous_cursor_observed_at,
      v_state.previous_cursor_evidence_id,
      v_state.created_at,
      v_state.updated_at;

    return;
  end if;

  if
    v_state.cursor_observed_at
      is not distinct from
        p_proposed_cursor_observed_at
    and
    v_state.cursor_evidence_id
      is not distinct from
        p_proposed_cursor_evidence_id
  then
    return query
    select
      'NO_CHANGE'::text,
      v_state.state_version,
      v_state.organization_id,
      v_state.cursor_observed_at,
      v_state.cursor_evidence_id,
      v_state.previous_cursor_observed_at,
      v_state.previous_cursor_evidence_id,
      v_state.created_at,
      v_state.updated_at;

    return;
  end if;

  update
    public.hspp_reservoir_discovery_scan_states
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
    hspp_reservoir_discovery_scan_states.organization_id =
      p_organization_id
  returning
    hspp_reservoir_discovery_scan_states.*
  into
    v_state;

  return query
  select
    'ADVANCED'::text,
    v_state.state_version,
    v_state.organization_id,
    v_state.cursor_observed_at,
    v_state.cursor_evidence_id,
    v_state.previous_cursor_observed_at,
    v_state.previous_cursor_evidence_id,
    v_state.created_at,
    v_state.updated_at;
end;
$$;