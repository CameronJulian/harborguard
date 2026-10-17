-- HarborGuard organization tenant isolation.
-- Migration version: 20261012110000
--
-- Restrict direct organization access for authenticated users.
-- Preserve privileged backend operations through service_role
-- and existing SECURITY DEFINER onboarding functions.
--
-- This migration must be validated locally before deployment.

DROP POLICY IF EXISTS
    "Users can create organizations"
ON public.organizations;

DROP POLICY IF EXISTS
    "platform_admins_can_create_organizations"
ON public.organizations;

DROP POLICY IF EXISTS
    "Users can view own organizations"
ON public.organizations;

DROP POLICY IF EXISTS
    "platform_admins_can_view_organizations"
ON public.organizations;

DROP POLICY IF EXISTS
    "Users can update own organizations"
ON public.organizations;

DROP POLICY IF EXISTS
    "platform_admins_can_update_organizations"
ON public.organizations;

CREATE POLICY organizations_select_own_tenant
ON public.organizations
FOR SELECT
TO authenticated
USING (
    id = (
        SELECT p.organization_id
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
    )
);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON public.organizations
FROM authenticated;

REVOKE SELECT
ON public.organizations
FROM authenticated;

GRANT SELECT (
    id,
    name,
    created_at,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    payfast_subscription_id,
    fleet_size,
    first_vehicle,
    seats,
    plan,
    billing_email,
    next_billing_date,
    cancelled_at
)
ON public.organizations
TO authenticated;