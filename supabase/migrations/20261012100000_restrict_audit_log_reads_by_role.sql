-- HarborGuard Audit Logs authorization hardening.
-- Restrict reads to authorized roles within the same organization.
-- Validated using local rollback-only authorization rehearsals.
--
-- This migration does not grant INSERT, UPDATE, or DELETE access.

DROP POLICY IF EXISTS
    users_can_read_own_organization_audit_logs
ON public.audit_logs;

CREATE POLICY
    users_can_read_own_organization_audit_logs
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
          AND p.organization_id = audit_logs.organization_id
          AND p.role IN ('owner', 'admin', 'manager')
    )
);