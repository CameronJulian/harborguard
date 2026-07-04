-- Incident Command Center response workflow

CREATE TABLE IF NOT EXISTS public.incident_command_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_command_actions_org_incident_idx
  ON public.incident_command_actions (organization_id, incident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS incident_command_actions_status_idx
  ON public.incident_command_actions (organization_id, status);
