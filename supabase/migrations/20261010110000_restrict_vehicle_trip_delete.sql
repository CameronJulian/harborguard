-- HarborGuard trip deletion authorization correction.
--
-- Replace the broad organization-scoped ALL policy with
-- explicit INSERT and UPDATE policies.
--
-- Preserve the existing organization-scoped SELECT policy.
-- Ordinary authenticated users cannot DELETE trip history.
--
-- This migration changes policies only.
-- It does not modify existing trip records.

BEGIN;

DROP POLICY IF EXISTS
    "Users can access own organization trips"
ON public.vehicle_trips;

CREATE POLICY
    "Users can insert trips in their organization"
ON public.vehicle_trips
FOR INSERT
TO authenticated
WITH CHECK (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

CREATE POLICY
    "Users can update trips in their organization"
ON public.vehicle_trips
FOR UPDATE
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

COMMIT;