-- HarborGuard Model Health B5A
--
-- Immutable descriptive model-health observation history.
--
-- This table records historical B1 model-health comparisons together with
-- their B3 structural evidence assessments.
--
-- These rows are observational only.
--
-- This migration intentionally does NOT:
--
-- - establish statistical sufficiency;
-- - establish a drift threshold;
-- - classify a model as healthy, degraded, or drifted;
-- - trigger retraining;
-- - approve, activate, retire, or otherwise transition a model;
-- - modify production Route Safety behavior.

create table public.route_risk_shadow_model_health_observations (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  model_registry_id uuid not null,
  training_run_id uuid not null,

  reference_start timestamptz not null,
  reference_end timestamptz not null,

  recent_start timestamptz not null,
  recent_end timestamptz not null,

  analysis_version text not null,
  evidence_assessment_version text not null,

  model_health jsonb not null,
  evidence_assessment jsonb not null,

  created_at timestamptz not null
    default now(),

  constraint route_risk_shadow_model_health_observations_registry_identity_fk
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

  constraint route_risk_shadow_model_health_observations_reference_window_valid
    check (
      reference_start <= reference_end
    ),

  constraint route_risk_shadow_model_health_observations_recent_window_valid
    check (
      recent_start <= recent_end
    ),

  constraint route_risk_shadow_model_health_observations_window_order_valid
    check (
      reference_end <= recent_start
    ),

  constraint route_risk_shadow_model_health_observations_analysis_version_not_blank
    check (
      length(btrim(analysis_version)) > 0
    ),

  constraint route_risk_shadow_model_health_observations_evidence_version_not_blank
    check (
      length(btrim(evidence_assessment_version)) > 0
    ),

  constraint route_risk_shadow_model_health_observations_model_health_object
    check (
      jsonb_typeof(model_health) = 'object'
    ),

  constraint route_risk_shadow_model_health_observations_evidence_assessment_object
    check (
      jsonb_typeof(evidence_assessment) = 'object'
    ),

  constraint route_risk_shadow_model_health_observations_window_identity_unique
    unique (
      organization_id,
      model_registry_id,
      training_run_id,
      reference_start,
      reference_end,
      recent_start,
      recent_end,
      analysis_version,
      evidence_assessment_version
    )
);

create index route_risk_shadow_model_health_observations_org_created_idx
  on public.route_risk_shadow_model_health_observations (
    organization_id,
    created_at desc
  );

create index route_risk_shadow_model_health_observations_model_created_idx
  on public.route_risk_shadow_model_health_observations (
    organization_id,
    model_registry_id,
    created_at desc
  );

comment on table public.route_risk_shadow_model_health_observations is
  'Immutable descriptive HarborGuard route-risk shadow model-health observations. Rows preserve historical model-health metrics and structural evidence assessments without establishing drift, statistical sufficiency, retraining authority, model lifecycle authority, or production Route Safety influence.';

comment on column public.route_risk_shadow_model_health_observations.model_health is
  'Exact versioned descriptive model-health comparison produced by HarborGuard for the recorded reference and recent windows.';

comment on column public.route_risk_shadow_model_health_observations.evidence_assessment is
  'Exact structural evidence-availability assessment associated with the descriptive model-health comparison. Statistical sufficiency is not implied.';

create or replace function public.prevent_route_risk_shadow_model_health_observation_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'route_risk_shadow_model_health_observations are immutable and cannot be changed';
end;
$$;

create trigger prevent_route_risk_shadow_model_health_observation_update
before update
on public.route_risk_shadow_model_health_observations
for each row
execute function public.prevent_route_risk_shadow_model_health_observation_changes();

create trigger prevent_route_risk_shadow_model_health_observation_delete
before delete
on public.route_risk_shadow_model_health_observations
for each row
execute function public.prevent_route_risk_shadow_model_health_observation_changes();

alter table public.route_risk_shadow_model_health_observations
enable row level security;

create policy "route_risk_shadow_model_health_observations_select_own_org"
on public.route_risk_shadow_model_health_observations
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
on table public.route_risk_shadow_model_health_observations
from public, anon, authenticated, service_role;

grant select
on table public.route_risk_shadow_model_health_observations
to authenticated;

grant select, insert
on table public.route_risk_shadow_model_health_observations
to service_role;

revoke all
on function public.prevent_route_risk_shadow_model_health_observation_changes()
from public, anon, authenticated;

comment on function public.prevent_route_risk_shadow_model_health_observation_changes() is
  'Prevents UPDATE and DELETE of persisted route-risk shadow model-health observations so historical descriptive evidence remains immutable.';
