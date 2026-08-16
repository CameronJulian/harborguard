-- HarborGuard C-1E9B5D2
--
-- Immutable evidence produced by future route-risk ML shadow inference.
--
-- This migration intentionally does NOT:
--
-- - execute a route-risk model;
-- - connect ML output to production Route Safety decisions;
-- - create a TypeScript persistence helper;
-- - create completed-trip ML evaluation;
-- - activate or promote any model;
-- - choose a classification threshold.
--
-- Every row records what one specific shadow model predicted from the
-- exact four Route Safety risk features present at prediction time.

alter table public.route_prediction_snapshots
  add constraint route_prediction_snapshots_id_organization_unique
  unique (
    id,
    organization_id
  );

alter table public.route_risk_model_registry
  add constraint route_risk_model_registry_identity_org_unique
  unique (
    id,
    training_run_id,
    organization_id
  );

create table public.route_risk_shadow_predictions (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  production_snapshot_id uuid not null,

  model_registry_id uuid not null,
  training_run_id uuid not null,

  feature_schema_version text not null,
  training_contract_version text not null,
  label_schema_version text not null,
  algorithm_version text not null,

  run_version text not null,
  dataset_fingerprint text not null,

  overall_risk_score integer not null,
  threat_risk_score integer not null,
  weather_risk_score integer not null,
  traffic_risk_score integer not null,

  predicted_probability double precision not null,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  constraint route_risk_shadow_predictions_snapshot_org_fk
    foreign key (
      production_snapshot_id,
      organization_id
    )
    references public.route_prediction_snapshots (
      id,
      organization_id
    )
    on delete restrict,

  constraint route_risk_shadow_predictions_registry_identity_fk
    foreign key (
      model_registry_id,
      training_run_id,
      organization_id
    )
    references public.route_risk_model_registry (
      id,
      training_run_id,
      organization_id
    )
    on delete restrict,

  constraint route_risk_shadow_predictions_feature_schema_not_blank
    check (
      length(
        btrim(feature_schema_version)
      ) > 0
    ),

  constraint route_risk_shadow_predictions_training_contract_not_blank
    check (
      length(
        btrim(training_contract_version)
      ) > 0
    ),

  constraint route_risk_shadow_predictions_label_schema_not_blank
    check (
      length(
        btrim(label_schema_version)
      ) > 0
    ),

  constraint route_risk_shadow_predictions_algorithm_not_blank
    check (
      length(
        btrim(algorithm_version)
      ) > 0
    ),

  constraint route_risk_shadow_predictions_run_version_not_blank
    check (
      length(
        btrim(run_version)
      ) > 0
    ),

  constraint route_risk_shadow_predictions_dataset_fingerprint_valid
    check (
      dataset_fingerprint ~
        '^[0-9a-f]{64}$'
    ),

  constraint route_risk_shadow_predictions_overall_score_valid
    check (
      overall_risk_score between 0 and 100
    ),

  constraint route_risk_shadow_predictions_threat_score_valid
    check (
      threat_risk_score between 0 and 100
    ),

  constraint route_risk_shadow_predictions_weather_score_valid
    check (
      weather_risk_score between 0 and 100
    ),

  constraint route_risk_shadow_predictions_traffic_score_valid
    check (
      traffic_risk_score between 0 and 100
    ),

  constraint route_risk_shadow_predictions_probability_valid
    check (
      predicted_probability >= 0.0
      and predicted_probability <= 1.0
    ),

  constraint route_risk_shadow_predictions_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  constraint route_risk_shadow_predictions_snapshot_model_unique
    unique (
      production_snapshot_id,
      model_registry_id
    )
);

create index route_risk_shadow_predictions_org_created_idx
  on public.route_risk_shadow_predictions (
    organization_id,
    created_at desc
  );

create index route_risk_shadow_predictions_registry_created_idx
  on public.route_risk_shadow_predictions (
    model_registry_id,
    created_at desc
  );

create index route_risk_shadow_predictions_training_created_idx
  on public.route_risk_shadow_predictions (
    training_run_id,
    created_at desc
  );

comment on table public.route_risk_shadow_predictions is
  'Immutable HarborGuard ML shadow inference evidence. Each row records the exact model identity, prediction-time four-feature vector and predicted probability for one production Route Safety snapshot. Rows do not affect production Route Safety decisions.';

comment on column public.route_risk_shadow_predictions.production_snapshot_id is
  'The production Route Safety snapshot whose already-computed prediction-time feature values were supplied to the shadow model.';

comment on column public.route_risk_shadow_predictions.model_registry_id is
  'Lifecycle registry identity of the model that was in shadow state when this prediction was recorded.';

comment on column public.route_risk_shadow_predictions.training_run_id is
  'Immutable training-run identity backing the shadow model registry entry.';

comment on column public.route_risk_shadow_predictions.predicted_probability is
  'Deterministic logistic-model probability in the inclusive range 0 through 1. No production classification threshold is implied.';

create or replace function public.validate_route_risk_shadow_prediction_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.route_risk_model_registry as registry
    where
      registry.id =
        new.model_registry_id
      and registry.training_run_id =
        new.training_run_id
      and registry.organization_id =
        new.organization_id
      and registry.lifecycle_status =
        'shadow'
  ) then
    raise exception
      'route-risk shadow prediction requires a matching registry row currently in shadow lifecycle status';
  end if;

  return new;
end;
$$;

create trigger validate_route_risk_shadow_prediction_before_insert
before insert
on public.route_risk_shadow_predictions
for each row
execute function public.validate_route_risk_shadow_prediction_insert();

create or replace function public.prevent_route_risk_shadow_prediction_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'route_risk_shadow_predictions are immutable and cannot be changed';
end;
$$;

create trigger prevent_route_risk_shadow_prediction_update
before update
on public.route_risk_shadow_predictions
for each row
execute function public.prevent_route_risk_shadow_prediction_changes();

create trigger prevent_route_risk_shadow_prediction_delete
before delete
on public.route_risk_shadow_predictions
for each row
execute function public.prevent_route_risk_shadow_prediction_changes();

alter table public.route_risk_shadow_predictions
enable row level security;

create policy "route_risk_shadow_predictions_select_own_org"
on public.route_risk_shadow_predictions
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
on table public.route_risk_shadow_predictions
from public, anon, authenticated, service_role;

grant select
on table public.route_risk_shadow_predictions
to authenticated;

grant select, insert
on table public.route_risk_shadow_predictions
to service_role;

revoke all
on function public.validate_route_risk_shadow_prediction_insert()
from public, anon, authenticated;

revoke all
on function public.prevent_route_risk_shadow_prediction_changes()
from public, anon, authenticated;

comment on function public.validate_route_risk_shadow_prediction_insert() is
  'Ensures ML shadow evidence can only be inserted for a matching organization-scoped model registry row currently in shadow lifecycle state.';

comment on function public.prevent_route_risk_shadow_prediction_changes() is
  'Prevents UPDATE and DELETE of persisted ML shadow predictions so each successful insertion remains immutable prediction-time evidence.';
