create table if not exists public.telematics_integrations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  provider text not null,
  enabled boolean not null default false,

  base_url text null,

  credential_source text not null default 'environment',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint telematics_integrations_org_provider_unique
    unique (organization_id, provider),

  constraint telematics_integrations_provider_not_blank
    check (length(trim(provider)) > 0),

  constraint telematics_integrations_base_url_not_blank
    check (
      base_url is null
      or length(trim(base_url)) > 0
    ),

  constraint telematics_integrations_credential_source_not_blank
    check (length(trim(credential_source)) > 0)
);

create index if not exists
  telematics_integrations_org_enabled_idx
on public.telematics_integrations (
  organization_id,
  enabled
);

alter table public.telematics_integrations
enable row level security;

drop policy if exists
  "telematics_integrations_select_own_org"
on public.telematics_integrations;

create policy
  "telematics_integrations_select_own_org"
on public.telematics_integrations
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

grant select
on public.telematics_integrations
to authenticated;

grant all
on public.telematics_integrations
to service_role;

comment on table public.telematics_integrations is
'Organization-owned telematics provider integration registry. Provider secrets must not be stored in metadata or plaintext configuration columns.';

comment on column public.telematics_integrations.credential_source is
'Identifies where provider credentials are resolved. This column must not contain credential values.';

comment on column public.telematics_integrations.metadata is
'Non-secret provider configuration metadata. Credentials, API tokens, passwords, and secret keys must not be stored here.';