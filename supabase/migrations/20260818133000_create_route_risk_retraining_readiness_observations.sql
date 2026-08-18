-- HarborGuard Model Health B6L
--
-- Immutable route-risk retraining-readiness observation history.
--
-- Each row records one deterministic pre-training readiness assessment
-- against one exact prepared dataset identity and one explicit policy.
--
-- These rows explain why HarborGuard permitted or skipped training.
--
-- They are observational execution-control evidence only.
--
-- This migration intentionally does NOT:
--
-- - establish statistical sufficiency;
-- - choose retraining minimums;
-- - train a model;
-- - persist a trained model artifact;
-- - register or approve a model candidate;
-- - enter shadow mode;
-- - activate or retire a model;
-- - modify production Route Safety behavior.

create table public.route_risk_retraining_readiness_observations (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  dataset_fingerprint text not null,

  dataset_generated_at timestamptz not null,

  previous_training_run_id uuid null,

  assessment_version text not null,

  policy_version text not null,

  readiness_state text not null,

  assessment jsonb not null,

  created_at timestamptz not null
    default now(),

  constraint route_risk_retraining_readiness_observations_dataset_fingerprint_valid
    check (
      dataset_fingerprint ~ '^[0-9a-f]{64}$'
    ),

  constraint route_risk_retraining_readiness_observations_assessment_version_not_blank
    check (
      length(btrim(assessment_version)) > 0
    ),

  constraint route_risk_retraining_readiness_observations_policy_version_not_blank
    check (
      length(btrim(policy_version)) > 0
    ),

  constraint route_risk_retraining_readiness_observations_state_valid
    check (
      readiness_state in (
        'NOT_READY_FOR_TRAINING',
        'READY_FOR_TRAINING'
      )
    ),

  constraint route_risk_retraining_readiness_observations_assessment_object
    check (
      jsonb_typeof(assessment) = 'object'
    ),

  constraint route_risk_retraining_readiness_observations_previous_training_identity_fk
    foreign key (
      previous_training_run_id,
      organization_id
    )
    references public.route_risk_training_runs (
      id,
      organization_id
    )
    on delete restrict
);

create index route_risk_retraining_readiness_observations_org_created_idx
  on public.route_risk_retraining_readiness_observations (
    organization_id,
    created_at desc
  );

create index route_risk_retraining_readiness_observations_org_dataset_idx
  on public.route_risk_retraining_readiness_observations (
    organization_id,
    dataset_fingerprint,
    created_at desc
  );

create index route_risk_retraining_readiness_observations_org_state_idx
  on public.route_risk_retraining_readiness_observations (
    organization_id,
    readiness_state,
    created_at desc
  );

create unique index route_risk_retraining_readiness_observations_identity_unique
  on public.route_risk_retraining_readiness_observations (
    organization_id,
    dataset_fingerprint,
    dataset_generated_at,
    coalesce(
      previous_training_run_id,
      '00000000-0000-0000-0000-000000000000'::uuid
    ),
    assessment_version,
    policy_version
  );

comment on table public.route_risk_retraining_readiness_observations is
  'Immutable HarborGuard route-risk retraining-readiness observations. Rows preserve exact pre-training execution-control assessments explaining why training was permitted or skipped, without establishing statistical sufficiency, model lifecycle authority, or production Route Safety influence.';

comment on column public.route_risk_retraining_readiness_observations.dataset_fingerprint is
  'Deterministic SHA-256 identity of the exact prepared route-risk dataset assessed for retraining readiness.';

comment on column public.route_risk_retraining_readiness_observations.dataset_generated_at is
  'Generation timestamp carried by the exact prepared dataset manifest assessed for retraining readiness.';

comment on column public.route_risk_retraining_readiness_observations.previous_training_run_id is
  'Optional immutable prior training-run identity used by the readiness assessment to determine whether dataset evidence changed.';

comment on column public.route_risk_retraining_readiness_observations.assessment is
  'Exact versioned RouteRiskRetrainingReadinessAssessment produced before any model optimization.';

create or replace function public.prevent_route_risk_retraining_readiness_observation_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'route_risk_retraining_readiness_observations are immutable and cannot be changed';
end;
$$;

create trigger prevent_route_risk_retraining_readiness_observation_update
before update
on public.route_risk_retraining_readiness_observations
for each row
execute function public.prevent_route_risk_retraining_readiness_observation_changes();

create trigger prevent_route_risk_retraining_readiness_observation_delete
before delete
on public.route_risk_retraining_readiness_observations
for each row
execute function public.prevent_route_risk_retraining_readiness_observation_changes();

alter table public.route_risk_retraining_readiness_observations
enable row level security;

create policy "route_risk_retraining_readiness_observations_select_own_org"
on public.route_risk_retraining_readiness_observations
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
on table public.route_risk_retraining_readiness_observations
from public, anon, authenticated, service_role;

grant select
on table public.route_risk_retraining_readiness_observations
to authenticated;

grant select, insert
on table public.route_risk_retraining_readiness_observations
to service_role;

revoke all
on function public.prevent_route_risk_retraining_readiness_observation_changes()
from public, anon, authenticated;

comment on function public.prevent_route_risk_retraining_readiness_observation_changes() is
  'Prevents UPDATE and DELETE of persisted route-risk retraining-readiness observations so historical execution-control evidence remains immutable.';
