-- Reconcile the previously untracked invitation table on fresh databases.
-- Existing tables retain their policies and grants.
-- Organization invitations cannot grant platform-wide roles.

DO $migration$
BEGIN
  IF to_regclass('public.organization_invitations') IS NULL THEN
    CREATE TABLE public.organization_invitations (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL,
      email text NOT NULL,
      role text NOT NULL DEFAULT 'viewer',
      token text NOT NULL,
      invited_by uuid,
      accepted_at timestamptz,
      expires_at timestamptz NOT NULL,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT organization_invitations_pkey PRIMARY KEY (id),
      CONSTRAINT organization_invitations_token_key UNIQUE (token),
      CONSTRAINT organization_invitations_organization_id_fkey
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id) ON DELETE CASCADE,
      CONSTRAINT organization_invitations_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
    );

    ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

    CREATE POLICY admins_select_org_invitations
      ON public.organization_invitations FOR SELECT TO PUBLIC
      USING (
        organization_id IN (
          SELECT profiles.organization_id FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'platform_admin', 'super_admin')
        )
      );

    CREATE POLICY admins_insert_org_invitations
      ON public.organization_invitations FOR INSERT TO PUBLIC
      WITH CHECK (
        organization_id IN (
          SELECT profiles.organization_id FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'platform_admin', 'super_admin')
        )
      );

    CREATE POLICY admins_update_org_invitations
      ON public.organization_invitations FOR UPDATE TO PUBLIC
      USING (
        organization_id IN (
          SELECT profiles.organization_id FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'platform_admin', 'super_admin')
        )
      )
      WITH CHECK (
        organization_id IN (
          SELECT profiles.organization_id FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'platform_admin', 'super_admin')
        )
      );

    CREATE POLICY admins_delete_org_invitations
      ON public.organization_invitations FOR DELETE TO PUBLIC
      USING (
        organization_id IN (
          SELECT profiles.organization_id FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'platform_admin', 'super_admin')
        )
      );

    -- Explicit grants for the newly created table only.
    REVOKE ALL ON public.organization_invitations FROM PUBLIC, anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON public.organization_invitations TO authenticated, service_role;
  END IF;
END
$migration$;

-- Validate existing data; abort rather than rewrite incompatible invitations.
ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_tenant_role_check
  CHECK (role IN ('viewer', 'operator', 'manager'));
