-- HarborGuard B17 release-result control-flow correction.
--
-- Preserve the deployed RPC contract and semantics while ensuring a
-- successful release emits exactly one result row.

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
    return;
  end if;

  return query select 'NOT_FOUND'::text;
end;
$$;

revoke all on function public.release_route_risk_shadow_provider_capacity(text)
from public, anon, authenticated;

grant execute on function public.release_route_risk_shadow_provider_capacity(text)
to service_role;
