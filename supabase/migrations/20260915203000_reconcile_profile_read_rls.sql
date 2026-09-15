-- Reconcile tracked profile read RLS with the audited HarborGuard production contract.
--
-- This migration:
-- - removes the two permissive baseline read policies;
-- - preserves the compatibility profile-role contract;
-- - tracks the production is_admin() helper;
-- - permits platform-level admin roles to read all profiles;
-- - permits every authenticated user to read their own profile;
-- - permits authenticated users to read profiles in their own organization.
--
-- The current HarborGuard role contract deliberately treats admin as dual-purpose:
-- tenant administration in organization-scoped APIs and platform administration
-- in existing platform surfaces. owner remains tenant-scoped.

DROP POLICY IF EXISTS "Allow all for now"
ON public.profiles;

DROP POLICY IF EXISTS "authenticated can read profiles"
ON public.profiles;

DROP POLICY IF EXISTS admins_can_read_all_profiles
ON public.profiles;

DROP POLICY IF EXISTS profiles_self_select
ON public.profiles;

DROP POLICY IF EXISTS users_can_read_own_profile
ON public.profiles;

DROP POLICY IF EXISTS users_can_read_profiles_in_own_organization
ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('admin', 'platform_admin', 'super_admin')
    );
$function$;

REVOKE ALL ON FUNCTION public.is_admin()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin()
TO authenticated;

CREATE POLICY admins_can_read_all_profiles
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY profiles_self_select
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY users_can_read_own_profile
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY users_can_read_profiles_in_own_organization
ON public.profiles
FOR SELECT
TO authenticated
USING (organization_id = public.current_user_org_id());
