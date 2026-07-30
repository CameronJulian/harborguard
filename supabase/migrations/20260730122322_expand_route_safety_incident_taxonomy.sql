alter table public.route_safety_alerts
drop constraint if exists route_safety_alerts_type_check;

alter table public.route_safety_alerts
add constraint route_safety_alerts_type_check
check (
  type in (
    'roadblock',
    'road_closure',
    'lane_closure',
    'roadworks',
    'congestion',
    'accident',
    'vehicle_breakdown',
    'flooding',
    'weather_hazard',
    'road_hazard',
    'debris',
    'police_activity',
    'protest',
    'traffic_light_outage',
    'smash_grab_hotspot'
  )
);

comment on column public.route_safety_alerts.type is
'Normalized HarborGuard incident taxonomy used by manual reports and external traffic providers.';