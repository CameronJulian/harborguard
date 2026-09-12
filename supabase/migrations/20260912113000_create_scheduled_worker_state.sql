create table public.scheduled_worker_state (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  worker_key text not null,

  last_started_at timestamptz null,
  last_successful_at timestamptz null,
  last_failure_at timestamptz null,
  last_failure_message text null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint scheduled_worker_state_org_worker_unique
    unique (organization_id, worker_key),

  constraint scheduled_worker_state_worker_key_not_blank
    check (length(trim(worker_key)) > 0),

  constraint scheduled_worker_state_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index
  scheduled_worker_state_org_worker_idx
on public.scheduled_worker_state (
  organization_id,
  worker_key
);

alter table public.scheduled_worker_state
enable row level security;

drop policy if exists
  "scheduled_worker_state_select_own_org"
on public.scheduled_worker_state;

create policy
  "scheduled_worker_state_select_own_org"
on public.scheduled_worker_state
for select
to authenticated
using (
  organization_id in (
    select profiles.organization_id
    from public.profiles
    where profiles.id = auth.uid()
  )
);

revoke all
on table public.scheduled_worker_state
from public;

revoke all
on table public.scheduled_worker_state
from anon;

revoke all
on table public.scheduled_worker_state
from authenticated;

grant select
on table public.scheduled_worker_state
to authenticated;

grant all
on table public.scheduled_worker_state
to service_role;

comment on table public.scheduled_worker_state is
  'Current durable operational state for trusted scheduled workers. Stores latest start, success, and failure evidence for missed-run and stale-worker health evaluation. It does not represent HSPP lifecycle state, execution leases, retry identity, or processing authority.';

comment on column public.scheduled_worker_state.worker_key is
  'Stable application-defined scheduled-worker identifier within one organization.';

comment on column public.scheduled_worker_state.last_started_at is
  'Most recent trusted observation that the scheduled worker started execution.';

comment on column public.scheduled_worker_state.last_successful_at is
  'Most recent trusted observation that the scheduled worker completed successfully.';

comment on column public.scheduled_worker_state.last_failure_at is
  'Most recent trusted observation that the scheduled worker failed.';

comment on column public.scheduled_worker_state.metadata is
  'Low-sensitivity operational metadata describing the latest recorded worker event.';