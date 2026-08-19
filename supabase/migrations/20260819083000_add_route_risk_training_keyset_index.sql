-- B6V: scale-ready route-risk training evidence traversal.
--
-- readRouteRiskTrainingExamples() scans one organization's immutable
-- evaluation evidence in deterministic ascending order:
--
--   outcome_completed_at ASC,
--   id ASC
--
-- This composite index supports that keyset traversal without requiring
-- increasingly expensive OFFSET scans as the training corpus grows.
--
-- This migration changes no ML authority, model lifecycle state,
-- production scoring behavior, evidence semantics, or row contents.

create index if not exists
  route_prediction_evaluations_org_outcome_completed_id_idx
on public.route_prediction_evaluations (
  organization_id,
  outcome_completed_at,
  id
);

comment on index
  public.route_prediction_evaluations_org_outcome_completed_id_idx
is
  'Supports deterministic organization-scoped route-risk training keyset pagination by outcome_completed_at and id.';
