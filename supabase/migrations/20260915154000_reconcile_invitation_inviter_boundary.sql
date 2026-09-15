-- Reconcile organization invitation administration with HarborGuard's
-- canonical tenant-level owner/admin authorization boundary.
--
-- Scope:
-- - invitation policy authorization only;
-- - no invitation-role constraint changes;
-- - no invitation data rewrites;
-- - no acceptance workflow changes.

DROP POLICY IF EXISTS admins_select_org_invitations
ON public.organization_invitations;

DROP POLICY IF EXISTS admins_insert_org_invitations
ON public.organization_invitations;

DROP POLICY IF EXISTS admins_update_org_invitations
ON public.organization_invitations;

DROP POLICY IF EXISTS admins_delete_org_invitations
ON public.organization_invitations;

CREATE POLICY admins_select_org_invitations
ON public.organization_invitations
FOR SELECT
TO PUBLIC
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
  )
);

CREATE POLICY admins_insert_org_invitations
ON public.organization_invitations
FOR INSERT
TO PUBLIC
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
  )
);

CREATE POLICY admins_update_org_invitations
ON public.organization_invitations
FOR UPDATE
TO PUBLIC
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
  )
);

CREATE POLICY admins_delete_org_invitations
ON public.organization_invitations
FOR DELETE
TO PUBLIC
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
  )
);
