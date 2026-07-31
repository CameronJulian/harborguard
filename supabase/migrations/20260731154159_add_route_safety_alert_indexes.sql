CREATE INDEX IF NOT EXISTS route_safety_alerts_org_status_idx
ON public.route_safety_alerts
(
    organization_id,
    status
);