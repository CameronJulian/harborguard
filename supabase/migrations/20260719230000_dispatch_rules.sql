create table if not exists public.dispatch_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,
  alert_type text not null,
  preferred_capabilities text[] not null default array['general']::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dispatch_rules_alert_type_not_blank
    check (length(trim(alert_type)) > 0),

  constraint dispatch_rules_preferred_capabilities_not_empty
    check (cardinality(preferred_capabilities) > 0),

  constraint dispatch_rules_preferred_capabilities_valid
    check (
      preferred_capabilities <@ array[
        'general',
        'security',
        'medical',
        'maintenance',
        'fire',
        'police'
      ]::text[]
    ),

  constraint dispatch_rules_organization_alert_type_key
    unique (organization_id, alert_type)
);

create index if not exists dispatch_rules_organization_active_idx
  on public.dispatch_rules (organization_id, is_active);

alter table public.dispatch_rules enable row level security;

create policy "Users can read organization dispatch rules"
on public.dispatch_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.organization_id = dispatch_rules.organization_id
  )
);

create policy "Admins can insert organization dispatch rules"
on public.dispatch_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.organization_id = dispatch_rules.organization_id
      and profiles.role in ('admin', 'super_admin')
  )
);

create policy "Admins can update organization dispatch rules"
on public.dispatch_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.organization_id = dispatch_rules.organization_id
      and profiles.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.organization_id = dispatch_rules.organization_id
      and profiles.role in ('admin', 'super_admin')
  )
);

create policy "Admins can delete organization dispatch rules"
on public.dispatch_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.organization_id = dispatch_rules.organization_id
      and profiles.role in ('admin', 'super_admin')
  )
);
comment on table public.dispatch_rules is
'Organization-specific mappings between alert types and preferred vehicle capabilities.';

comment on column public.dispatch_rules.preferred_capabilities is
'Ordered vehicle capability preferences used before geographic and ETA ranking.';
