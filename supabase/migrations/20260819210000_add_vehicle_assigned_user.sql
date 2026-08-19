-- HarborGuard road-user vehicle assignment boundary.
--
-- This intentionally preserves:
-- - public.drivers
-- - vehicles.driver_id
-- - vehicles.tracker_device_id
-- - organization-wide fleet administration
-- - Traccar device ingestion
--
-- assigned_user_id represents the authenticated HarborGuard profile
-- permitted to operate the vehicle through the road-user/mobile flow.

alter table public.vehicles
    add column if not exists assigned_user_id uuid
    references public.profiles(id)
    on delete set null;

create index if not exists vehicles_assigned_user_id_idx
    on public.vehicles (assigned_user_id);

comment on column public.vehicles.assigned_user_id is
    'Authenticated HarborGuard profile assigned to operate this vehicle through road-user/mobile workflows. Separate from legacy vehicles.driver_id and tracker_device_id.';
