alter table public.vehicle_alerts
add column if not exists reviewed_by uuid
references auth.users(id)
on delete set null;
