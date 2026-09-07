-- HarborGuard: bound route-risk shadow provider-capacity lock contention.
--
-- The global advisory-lock identity is deliberately preserved because
-- reservation decisions enforce global call and concurrency limits atomically.
--
-- Hardening:
--   * replace unbounded blocking acquisition with bounded try-lock retries;
--   * reserve contention fails closed as DENIED / capacity_contention;
--   * release contention fails closed as UNAVAILABLE;
--   * existing reservation, capacity, lease and service-role semantics remain.

create or replace function public.reserve_route_risk_shadow_provider_capacity(
  p_reservation_key text,
  p_organization_id uuid,
  p_window_seconds integer,
  p_lease_seconds integer,
  p_global_call_limit integer,
  p_organization_call_limit integer,
  p_global_concurrency_limit integer,
  p_organization_concurrency_limit integer
)
returns table (
  reservation_state text,
  reason text,
  returned_reservation_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_global_calls integer;
  v_organization_calls integer;
  v_global_active integer;
  v_organization_active integer;

  v_lock_acquired boolean := false;
  v_lock_deadline timestamptz :=
    clock_timestamp() + interval '250 milliseconds';
begin
  if (
    p_reservation_key is null
    or btrim(p_reservation_key) = ''
    or p_organization_id is null
    or p_window_seconds is null
    or p_window_seconds <= 0
    or p_lease_seconds is null
    or p_lease_seconds <= 0
    or p_global_call_limit is null
    or p_global_call_limit <= 0
    or p_organization_call_limit is null
    or p_organization_call_limit <= 0
    or p_global_concurrency_limit is null
    or p_global_concurrency_limit <= 0
    or p_organization_concurrency_limit is null
    or p_organization_concurrency_limit <= 0
  ) then
    return query
    select 'DENIED'::text, 'invalid_configuration'::text, null::text;

    return;
  end if;

  loop
    if pg_try_advisory_xact_lock(
      hashtextextended(
        'harborguard:route-risk-shadow-provider-capacity',
        0
      )
    ) then
      v_lock_acquired := true;
      exit;
    end if;

    exit when clock_timestamp() >= v_lock_deadline;

    perform pg_sleep(0.025);
  end loop;

  if not v_lock_acquired then
    return query
    select
      'DENIED'::text,
      'capacity_contention'::text,
      null::text;

    return;
  end if;

  update public.route_risk_shadow_provider_capacity_reservations
  set
    status = 'expired',
    released_at = v_now
  where
    status = 'reserved'
    and expires_at <= v_now;

  if exists (
    select 1
    from public.route_risk_shadow_provider_capacity_reservations
    where reservation_key = p_reservation_key
  ) then
    return query
    select
      'DENIED'::text,
      'duplicate_reservation'::text,
      null::text;

    return;
  end if;

  select count(*)::integer
  into v_global_calls
  from public.route_risk_shadow_provider_capacity_reservations
  where
    reserved_at >=
      v_now - make_interval(secs => p_window_seconds);

  if v_global_calls >= p_global_call_limit then
    return query
    select
      'DENIED'::text,
      'global_capacity_exhausted'::text,
      null::text;

    return;
  end if;

  select count(*)::integer
  into v_organization_calls
  from public.route_risk_shadow_provider_capacity_reservations
  where
    organization_id = p_organization_id
    and reserved_at >=
      v_now - make_interval(secs => p_window_seconds);

  if v_organization_calls >= p_organization_call_limit then
    return query
    select
      'DENIED'::text,
      'organization_capacity_exhausted'::text,
      null::text;

    return;
  end if;

  select count(*)::integer
  into v_global_active
  from public.route_risk_shadow_provider_capacity_reservations
  where
    status = 'reserved'
    and expires_at > v_now;

  if v_global_active >= p_global_concurrency_limit then
    return query
    select
      'DENIED'::text,
      'global_concurrency_exhausted'::text,
      null::text;

    return;
  end if;

  select count(*)::integer
  into v_organization_active
  from public.route_risk_shadow_provider_capacity_reservations
  where
    organization_id = p_organization_id
    and status = 'reserved'
    and expires_at > v_now;

  if v_organization_active >= p_organization_concurrency_limit then
    return query
    select
      'DENIED'::text,
      'organization_concurrency_exhausted'::text,
      null::text;

    return;
  end if;

  insert into public.route_risk_shadow_provider_capacity_reservations (
    reservation_key,
    organization_id,
    reserved_at,
    expires_at,
    status
  ) values (
    p_reservation_key,
    p_organization_id,
    v_now,
    v_now + make_interval(secs => p_lease_seconds),
    'reserved'
  );

  return query
  select
    'RESERVED'::text,
    null::text,
    p_reservation_key;
end;
$$;


create or replace function public.release_route_risk_shadow_provider_capacity(
  p_reservation_key text
)
returns table (
  release_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_acquired boolean := false;
  v_lock_deadline timestamptz :=
    clock_timestamp() + interval '250 milliseconds';
begin
  if p_reservation_key is null
     or btrim(p_reservation_key) = ''
  then
    return query
    select 'UNAVAILABLE'::text;

    return;
  end if;

  loop
    if pg_try_advisory_xact_lock(
      hashtextextended(
        'harborguard:route-risk-shadow-provider-capacity',
        0
      )
    ) then
      v_lock_acquired := true;
      exit;
    end if;

    exit when clock_timestamp() >= v_lock_deadline;

    perform pg_sleep(0.025);
  end loop;

  if not v_lock_acquired then
    return query
    select 'UNAVAILABLE'::text;

    return;
  end if;

  update public.route_risk_shadow_provider_capacity_reservations
  set
    status = 'released',
    released_at = now()
  where
    reservation_key = p_reservation_key
    and status = 'reserved';

  if found then
    return query
    select 'RELEASED'::text;

    return;
  end if;

  return query
  select 'NOT_FOUND'::text;
end;
$$;


revoke all on function public.reserve_route_risk_shadow_provider_capacity(
  text,
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
)
from public, anon, authenticated;

revoke all on function public.release_route_risk_shadow_provider_capacity(text)
from public, anon, authenticated;


grant execute on function public.reserve_route_risk_shadow_provider_capacity(
  text,
  uuid,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer
)
to service_role;

grant execute on function public.release_route_risk_shadow_provider_capacity(text)
to service_role;
