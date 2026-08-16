-- HarborGuard C-1E9B6
--
-- Immutable completed-trip evaluation evidence for persisted route-risk
-- ML shadow predictions. These rows are observational only and do not
-- affect production Route Safety decisions or model lifecycle state.

create table public.route_risk_shadow_evaluations (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  shadow_prediction_id uuid not null
    references public.route_risk_shadow_predictions(id)
    on delete restrict,

  production_snapshot_id uuid not null,

  outcome_id uuid not null
    references public.route_prediction_outcomes(id)
    on delete restrict,

  trip_id uuid not null
    references public.vehicle_trips(id)
    on delete restrict,

  model_registry_id uuid not null,
  training_run_id uuid not null,

  prediction_created_at timestamptz not null,
  outcome_completed_at timestamptz not null,

  predicted_probability double precision not null,
  observed_adverse_event boolean not null,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  constraint route_risk_shadow_evaluations_shadow_prediction_unique
    unique (
      shadow_prediction_id
    ),

  constraint route_risk_shadow_evaluations_snapshot_org_fk
    foreign key (
      production_snapshot_id,
      organization_id
    )
    references public.route_prediction_snapshots (
      id,
      organization_id
    )
    on delete restrict,

  constraint route_risk_shadow_evaluations_registry_identity_fk
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

  constraint route_risk_shadow_evaluations_probability_valid
    check (
      predicted_probability >= 0.0
      and predicted_probability <= 1.0
    ),

  constraint route_risk_shadow_evaluations_timestamp_order_valid
    check (
      prediction_created_at <=
        outcome_completed_at
    ),

  constraint route_risk_shadow_evaluations_metadata_object
    check (
      jsonb_typeof(metadata) = 'object'
    )
);

create index route_risk_shadow_evaluations_org_created_idx
  on public.route_risk_shadow_evaluations (
    organization_id,
    created_at desc
  );

create index route_risk_shadow_evaluations_trip_created_idx
  on public.route_risk_shadow_evaluations (
    trip_id,
    created_at desc
  );

create index route_risk_shadow_evaluations_outcome_idx
  on public.route_risk_shadow_evaluations (
    outcome_id
  );

comment on table public.route_risk_shadow_evaluations is
  'Immutable completed-trip evaluation evidence for persisted HarborGuard route-risk ML shadow predictions. Rows do not affect production Route Safety decisions.';

comment on column public.route_risk_shadow_evaluations.shadow_prediction_id is
  'The unique persisted route-risk shadow prediction evaluated against its completed-trip outcome.';

comment on column public.route_risk_shadow_evaluations.predicted_probability is
  'The immutable prediction-time probability copied from the referenced shadow prediction. No classification threshold is implied.';

comment on column public.route_risk_shadow_evaluations.observed_adverse_event is
  'Canonical completed-trip adverse-event truth copied from the referenced route prediction outcome.';

create or replace function public.validate_route_risk_shadow_evaluation_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.route_risk_shadow_predictions as prediction
    inner join public.route_prediction_snapshots as snapshot
      on snapshot.id =
        prediction.production_snapshot_id
    inner join public.route_prediction_outcomes as outcome
      on outcome.id =
        new.outcome_id
    inner join public.vehicle_trips as trip
      on trip.id =
        new.trip_id
    where
      prediction.id =
        new.shadow_prediction_id
      and prediction.organization_id =
        new.organization_id
      and prediction.production_snapshot_id =
        new.production_snapshot_id
      and prediction.model_registry_id =
        new.model_registry_id
      and prediction.training_run_id =
        new.training_run_id
      and prediction.created_at =
        new.prediction_created_at
      and prediction.predicted_probability =
        new.predicted_probability
      and snapshot.organization_id =
        new.organization_id
      and snapshot.trip_id =
        new.trip_id
      and outcome.organization_id =
        new.organization_id
      and outcome.trip_id =
        new.trip_id
      and outcome.completed_at =
        new.outcome_completed_at
      and outcome.adverse_event_occurred =
        new.observed_adverse_event
      and trip.organization_id =
        new.organization_id
      and prediction.created_at <=
        outcome.completed_at
  ) then
    raise exception
      'route-risk shadow evaluation identity does not match its prediction, snapshot, outcome and completed trip';
  end if;

  return new;
end;
$$;

create trigger validate_route_risk_shadow_evaluation_before_insert
before insert
on public.route_risk_shadow_evaluations
for each row
execute function public.validate_route_risk_shadow_evaluation_insert();

create or replace function public.prevent_route_risk_shadow_evaluation_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'route_risk_shadow_evaluations are immutable and cannot be changed';
end;
$$;

create trigger prevent_route_risk_shadow_evaluation_update
before update
on public.route_risk_shadow_evaluations
for each row
execute function public.prevent_route_risk_shadow_evaluation_changes();

create trigger prevent_route_risk_shadow_evaluation_delete
before delete
on public.route_risk_shadow_evaluations
for each row
execute function public.prevent_route_risk_shadow_evaluation_changes();

alter table public.route_risk_shadow_evaluations
enable row level security;

create policy "route_risk_shadow_evaluations_select_own_org"
on public.route_risk_shadow_evaluations
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
on table public.route_risk_shadow_evaluations
from public, anon, authenticated, service_role;

grant select
on table public.route_risk_shadow_evaluations
to authenticated;

grant select, insert
on table public.route_risk_shadow_evaluations
to service_role;

revoke all
on function public.validate_route_risk_shadow_evaluation_insert()
from public, anon, authenticated;

revoke all
on function public.prevent_route_risk_shadow_evaluation_changes()
from public, anon, authenticated;

comment on function public.validate_route_risk_shadow_evaluation_insert() is
  'Requires shadow evaluation evidence to match one organization-scoped shadow prediction, production snapshot, canonical completed-trip outcome and trip.';

comment on function public.prevent_route_risk_shadow_evaluation_changes() is
  'Prevents UPDATE and DELETE of completed-trip route-risk shadow evaluation evidence.';
