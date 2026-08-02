alter table public.vehicle_alerts
drop constraint if exists vehicle_alerts_alert_type_check;

alter table public.vehicle_alerts
add constraint vehicle_alerts_alert_type_check
check (
  alert_type in (
    'driver_fatigue',
    'geofence_breach',
    'harsh_braking',
    'harsh_cornering',
    'long_stop',
    'offline',
    'panic',
    'rapid_acceleration',
    'route_anomaly',
    'route_deviation',
    'route_safety_threat',
    'signal_loss',
    'speeding',
    'suspicious_stop'
  )
);

comment on constraint vehicle_alerts_alert_type_check
on public.vehicle_alerts is
  'Allowed operational and telemetry alert types, including harsh braking, rapid acceleration, harsh cornering, and speeding candidates.';
