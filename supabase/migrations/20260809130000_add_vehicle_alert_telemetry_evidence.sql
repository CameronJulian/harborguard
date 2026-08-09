alter table public.vehicle_alerts
add column if not exists telemetry_evidence jsonb;
