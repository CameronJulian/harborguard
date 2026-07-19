alter table public.vehicles
add column if not exists vehicle_type text not null default 'general';

alter table public.vehicles
drop constraint if exists vehicles_vehicle_type_check;

alter table public.vehicles
add constraint vehicles_vehicle_type_check
check (
  vehicle_type in (
    'general',
    'security',
    'medical',
    'maintenance',
    'fire',
    'police'
  )
);

comment on column public.vehicles.vehicle_type is
'Operational capability category used for dispatch responder matching.';
