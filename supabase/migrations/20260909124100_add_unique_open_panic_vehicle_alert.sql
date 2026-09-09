-- HarborGuard Fleet Panic
-- Enforce exactly one unresolved panic alert per organization + vehicle.
--
-- Application code performs a fast-path lookup before insertion, but this
-- partial UNIQUE index is the authoritative concurrency boundary. If two
-- Panic requests race, PostgreSQL permits one canonical insert and reports
-- SQLSTATE 23505 to the loser, which recovers the canonical open alert.

do $$
begin
  if exists (
    select 1
    from public.vehicle_alerts
    where alert_type = 'panic'
      and is_resolved = false
      and (
        organization_id is null
        or vehicle_id is null
      )
  ) then
    raise exception
      'Cannot install open-panic uniqueness invariant: unresolved panic rows with null organization_id or vehicle_id exist.';
  end if;

  if exists (
    select 1
    from public.vehicle_alerts
    where alert_type = 'panic'
      and is_resolved = false
    group by organization_id, vehicle_id
    having count(*) > 1
  ) then
    raise exception
      'Cannot install open-panic uniqueness invariant: duplicate unresolved panic rows already exist.';
  end if;
end
$$;

create unique index if not exists
  vehicle_alerts_one_open_panic_per_vehicle_idx
on public.vehicle_alerts (
  organization_id,
  vehicle_id
)
where
  alert_type = 'panic'
  and is_resolved = false;

comment on index
  public.vehicle_alerts_one_open_panic_per_vehicle_idx
is
  'HarborGuard Panic invariant: at most one unresolved panic vehicle_alert exists for one organization and vehicle. Resolving the alert releases the identity for a future genuine panic.';
