create table if not exists public.route_risk_shadow_provider_capacity_reservations (
  reservation_key text primary key,
  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'released', 'expired')),
  released_at timestamptz null
);

create index if not exists route_risk_shadow_capacity_reserved_at_idx
  on public.route_risk_shadow_provider_capacity_reservations (reserved_at);

create index if not exists route_risk_shadow_capacity_org_active_idx
  on public.route_risk_shadow_provider_capacity_reservations (
    organization_id,
    status,
    expires_at
  );

alter table public.route_risk_shadow_provider_capacity_reservations
  enable row level security;

revoke all on table public.route_risk_shadow_provider_capacity_reservations
from public, anon, authenticated;

grant all on table public.route_risk_shadow_provider_capacity_reservations
to service_role;

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

  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:route-risk-shadow-provider-capacity',
      0
    )
  );

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
    select 'DENIED'::text, 'duplicate_reservation'::text, null::text;
    return;
  end if;

  select count(*)::integer
  into v_global_calls
  from public.route_risk_shadow_provider_capacity_reservations
  where reserved_at >= v_now - make_interval(secs => p_window_seconds);

  if v_global_calls >= p_global_call_limit then
    return query
    select 'DENIED'::text, 'global_capacity_exhausted'::text, null::text;
    return;
  end if;

  select count(*)::integer
  into v_organization_calls
  from public.route_risk_shadow_provider_capacity_reservations
  where
    organization_id = p_organization_id
    and reserved_at >= v_now - make_interval(secs => p_window_seconds);

  if v_organization_calls >= p_organization_call_limit then
    return query
    select 'DENIED'::text, 'organization_capacity_exhausted'::text, null::text;
    return;
  end if;

  select count(*)::integer
  into v_global_active
  from public.route_risk_shadow_provider_capacity_reservations
  where status = 'reserved' and expires_at > v_now;

  if v_global_active >= p_global_concurrency_limit then
    return query
    select 'DENIED'::text, 'global_concurrency_exhausted'::text, null::text;
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
    select 'DENIED'::text, 'organization_concurrency_exhausted'::text, null::text;
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
  select 'RESERVED'::text, null::text, p_reservation_key;
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
begin
  if p_reservation_key is null or btrim(p_reservation_key) = '' then
    return query select 'UNAVAILABLE'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'harborguard:route-risk-shadow-provider-capacity',
      0
    )
  );

  update public.route_risk_shadow_provider_capacity_reservations
  set
    status = 'released',
    released_at = now()
  where
    reservation_key = p_reservation_key
    and status = 'reserved';

  if found then
    return query select 'RELEASED'::text;
  end if;

  return query select 'NOT_FOUND'::text;
end;
$$;

revoke all on function public.reserve_route_risk_shadow_provider_capacity(
  text, uuid, integer, integer, integer, integer, integer, integer
)
from public, anon, authenticated;

revoke all on function public.release_route_risk_shadow_provider_capacity(text)
from public, anon, authenticated;

grant execute on function public.reserve_route_risk_shadow_provider_capacity(
  text, uuid, integer, integer, integer, integer, integer, integer
)
to service_role;

grant execute on function public.release_route_risk_shadow_provider_capacity(text)
to service_role;
