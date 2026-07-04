-- Database hardening for operations, notifications, and route safety logs

ALTER TABLE public.route_safety_escalation_logs
  ADD CONSTRAINT route_safety_escalation_logs_vehicle_fk
  FOREIGN KEY (vehicle_id)
  REFERENCES public.vehicles(id)
  ON DELETE SET NULL;

ALTER TABLE public.command_center_notifications
  ADD COLUMN IF NOT EXISTS read_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS command_center_notifications_org_resolved_idx
  ON public.command_center_notifications (organization_id, is_resolved, created_at DESC);

CREATE INDEX IF NOT EXISTS route_safety_escalation_logs_org_created_idx
  ON public.route_safety_escalation_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS push_subscriptions_org_active_idx
  ON public.push_subscriptions (organization_id, is_active);
