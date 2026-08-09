alter table public.vehicle_alerts
add column review_outcome text;

alter table public.vehicle_alerts
add constraint vehicle_alerts_review_outcome_check
check (
  review_outcome is null
  or review_outcome in (
    'confirmed',
    'false_positive',
    'inconclusive'
  )
);
