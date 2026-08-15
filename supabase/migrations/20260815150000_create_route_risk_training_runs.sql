create table public.route_risk_training_runs (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  run_version text not null,

  dataset_fingerprint text not null,

  manifest jsonb not null,
  model jsonb not null,
  validation_evaluation jsonb not null,
  test_evaluation jsonb not null,

  created_at timestamptz not null default now(),

  constraint route_risk_training_runs_run_version_not_blank
    check (length(btrim(run_version)) > 0),

  constraint route_risk_training_runs_dataset_fingerprint_valid
    check (
      dataset_fingerprint ~ '^[0-9a-f]{64}$'
    ),

  constraint route_risk_training_runs_manifest_object
    check (
      jsonb_typeof(manifest) = 'object'
    ),

  constraint route_risk_training_runs_model_object
    check (
      jsonb_typeof(model) = 'object'
    ),

  constraint route_risk_training_runs_validation_evaluation_object
    check (
      jsonb_typeof(validation_evaluation) = 'object'
    ),

  constraint route_risk_training_runs_test_evaluation_object
    check (
      jsonb_typeof(test_evaluation) = 'object'
    )
);

create index route_risk_training_runs_org_created_at_idx
  on public.route_risk_training_runs (
    organization_id,
    created_at desc
  );

create index route_risk_training_runs_org_dataset_fingerprint_idx
  on public.route_risk_training_runs (
    organization_id,
    dataset_fingerprint
  );

comment on table public.route_risk_training_runs is
  'Immutable HarborGuard offline route-risk ML training-run records. Persistence here does not approve or activate a model for production use.';

comment on column public.route_risk_training_runs.run_version is
  'Version of the offline training-run composition contract.';

comment on column public.route_risk_training_runs.dataset_fingerprint is
  'Deterministic SHA-256 dataset identity produced by the route-risk dataset manifest.';

comment on column public.route_risk_training_runs.manifest is
  'Exact versioned dataset manifest produced by the offline training run.';

comment on column public.route_risk_training_runs.model is
  'Exact offline trained model artifact including algorithm/schema versions, coefficients and training metadata.';

comment on column public.route_risk_training_runs.validation_evaluation is
  'Exact offline validation evaluation produced for this training run.';

comment on column public.route_risk_training_runs.test_evaluation is
  'Exact offline test evaluation produced for this training run.';

create or replace function public.prevent_route_risk_training_run_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'route_risk_training_runs are immutable and cannot be changed';
end;
$$;

create trigger prevent_route_risk_training_run_update
before update on public.route_risk_training_runs
for each row
execute function public.prevent_route_risk_training_run_changes();

create trigger prevent_route_risk_training_run_delete
before delete on public.route_risk_training_runs
for each row
execute function public.prevent_route_risk_training_run_changes();

alter table public.route_risk_training_runs
enable row level security;

create policy "route_risk_training_runs_select_own_org"
on public.route_risk_training_runs
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
on table public.route_risk_training_runs
from anon;

grant select
on table public.route_risk_training_runs
to authenticated;

grant select, insert
on table public.route_risk_training_runs
to service_role;

comment on function public.prevent_route_risk_training_run_changes() is
  'Prevents UPDATE and DELETE of persisted offline route-risk training runs so each successful insertion remains an immutable historical audit record.';
