-- HarborGuard C-1E8B
--
-- Mutable lifecycle metadata for immutable route-risk ML training runs.
--
-- This migration intentionally does NOT:
--
-- - approve any existing training run;
-- - activate any model;
-- - create an activation RPC;
-- - modify Route Safety scoring;
-- - schedule training;
-- - select an evaluation threshold.
--
-- route_risk_training_runs remains the immutable source artifact.
-- route_risk_model_registry stores lifecycle state around that artifact.

alter table public.route_risk_training_runs
  add constraint route_risk_training_runs_id_organization_unique
  unique (id, organization_id);

create table public.route_risk_model_registry (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  training_run_id uuid not null,

  lifecycle_status text not null
    default 'candidate',

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  approved_at timestamptz,
  approved_by uuid,

  rejected_at timestamptz,
  rejected_by uuid,

  shadow_started_at timestamptz,

  activated_at timestamptz,
  activated_by uuid,

  retired_at timestamptz,
  retired_by uuid,

  lifecycle_note text,

  constraint route_risk_model_registry_training_run_org_fk
    foreign key (
      training_run_id,
      organization_id
    )
    references public.route_risk_training_runs (
      id,
      organization_id
    )
    on delete restrict,

  constraint route_risk_model_registry_training_run_unique
    unique (training_run_id),

  constraint route_risk_model_registry_lifecycle_status_valid
    check (
      lifecycle_status in (
        'candidate',
        'approved',
        'shadow',
        'active',
        'rejected',
        'retired'
      )
    ),

  constraint route_risk_model_registry_lifecycle_note_not_blank
    check (
      lifecycle_note is null
      or length(btrim(lifecycle_note)) > 0
    ),

  constraint route_risk_model_registry_approved_pair
    check (
      (
        approved_at is null
        and approved_by is null
      )
      or (
        approved_at is not null
        and approved_by is not null
      )
    ),

  constraint route_risk_model_registry_rejected_pair
    check (
      (
        rejected_at is null
        and rejected_by is null
      )
      or (
        rejected_at is not null
        and rejected_by is not null
      )
    ),

  constraint route_risk_model_registry_activated_pair
    check (
      (
        activated_at is null
        and activated_by is null
      )
      or (
        activated_at is not null
        and activated_by is not null
      )
    ),

  constraint route_risk_model_registry_retired_pair
    check (
      (
        retired_at is null
        and retired_by is null
      )
      or (
        retired_at is not null
        and retired_by is not null
      )
    )
);

create index route_risk_model_registry_org_created_at_idx
  on public.route_risk_model_registry (
    organization_id,
    created_at desc
  );

create index route_risk_model_registry_org_status_idx
  on public.route_risk_model_registry (
    organization_id,
    lifecycle_status,
    created_at desc
  );

-- Database-level singleton protection for the future activation layer.
-- This does not itself activate anything.
create unique index route_risk_model_registry_one_active_per_org_idx
  on public.route_risk_model_registry (
    organization_id
  )
  where lifecycle_status = 'active';

comment on table public.route_risk_model_registry is
  'HarborGuard route-risk ML model lifecycle registry. Each row references one immutable training run and carries mutable candidate/approval/shadow/activation/retirement metadata. Registry existence alone does not affect production Route Safety scoring.';

comment on column public.route_risk_model_registry.training_run_id is
  'Immutable route-risk training run whose model artifact this lifecycle record governs.';

comment on column public.route_risk_model_registry.lifecycle_status is
  'Lifecycle state only. Production activation requires a separate controlled activation mechanism not introduced by C-1E8B.';

comment on column public.route_risk_model_registry.lifecycle_note is
  'Optional human or machine lifecycle rationale. This field is not a model feature and does not affect inference.';

create or replace function public.set_route_risk_model_registry_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_route_risk_model_registry_updated_at
before update on public.route_risk_model_registry
for each row
execute function public.set_route_risk_model_registry_updated_at();

alter table public.route_risk_model_registry
enable row level security;

create policy "route_risk_model_registry_select_own_org"
on public.route_risk_model_registry
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

revoke all
on table public.route_risk_model_registry
from anon;

grant select
on table public.route_risk_model_registry
to authenticated;

revoke insert, update, delete
on table public.route_risk_model_registry
from service_role;

grant select
on table public.route_risk_model_registry
to service_role;

comment on function public.set_route_risk_model_registry_updated_at() is
  'Maintains updated_at for mutable route-risk model lifecycle metadata. It does not approve, activate, retire, or otherwise transition a model by itself.';
