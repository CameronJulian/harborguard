-- HarborGuard security hardening.
--
-- Remove unnecessary direct profile mutation privileges
-- from anonymous and authenticated database roles.
--
-- Profile reads remain available subject to RLS.
--
-- Profile creation and membership changes continue
-- through audited SECURITY DEFINER workflows:
--   complete_onboarding_atomic(...)
--   accept_organization_invitation_atomic(...)
--
-- Tested locally with rollback-only functional tests
-- in HarborGuard Steps 318 and 320.
--
-- IMPORTANT:
-- This migration does not modify profile SELECT policies.
-- Cross-tenant profile visibility requires separate hardening.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
ON TABLE public.profiles
FROM PUBLIC, anon, authenticated;