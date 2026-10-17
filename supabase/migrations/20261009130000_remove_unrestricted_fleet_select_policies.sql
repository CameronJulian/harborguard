-- HarborGuard fleet tenant-isolation correction.
--
-- Remove legacy unrestricted authenticated SELECT policies.
-- Existing organization-scoped policies remain in place.
--
-- This migration does not modify customer records.

BEGIN;

DROP POLICY IF EXISTS
    "authenticated can read vehicle_locations"
ON public.vehicle_locations;

DROP POLICY IF EXISTS
    "authenticated can read vehicle_trips"
ON public.vehicle_trips;

DROP POLICY IF EXISTS
    "authenticated can read vehicles"
ON public.vehicles;

COMMIT;