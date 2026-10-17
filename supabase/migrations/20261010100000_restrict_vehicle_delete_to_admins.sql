-- HarborGuard vehicle deletion authorization correction.
--
-- Remove the legacy ALL policy that unintentionally permits
-- non-admin organization members to delete vehicles.
--
-- Existing organization-scoped SELECT, INSERT and UPDATE
-- policies remain in place.
--
-- The existing owner/admin-specific DELETE policy remains.
--
-- No customer records are modified by this migration.

BEGIN;

DROP POLICY IF EXISTS
    "Users can access own organization vehicles"
ON public.vehicles;

COMMIT;