create table if not exists public.route_safety_alerts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid
    references public.organizations(id)
    on delete cascade,

  type text not null,
  title text not null,
  description text,

  latitude double precision not null,
  longitude double precision not null,

  radius_meters integer not null default 1000,

  severity text not null default 'medium',
  source text default 'manual',
  status text not null default 'active',

  created_by uuid
    references public.profiles(id),

  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),

  suggested_route text,

  verification_status text default 'unverified',

  constraint route_safety_alerts_severity_check
    check (
      severity in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  constraint route_safety_alerts_status_check
    check (
      status in (
        'active',
        'resolved',
        'expired'
      )
    )
);

alter table public.route_safety_alerts
enable row level security;

create policy "admins_can_manage_org_route_safety_alerts"
on public.route_safety_alerts
using (
  organization_id in (
    select profiles.organization_id
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role in (
        'admin',
        'platform_admin',
        'super_admin'
      )
  )
)
with check (
  organization_id in (
    select profiles.organization_id
    from public.profiles
    where
      profiles.id = auth.uid()
      and profiles.role in (
        'admin',
        'platform_admin',
        'super_admin'
      )
  )
);

create policy "users_can_view_org_route_safety_alerts"
on public.route_safety_alerts
for select
using (
  organization_id in (
    select profiles.organization_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

grant all
on table public.route_safety_alerts
to anon;

grant all
on table public.route_safety_alerts
to authenticated;

grant all
on table public.route_safety_alerts
to service_role;
