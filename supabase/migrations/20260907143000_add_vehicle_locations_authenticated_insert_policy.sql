-- Allow authenticated HarborGuard users to persist vehicle telemetry
-- only inside their own organization.
--
-- The row must reference a vehicle owned by that same organization.
-- When a trip is supplied, that trip must also belong to both the
-- same organization and the same vehicle.

drop policy if exists
  "Users can insert vehicle locations in their organization"
on public.vehicle_locations;

create policy
  "Users can insert vehicle locations in their organization"
on public.vehicle_locations
for insert
to authenticated
with check (
  vehicle_locations.organization_id in (
    select profiles.organization_id
    from public.profiles
    where profiles.id = auth.uid()
  )
  and exists (
    select 1
    from public.vehicles as vehicle
    where
      vehicle.id = vehicle_locations.vehicle_id
      and vehicle.organization_id =
        vehicle_locations.organization_id
  )
  and (
    vehicle_locations.trip_id is null
    or exists (
      select 1
      from public.vehicle_trips as trip
      where
        trip.id = vehicle_locations.trip_id
        and trip.organization_id =
          vehicle_locations.organization_id
        and trip.vehicle_id =
          vehicle_locations.vehicle_id
    )
  )
);

comment on policy
  "Users can insert vehicle locations in their organization"
on public.vehicle_locations
is
  'Authenticated telemetry inserts must remain inside the caller organization; vehicle and optional trip identity must agree with that organization.';