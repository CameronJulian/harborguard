-- HSPP Reservoir global pair scheduling.
--
-- Scheduling only.
--
-- This migration does NOT:
-- - make evidence Reservoir eligible;
-- - decide operational use;
-- - decide assembly membership;
-- - create or modify an evidence assembly;
-- - create ORIGINAL or RETAINED membership;
-- - choose replacement evidence;
-- - perform reconstruction;
-- - seal or validate an assembly;
-- - alter evidence trust;
-- - grant Route Safety, Crowd Intelligence or ML authority.
--
-- The pair cursor only determines which immutable organization-scoped
-- evidence identities receive a bounded opportunity for later
-- revalidation and B07A membership evaluation.

create index if not exists
  hspp_evidence_organization_id_id_idx
on
  public.hspp_evidence (
    organization_id,
    id
  );


create table
  public.hspp_reservoir_pair_scan_states (
    organization_id uuid primary key,

    state_version text not null
      default 'hspp-reservoir-pair-scheduling-v1',

    cursor_first_evidence_id uuid null,
    cursor_second_evidence_id uuid null,

    previous_cursor_first_evidence_id uuid null,
    previous_cursor_second_evidence_id uuid null,

    created_at timestamp with time zone not null
      default now(),

    updated_at timestamp with time zone not null
      default now(),

    constraint
      hspp_reservoir_pair_scan_states_version_check
    check (
      state_version =
        'hspp-reservoir-pair-scheduling-v1'
    ),

    constraint
      hspp_reservoir_pair_scan_states_cursor_nullity_check
    check (
      (
        cursor_first_evidence_id is null
        and
        cursor_second_evidence_id is null
      )
      or
      (
        cursor_first_evidence_id is not null
        and
        cursor_second_evidence_id is not null
      )
    ),

    constraint
      hspp_reservoir_pair_scan_states_cursor_order_check
    check (
      cursor_first_evidence_id is null
      or
      cursor_first_evidence_id <
        cursor_second_evidence_id
    ),

    constraint
      hspp_reservoir_pair_scan_states_previous_cursor_nullity_check
    check (
      (
        previous_cursor_first_evidence_id is null
        and
        previous_cursor_second_evidence_id is null
      )
      or
      (
        previous_cursor_first_evidence_id is not null
        and
        previous_cursor_second_evidence_id is not null
      )
    ),

    constraint
      hspp_reservoir_pair_scan_states_previous_cursor_order_check
    check (
      previous_cursor_first_evidence_id is null
      or
      previous_cursor_first_evidence_id <
        previous_cursor_second_evidence_id
    )
  );


comment on table
  public.hspp_reservoir_pair_scan_states
is
  'Non-authoritative per-organization scheduling state for bounded circular traversal of canonical raw HSPP evidence-pair identities. Cursor state grants no Reservoir, assembly, reconstruction, trust or downstream authority.';


alter table
  public.hspp_reservoir_pair_scan_states
enable row level security;


revoke all on table
  public.hspp_reservoir_pair_scan_states
from public;

revoke all on table
  public.hspp_reservoir_pair_scan_states
from anon;

revoke all on table
  public.hspp_reservoir_pair_scan_states
from authenticated;

revoke all on table
  public.hspp_reservoir_pair_scan_states
from service_role;


create or replace function
  public.read_hspp_reservoir_pair_page(
    p_organization_id uuid,
    p_limit integer
  )
returns table (
  scheduling_version text,
  organization_id uuid,
  pair_ordinal integer,
  first_evidence_id uuid,
  second_evidence_id uuid,
  cursor_expected_first_evidence_id uuid,
  cursor_expected_second_evidence_id uuid,
  cursor_proposed_first_evidence_id uuid,
  cursor_proposed_second_evidence_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_expected_first_evidence_id uuid;
  v_expected_second_evidence_id uuid;
begin

  if p_organization_id is null then
    raise exception
      'Reservoir pair scheduling organization id is required.';
  end if;


  if
    p_limit is null
    or p_limit < 1
    or p_limit > 100
  then
    raise exception
      'Reservoir pair scheduling limit must be between 1 and 100.';
  end if;


  select
    scan_state.cursor_first_evidence_id,
    scan_state.cursor_second_evidence_id
  into
    v_expected_first_evidence_id,
    v_expected_second_evidence_id
  from
    public.hspp_reservoir_pair_scan_states
      as scan_state
  where
    scan_state.organization_id =
      p_organization_id;


  if
    (
      v_expected_first_evidence_id is null
    )
    <>
    (
      v_expected_second_evidence_id is null
    )
  then
    raise exception
      'Reservoir pair scheduling state contains an incomplete cursor.';
  end if;


  if
    v_expected_first_evidence_id is not null
  then

    if not (
      v_expected_first_evidence_id <
      v_expected_second_evidence_id
    ) then
      raise exception
        'Reservoir pair scheduling cursor is not canonical.';
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
          v_expected_first_evidence_id
        and
        second_evidence.id =
          v_expected_second_evidence_id
    ) then
      raise exception
        'Reservoir pair scheduling cursor does not identify an exact organization-scoped raw HSPP evidence pair.';
    end if;

  end if;


  return query

  with after_cursor as (
    select
      0::integer as scan_phase,

      first_evidence.id
        as first_evidence_id,

      second_evidence.id
        as second_evidence_id

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

      and (
        v_expected_first_evidence_id is null

        or (
          first_evidence.id,
          second_evidence.id
        ) > (
          v_expected_first_evidence_id,
          v_expected_second_evidence_id
        )
      )

    order by
      first_evidence.id asc,
      second_evidence.id asc

    limit
      p_limit
  ),

  wrapped as (
    select
      1::integer as scan_phase,

      first_evidence.id
        as first_evidence_id,

      second_evidence.id
        as second_evidence_id

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
      v_expected_first_evidence_id
        is not null

      and (
        first_evidence.id,
        second_evidence.id
      ) <= (
        v_expected_first_evidence_id,
        v_expected_second_evidence_id
      )

    order by
      first_evidence.id asc,
      second_evidence.id asc

    limit (
      select
        greatest(
          p_limit -
            count(*)::integer,
          0
        )
      from
        after_cursor
    )
  ),

  selected_pairs as (
    select
      after_cursor.scan_phase,
      after_cursor.first_evidence_id,
      after_cursor.second_evidence_id
    from
      after_cursor

    union all

    select
      wrapped.scan_phase,
      wrapped.first_evidence_id,
      wrapped.second_evidence_id
    from
      wrapped
  ),

  numbered_pairs as (
    select
      row_number() over (
        order by
          selected_pairs.scan_phase asc,
          selected_pairs.first_evidence_id asc,
          selected_pairs.second_evidence_id asc
      )::integer
        as pair_ordinal,

      selected_pairs.first_evidence_id,
      selected_pairs.second_evidence_id

    from
      selected_pairs
  ),

  proposed_cursor as (
    select
      numbered_pairs.first_evidence_id,
      numbered_pairs.second_evidence_id

    from
      numbered_pairs

    order by
      numbered_pairs.pair_ordinal desc

    limit 1
  )

  select
    'hspp-reservoir-pair-scheduling-v1'::text
      as scheduling_version,

    p_organization_id
      as organization_id,

    numbered_pairs.pair_ordinal,

    numbered_pairs.first_evidence_id,

    numbered_pairs.second_evidence_id,

    v_expected_first_evidence_id
      as cursor_expected_first_evidence_id,

    v_expected_second_evidence_id
      as cursor_expected_second_evidence_id,

    proposed_cursor.first_evidence_id
      as cursor_proposed_first_evidence_id,

    proposed_cursor.second_evidence_id
      as cursor_proposed_second_evidence_id

  from
    numbered_pairs

  cross join
    proposed_cursor

  order by
    numbered_pairs.pair_ordinal asc;

end;
$$;


comment on function
  public.read_hspp_reservoir_pair_page(
    uuid,
    integer
  )
is
  'Service-role-only bounded circular reader over canonical raw organization-scoped HSPP evidence-pair identities. Pair ordering and cursor metadata are scheduling only. The function performs no Reservoir eligibility, operational-use, membership-policy, assembly or authority decision.';


revoke all on function
  public.read_hspp_reservoir_pair_page(
    uuid,
    integer
  )
from public;

revoke all on function
  public.read_hspp_reservoir_pair_page(
    uuid,
    integer
  )
from anon;

revoke all on function
  public.read_hspp_reservoir_pair_page(
    uuid,
    integer
  )
from authenticated;

grant execute on function
  public.read_hspp_reservoir_pair_page(
    uuid,
    integer
  )
to service_role;


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
    on conflict (
      organization_id
    )
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


comment on function
  public.compare_and_swap_hspp_reservoir_pair_scan_state(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
is
  'Service-role-only optimistic CAS for the non-authoritative Reservoir global pair scheduling cursor. Expected and proposed cursors must identify exact canonical organization-scoped raw HSPP evidence pairs. Circular wrap is valid; cursor movement grants no Reservoir, assembly, reconstruction, trust or downstream authority.';


revoke all on function
  public.compare_and_swap_hspp_reservoir_pair_scan_state(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from public;

revoke all on function
  public.compare_and_swap_hspp_reservoir_pair_scan_state(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from anon;

revoke all on function
  public.compare_and_swap_hspp_reservoir_pair_scan_state(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from authenticated;

grant execute on function
  public.compare_and_swap_hspp_reservoir_pair_scan_state(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
to service_role;