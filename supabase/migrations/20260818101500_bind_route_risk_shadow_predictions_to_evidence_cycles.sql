/*
 * Bind immutable route-risk shadow predictions to an explicit shadow
 * evidence cycle.
 *
 * This is provenance only. It creates no lifecycle mutation authority and
 * does not affect production Route Safety decisions.
 */

alter table public.route_risk_shadow_predictions
  add column evidence_cycle_id uuid;

alter table public.route_risk_shadow_predictions
  add constraint route_risk_shadow_predictions_evidence_cycle_identity_fk
  foreign key (
    evidence_cycle_id,
    model_registry_id,
    training_run_id,
    organization_id
  )
  references public.route_risk_shadow_evidence_cycles (
    id,
    model_registry_id,
    training_run_id,
    organization_id
  )
  on delete restrict;

comment on column public.route_risk_shadow_predictions.evidence_cycle_id is
  'Explicit shadow evidence-cycle identity under which this immutable prediction was recorded.';

create index route_risk_shadow_predictions_cycle_created_idx
  on public.route_risk_shadow_predictions (
    evidence_cycle_id,
    created_at desc
  )
  where evidence_cycle_id is not null;
