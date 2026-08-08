create table if not exists public.telematics_sync_state (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  provider text not null,
  stream text not null,

  cursor text null,

  last_successful_sync_at timestamptz null,
  last_failure_at timestamptz null,
  last_failure_message text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint telematics_sync_state_org_provider_stream_unique
    unique (organization_id, provider, stream),

  constraint telematics_sync_state_provider_not_blank
    check (length(trim(provider)) > 0),

  constraint telematics_sync_state_stream_not_blank
    check (length(trim(stream)) > 0)
);

create index if not exists
  telematics_sync_state_org_provider_idx
on public.telematics_sync_state (
  organization_id,
  provider
);

alter table public.telematics_sync_state
enable row level security;

drop policy if exists
  "telematics_sync_state_select_own_org"
on public.telematics_sync_state;

create policy
  "telematics_sync_state_select_own_org"
on public.telematics_sync_state
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);
