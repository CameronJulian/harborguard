CREATE TABLE IF NOT EXISTS public.command_center_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  type text NOT NULL DEFAULT 'system',
  source text NOT NULL DEFAULT 'command_center',
  is_read boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  resolved_at timestamptz,
  CONSTRAINT command_center_notifications_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS command_center_notifications_org_created_idx
  ON public.command_center_notifications (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS command_center_notifications_org_unread_idx
  ON public.command_center_notifications (organization_id, is_read, created_at DESC);

ALTER TABLE public.command_center_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization command center notifications"
ON public.command_center_notifications
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can update own organization command center notifications"
ON public.command_center_notifications
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT profiles.organization_id
    FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Service role can manage command center notifications"
ON public.command_center_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
