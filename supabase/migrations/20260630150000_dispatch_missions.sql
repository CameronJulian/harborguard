create table if not exists public.dispatch_missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid null references public.incidents(id) on delete set null,
  assigned_vehicle_id uuid null references public.vehicles(id) on delete set null,
  assigned_driver_id uuid null references public.profiles(id) on delete set null,
  dispatcher_id uuid null references public.profiles(id) on delete set null,

  mission_type text not null default 'dispatch',
  priority text not null default 'normal',
  status text not null default 'Pending',

  pickup_lat numeric null,
  pickup_lng numeric null,
  destination_lat numeric not null,
  destination_lng numeric not null,

  route_data jsonb not null default '{}'::jsonb,
  notes text null,

  created_at timestamptz not null default now(),
  assigned_at timestamptz null,
  accepted_at timestamptz null,
  arrived_at timestamptz null,
  completed_at timestamptz null,
  cancelled_at timestamptz null
);

alter table public.dispatch_missions enable row level security;

create policy "Users can read organization dispatch missions"
on public.dispatch_missions
for select
using (organization_id = public.current_user_org_id());

create policy "Admins can insert organization dispatch missions"
on public.dispatch_missions
for insert
with check (organization_id = public.current_user_org_id());

create policy "Admins can update organization dispatch missions"
on public.dispatch_missions
for update
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

create index if not exists dispatch_missions_org_status_idx
on public.dispatch_missions (organization_id, status);

create index if not exists dispatch_missions_vehicle_idx
on public.dispatch_missions (assigned_vehicle_id);

create index if not exists dispatch_missions_incident_idx
on public.dispatch_missions (incident_id);
