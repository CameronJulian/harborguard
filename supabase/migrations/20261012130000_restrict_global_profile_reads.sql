-- Restrict global profile reads to platform-level administrators.
-- Ordinary organization administrators retain tenant-scoped access
-- through the existing own-organization SELECT policy.

CREATE FUNCTION public.is_platform_profile_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN (
              'platform_admin',
              'super_admin'
          )
    );
$function$;

REVOKE ALL
ON FUNCTION public.is_platform_profile_admin()
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.is_platform_profile_admin()
TO authenticated;

DROP POLICY admins_can_read_all_profiles
ON public.profiles;

CREATE POLICY admins_can_read_all_profiles
ON public.profiles
FOR SELECT
TO authenticated
USING (
    (SELECT public.is_platform_profile_admin())
);
