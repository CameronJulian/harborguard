-- HarborGuard incident correlation expects incidents.vehicle_alert_id.
-- Keep incidents durable if a vehicle alert is ever deleted.

alter table public.incidents
  add column if not exists vehicle_alert_id uuid;

alter table public.incidents
  drop constraint if exists incidents_vehicle_alert_id_fkey;

alter table public.incidents
  add constraint incidents_vehicle_alert_id_fkey
  foreign key (vehicle_alert_id)
  references public.vehicle_alerts(id)
  on delete set null;

create index if not exists incidents_vehicle_alert_id_idx
  on public.incidents(vehicle_alert_id);