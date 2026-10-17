-- Restrict direct organization-table access.
-- Onboarding and billing use separately authorized server-side paths.

REVOKE ALL PRIVILEGES
ON public.organizations
FROM anon;

REVOKE TRIGGER, REFERENCES, MAINTAIN
ON public.organizations
FROM authenticated;
