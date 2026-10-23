-- Reproduce the recovered organization read-policy boundary in production.
-- The older organization migration did not remove these two legacy policy names.
-- Keep tenant reads through organizations_select_own_tenant and platform
-- administration through the protected service-role API routes.
BEGIN;

DO $organization_policy_prerequisite$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'organizations'
          AND policyname = 'organizations_select_own_tenant'
          AND cmd = 'SELECT'
          AND roles = ARRAY['authenticated']::name[]
    ) THEN
        RAISE EXCEPTION 'Required tenant organization policy is missing; apply migration 20261012110000 first';
    END IF;
END;
$organization_policy_prerequisite$;

DROP POLICY IF EXISTS admins_can_read_all_organizations
ON public.organizations;

DROP POLICY IF EXISTS users_can_read_own_organization
ON public.organizations;

COMMIT;
