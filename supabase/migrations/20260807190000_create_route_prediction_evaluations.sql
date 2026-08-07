create table if not exists public.route_prediction_evaluations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  vehicle_id uuid
    references public.vehicles(id)
    on delete set null,

  trip_id uuid not null
    references public.vehicle_trips(id)
    on delete cascade,

  snapshot_id uuid not null
    references public.route_prediction_snapshots(id)
    on delete cascade,

  outcome_id uuid not null
    references public.route_prediction_outcomes(id)
    on delete cascade,

  prediction_created_at timestamptz not null,
  outcome_completed_at timestamptz not null,

  predicted_risk_score integer not null,
  predicted_risk_level text not null,

  prediction_positive_threshold integer not null default 35,
  predicted_adverse_event boolean not null,
  observed_adverse_event boolean not null,

  classification text not null,

  metadata jsonb,

  created_at timestamptz not null default now(),

  constraint route_prediction_evaluations_trip_unique
    unique (trip_id),

  constraint route_prediction_evaluations_classification_check
    check (
      classification in (
        'true_positive',
        'false_positive',
        'false_negative',
        'true_negative'
      )
    )
);

alter table public.route_prediction_evaluations
enable row level security;

drop policy if exists
"route_prediction_evaluations_select_own_org"
on public.route_prediction_evaluations;

create policy
"route_prediction_evaluations_select_own_org"
on public.route_prediction_evaluations
for select
to authenticated
using (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

drop policy if exists
"route_prediction_evaluations_insert_own_org"
on public.route_prediction_evaluations;

create policy
"route_prediction_evaluations_insert_own_org"
on public.route_prediction_evaluations
for insert
to authenticated
with check (
  organization_id in (
    select organization_id
    from public.profiles
    where id = auth.uid()
  )
);

create index if not exists
route_prediction_evaluations_org_created_idx
on public.route_prediction_evaluations (
  organization_id,
  created_at desc
);

create index if not exists
route_prediction_evaluations_vehicle_created_idx
on public.route_prediction_evaluations (
  vehicle_id,
  created_at desc
);
