alter table public.vehicle_alerts
drop constraint if exists vehicle_alerts_alert_type_check;

alter table public.vehicle_alerts
add constraint vehicle_alerts_alert_type_check
check (
  alert_type in (
    'panic',
    'offline',
    'route_deviation',
    'long_stop',
    'manual',
    'suspicious_stop',
    'signal_loss',
    'geofence_breach',
    'driver_fatigue',
    'route_anomaly',
    'route_safety_threat',
    'harsh_braking'
  )
);

comment on constraint vehicle_alerts_alert_type_check
on public.vehicle_alerts is
  'Allowed operational, safety, behavioral, and telemetry alert types, including harsh-braking candidate events.';
