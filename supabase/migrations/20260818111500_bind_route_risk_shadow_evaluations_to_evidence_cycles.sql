/*
 * Bind immutable completed-trip route-risk shadow evaluations to the
 * evidence cycle of their source shadow prediction.
 *
 * Historical evaluation rows predate evidence-cycle identity, so the new
 * column remains nullable. New-write propagation and stricter insert
 * validation are introduced separately after the evaluation writer has
 * been updated.
 *
 * This migration creates provenance only. It does not perform inference,
 * mutate model lifecycle state, activate or retire models, or affect
 * production Route Safety decisions.
 */

alter table public.route_risk_shadow_evaluations
  add column evidence_cycle_id uuid;

alter table public.route_risk_shadow_evaluations
  add constraint route_risk_shadow_evaluations_evidence_cycle_identity_fk
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

comment on column public.route_risk_shadow_evaluations.evidence_cycle_id is
  'Evidence-cycle provenance inherited from the immutable shadow prediction evaluated against this completed-trip outcome.';

create index route_risk_shadow_evaluations_cycle_completed_idx
  on public.route_risk_shadow_evaluations (
    evidence_cycle_id,
    outcome_completed_at desc
  )
  where evidence_cycle_id is not null;
