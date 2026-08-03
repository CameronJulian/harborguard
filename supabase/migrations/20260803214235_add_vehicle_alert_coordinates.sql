alter table public.vehicle_alerts
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.vehicle_alerts
drop constraint if exists vehicle_alerts_latitude_check;

alter table public.vehicle_alerts
add constraint vehicle_alerts_latitude_check
check (
  latitude is null
  or (
    latitude >= -90
    and latitude <= 90
  )
);

alter table public.vehicle_alerts
drop constraint if exists vehicle_alerts_longitude_check;

alter table public.vehicle_alerts
add constraint vehicle_alerts_longitude_check
check (
  longitude is null
  or (
    longitude >= -180
    and longitude <= 180
  )
);

alter table public.vehicle_alerts
drop constraint if exists vehicle_alerts_coordinate_pair_check;

alter table public.vehicle_alerts
add constraint vehicle_alerts_coordinate_pair_check
check (
  (
    latitude is null
    and longitude is null
  )
  or
  (
    latitude is not null
    and longitude is not null
  )
);

comment on column public.vehicle_alerts.latitude is
  'Latitude captured when the vehicle alert was generated. Nullable for legacy and non-location alerts.';

comment on column public.vehicle_alerts.longitude is
  'Longitude captured when the vehicle alert was generated. Nullable for legacy and non-location alerts.';
