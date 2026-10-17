-- Prevent authenticated clients from directly modifying
-- invitation credentials, expiry or acceptance state.
--
-- Invitation creation and deletion remain governed by
-- their existing table privileges and RLS policies.
--
-- accept_organization_invitation_atomic(text) is a
-- SECURITY DEFINER function owned by postgres, so it
-- retains the ability to mark invitations accepted.
--
-- Verified locally in rollback-only tests 301 and 302.

REVOKE UPDATE
ON TABLE public.organization_invitations
FROM PUBLIC, anon, authenticated;