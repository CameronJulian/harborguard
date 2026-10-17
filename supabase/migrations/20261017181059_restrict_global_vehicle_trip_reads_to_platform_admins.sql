-- HarborGuard: cross-tenant fleet read authorization.
--
-- Restrict global vehicle and vehicle-trip reads to
-- genuine platform administrators.
--
-- Prerequisite migration:
-- 20261012130000_restrict_global_profile_reads.sql
--
-- Requires public.is_platform_profile_admin().
--
-- Tested in disposable PostgreSQL in Step 833.
-- Rollback and original policies verified in Step 834.
--
-- REVIEW CANDIDATE ONLY.
-- Do not apply to protected local or production databases.
-- Final deployment must use a reviewed transaction.

ALTER POLICY admins_can_read_all_vehicles
ON public.vehicles
TO authenticated
USING (
    (SELECT public.is_platform_profile_admin())
);

ALTER POLICY admins_can_read_all_vehicle_trips
ON public.vehicle_trips
TO authenticated
USING (
    (SELECT public.is_platform_profile_admin())
);
