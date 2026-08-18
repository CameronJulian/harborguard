/*
 * Harden immutable completed-trip shadow evaluation inserts so evidence-cycle
 * provenance must exactly match the referenced immutable shadow prediction.
 *
 * Historical evaluation rows may remain NULL because they predate explicit
 * evidence-cycle provenance. This trigger applies only to new INSERTs.
 *
 * This migration creates no model lifecycle authority and does not affect
 * production Route Safety decisions.
 */

create or replace function public.validate_route_risk_shadow_evaluation_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.evidence_cycle_id is null then
    raise exception
      'route-risk shadow evaluation requires evidence-cycle identity';
  end if;

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
      and prediction.evidence_cycle_id =
        new.evidence_cycle_id
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
      'route-risk shadow evaluation identity does not match its prediction, evidence cycle, snapshot, outcome and completed trip';
  end if;

  return new;
end;
$$;

revoke all
on function public.validate_route_risk_shadow_evaluation_insert()
from public, anon, authenticated;

comment on function public.validate_route_risk_shadow_evaluation_insert() is
  'Requires each new shadow evaluation to match one organization-scoped shadow prediction, the exact evidence cycle inherited from that prediction, production snapshot, canonical completed-trip outcome and trip.';
