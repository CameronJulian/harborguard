create table if not exists public.telematics_message_receipts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  provider text not null,
  stream text not null,
  provider_message_id text not null,

  received_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  constraint telematics_message_receipts_org_provider_stream_message_unique
    unique (
      organization_id,
      provider,
      stream,
      provider_message_id
    ),

  constraint telematics_message_receipts_provider_not_blank
    check (length(trim(provider)) > 0),

  constraint telematics_message_receipts_stream_not_blank
    check (length(trim(stream)) > 0),

  constraint telematics_message_receipts_provider_message_id_not_blank
    check (length(trim(provider_message_id)) > 0)
);

create index if not exists
  telematics_message_receipts_org_provider_received_idx
on public.telematics_message_receipts (
  organization_id,
  provider,
  received_at desc
);

alter table public.telematics_message_receipts
enable row level security;

drop policy if exists
  "telematics_message_receipts_select_own_org"
on public.telematics_message_receipts;

create policy
  "telematics_message_receipts_select_own_org"
on public.telematics_message_receipts
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);
