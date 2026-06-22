create table if not exists public.route_safety_escalation_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid,
  trip_id uuid,
  route_alert_id uuid,
  risk_score integer,
  risk_level text,
  auto_escalated boolean not null default false,
  duplicate_detected boolean not null default false,
  push_sent boolean not null default false,
  response jsonb,
  created_at timestamptz not null default now()
);

alter table public.route_safety_escalation_logs enable row level security;

drop policy if exists "route_safety_escalation_logs_select_own_org" on public.route_safety_escalation_logs;
create policy "route_safety_escalation_logs_select_own_org"
on public.route_safety_escalation_logs
for select
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists "route_safety_escalation_logs_insert_own_org" on public.route_safety_escalation_logs;
create policy "route_safety_escalation_logs_insert_own_org"
on public.route_safety_escalation_logs
for insert
with check (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

create index if not exists route_safety_escalation_logs_org_idx
on public.route_safety_escalation_logs(organization_id);

create index if not exists route_safety_escalation_logs_created_idx
on public.route_safety_escalation_logs(created_at desc);
