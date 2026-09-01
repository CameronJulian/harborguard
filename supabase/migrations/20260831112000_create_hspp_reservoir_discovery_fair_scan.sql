-- HSPP Reservoir discovery fairness scheduling.
--
-- This migration introduces scheduling metadata only.
--
-- It does NOT:
-- - change HSPP evidence identity;
-- - change HSPP event time;
-- - change Reservoir eligibility;
-- - change assembly-membership policy;
-- - create an assembly;
-- - establish physical-world truth;
-- - grant Route Safety authority;
-- - grant Crowd Intelligence eligibility;
-- - grant ML training or validation eligibility;
-- - change B07A pair ordering or the B07A comparison limit.
--
-- The durable cursor is scoped by organization and identifies the last raw
-- HSPP evidence row offered to B06B:
--
--   observed_at ASC, id ASC
--
-- The page reader is circular. The cursor CAS is deliberately separate from
-- the read so application orchestration can advance scheduling only after the
-- captured Reservoir work has been attempted.

create index if not exists
  hspp_evidence_reservoir_discovery_scan_idx
on public.hspp_evidence (
  organization_id,
  observed_at asc,
  id asc
);


create table if not exists
  public.hspp_reservoir_discovery_scan_states (
    organization_id uuid primary key
      references public.organizations(id)
      on delete restrict,

    state_version text not null
      default 'hspp-reservoir-discovery-scheduling-v1',

    cursor_observed_at timestamp with time zone null,
    cursor_evidence_id uuid null,

    previous_cursor_observed_at timestamp with time zone null,
    previous_cursor_evidence_id uuid null,

    created_at timestamp with time zone not null
      default now(),

    updated_at timestamp with time zone not null
      default now(),

    constraint
      hspp_reservoir_discovery_scan_state_version_check
      check (
        state_version =
          'hspp-reservoir-discovery-scheduling-v1'
      ),

    constraint
      hspp_reservoir_discovery_scan_cursor_pair_check
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
      hspp_reservoir_discovery_scan_previous_cursor_pair_check
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
      )
  );


alter table
  public.hspp_reservoir_discovery_scan_states
enable row level security;


revoke all on table
  public.hspp_reservoir_discovery_scan_states
from public;

revoke all on table
  public.hspp_reservoir_discovery_scan_states
from anon;

revoke all on table
  public.hspp_reservoir_discovery_scan_states
from authenticated;

revoke all on table
  public.hspp_reservoir_discovery_scan_states
from service_role;


comment on table
  public.hspp_reservoir_discovery_scan_states
is
  'Non-authoritative HSPP Reservoir discovery scheduling state. The organization-scoped observed_at + evidence id cursor exists only to prevent bounded discovery starvation. It grants no evidence validity, trust, assembly membership, reconstruction, validation, Route Safety, Crowd Intelligence or ML authority.';


create or replace function
  public.read_hspp_reservoir_discovery_page(
    p_organization_id uuid,
    p_limit integer
  )
returns table (
  scheduling_version text,

  cursor_expected_observed_at timestamp with time zone,
  cursor_expected_evidence_id uuid,

  cursor_proposed_observed_at timestamp with time zone,
  cursor_proposed_evidence_id uuid,

  candidate_evidence_id uuid,
  candidate_observed_at timestamp with time zone,
  candidate_position integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cursor_observed_at timestamp with time zone;
  v_cursor_evidence_id uuid;
begin
  if p_organization_id is null then
    raise exception
      'Reservoir discovery organization identity is required.'
      using errcode = '22023';
  end if;

  if
    p_limit is null
    or p_limit < 1
    or p_limit > 100
  then
    raise exception
      'Reservoir discovery limit must be between 1 and 100.'
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

  select
    scan_state.cursor_observed_at,
    scan_state.cursor_evidence_id
  into
    v_cursor_observed_at,
    v_cursor_evidence_id
  from
    public.hspp_reservoir_discovery_scan_states
      as scan_state
  where
    scan_state.organization_id =
      p_organization_id;

  if (
    v_cursor_observed_at is null
  ) <> (
    v_cursor_evidence_id is null
  ) then
    raise exception
      'Reservoir discovery scan state contains an incomplete cursor.'
      using errcode = '55000';
  end if;

  if
    v_cursor_evidence_id is not null
    and not exists (
      select 1
      from public.hspp_evidence as cursor_evidence
      where
        cursor_evidence.organization_id =
          p_organization_id
        and cursor_evidence.id =
          v_cursor_evidence_id
        and cursor_evidence.observed_at
          is not distinct from
            v_cursor_observed_at
    )
  then
    raise exception
      'Reservoir discovery scan cursor no longer identifies the exact HSPP evidence row.'
      using errcode = '55000';
  end if;

  return query
  with after_cursor as (
    select
      evidence.id as evidence_id,
      evidence.observed_at
    from
      public.hspp_evidence as evidence
    where
      evidence.organization_id =
        p_organization_id
      and (
        v_cursor_observed_at is null
        or (
          evidence.observed_at,
          evidence.id
        ) > (
          v_cursor_observed_at,
          v_cursor_evidence_id
        )
      )
    order by
      evidence.observed_at asc,
      evidence.id asc
    limit p_limit
  ),

  after_count as (
    select
      count(*)::integer as row_count
    from
      after_cursor
  ),

  wrapped as (
    select
      evidence.id as evidence_id,
      evidence.observed_at
    from
      public.hspp_evidence as evidence
    where
      evidence.organization_id =
        p_organization_id
      and v_cursor_observed_at is not null
      and (
        evidence.observed_at,
        evidence.id
      ) <= (
        v_cursor_observed_at,
        v_cursor_evidence_id
      )
    order by
      evidence.observed_at asc,
      evidence.id asc
    limit greatest(
      p_limit -
        (
          select
            after_count.row_count
          from
            after_count
        ),
      0
    )
  ),

  page_rows as (
    select
      0::integer as page_phase,
      after_cursor.evidence_id,
      after_cursor.observed_at
    from
      after_cursor

    union all

    select
      1::integer as page_phase,
      wrapped.evidence_id,
      wrapped.observed_at
    from
      wrapped
  ),

  numbered as (
    select
      page_rows.evidence_id,
      page_rows.observed_at,

      row_number() over (
        order by
          page_rows.page_phase asc,
          page_rows.observed_at asc,
          page_rows.evidence_id asc
      )::integer as candidate_position
    from
      page_rows
  ),

  proposed_cursor as (
    select
      numbered.evidence_id,
      numbered.observed_at
    from
      numbered
    order by
      numbered.candidate_position desc
    limit 1
  )

  select
    'hspp-reservoir-discovery-scheduling-v1'::text
      as scheduling_version,

    v_cursor_observed_at
      as cursor_expected_observed_at,

    v_cursor_evidence_id
      as cursor_expected_evidence_id,

    proposed_cursor.observed_at
      as cursor_proposed_observed_at,

    proposed_cursor.evidence_id
      as cursor_proposed_evidence_id,

    numbered.evidence_id
      as candidate_evidence_id,

    numbered.observed_at
      as candidate_observed_at,

    numbered.candidate_position
  from
    numbered
  cross join
    proposed_cursor
  order by
    numbered.candidate_position asc;
end;
$$;


comment on function
  public.read_hspp_reservoir_discovery_page(
    uuid,
    integer
  )
is
  'Service-role-only circular raw HSPP evidence scheduling page for Reservoir discovery. Ordering is organization_id + observed_at ASC + evidence id ASC. The function performs no cursor mutation and grants no semantic HSPP authority.';


revoke all on function
  public.read_hspp_reservoir_discovery_page(
    uuid,
    integer
  )
from public;

revoke all on function
  public.read_hspp_reservoir_discovery_page(
    uuid,
    integer
  )
from anon;

revoke all on function
  public.read_hspp_reservoir_discovery_page(
    uuid,
    integer
  )
from authenticated;

revoke all on function
  public.read_hspp_reservoir_discovery_page(
    uuid,
    integer
  )
from service_role;

grant execute on function
  public.read_hspp_reservoir_discovery_page(
    uuid,
    integer
  )
to service_role;


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
    on conflict (
      organization_id
    )
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


comment on function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
is
  'Service-role-only optimistic CAS for the non-authoritative Reservoir discovery scheduling cursor. The proposed cursor must identify the exact organization-scoped immutable HSPP evidence row. Circular wrap is valid; no monotonic timestamp requirement is imposed.';


revoke all on function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
from public;

revoke all on function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
from anon;

revoke all on function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
from authenticated;

revoke all on function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
from service_role;

grant execute on function
  public.compare_and_swap_hspp_reservoir_discovery_scan_state(
    uuid,
    timestamp with time zone,
    uuid,
    timestamp with time zone,
    uuid
  )
to service_role;