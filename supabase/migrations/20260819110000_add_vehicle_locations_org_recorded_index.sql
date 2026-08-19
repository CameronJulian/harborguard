-- B6V: scale-ready organization-scoped vehicle-location traversal.
--
-- HarborGuard has two distinct vehicle-location access shapes:
--
--   1. vehicle-scoped history / latest-location reads:
--        vehicle_id + recorded_at
--
--   2. organization-wide recent/history reads:
--        organization_id + recorded_at
--
-- Existing vehicle_id + recorded_at indexes remain unchanged.
--
-- This migration adds the missing organization-scoped chronological path
-- used by live fleet, optimization, operations and historical reads.
--
-- This is an index-only scale change. It changes no row contents,
-- RLS policy, retention behavior, telemetry semantics, ML lifecycle state,
-- model authority, shadow behavior or production scoring behavior.

create index if not exists
  vehicle_locations_organization_id_recorded_at_idx
on public.vehicle_locations (
  organization_id,
  recorded_at desc
);

comment on index
  public.vehicle_locations_organization_id_recorded_at_idx
is
  'Supports organization-scoped vehicle-location retrieval ordered by recorded_at for live fleet, operational and historical query paths.';
