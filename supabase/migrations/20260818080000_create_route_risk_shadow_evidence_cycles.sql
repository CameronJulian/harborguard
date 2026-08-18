-- HarborGuard B5U
--
-- Immutable identity for one bounded route-risk ML shadow evidence episode.
--
-- A cycle can represent:
--
-- - an initial shadow evaluation episode;
-- - a future recovery/re-validation shadow episode;
-- - another explicitly initiated observational shadow episode.
--
-- The cycle identity exists so evidence from different lifecycle episodes
-- for the same immutable model/training artifact can never be silently mixed.
--
-- This migration intentionally does NOT:
--
-- - move a model into shadow;
-- - move a retired model back into shadow;
-- - reactivate a retired model;
-- - activate or retire any model;
-- - calculate promotion readiness;
-- - classify evidence as sufficient;
-- - modify existing shadow predictions or evaluations;
-- - connect a cycle to Route Safety production decisions;
-- - alter production Route Safety scoring, rerouting, escalation, or
--   recommendations.

create table public.route_risk_shadow_evidence_cycles (
  id uuid primary key
    default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  model_registry_id uuid not null,
  training_run_id uuid not null,

  cycle_number integer not null,

  cycle_kind text not null,

  started_at timestamptz not null
    default now(),

  started_by uuid not null,

  ended_at timestamptz,

  end_reason text,

  rationale text not null,

  created_at timestamptz not null
    default now(),

  constraint route_risk_shadow_evidence_cycles_registry_identity_fk
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

  constraint route_risk_shadow_evidence_cycles_number_positive
    check (
      cycle_number > 0
    ),

  constraint route_risk_shadow_evidence_cycles_kind_valid
    check (
      cycle_kind in (
        'initial_shadow',
        'revalidation_shadow'
      )
    ),

  constraint route_risk_shadow_evidence_cycles_rationale_not_blank
    check (
      length(
        btrim(rationale)
      ) > 0
    ),

  constraint route_risk_shadow_evidence_cycles_end_reason_not_blank
    check (
      end_reason is null
      or length(
        btrim(end_reason)
      ) > 0
    ),

  constraint route_risk_shadow_evidence_cycles_end_pair
    check (
      (
        ended_at is null
        and end_reason is null
      )
      or (
        ended_at is not null
        and end_reason is not null
      )
    ),

  constraint route_risk_shadow_evidence_cycles_time_order
    check (
      ended_at is null
      or started_at <= ended_at
    ),

  constraint route_risk_shadow_evidence_cycles_registry_cycle_unique
    unique (
      model_registry_id,
      cycle_number
    ),

  constraint route_risk_shadow_evidence_cycles_identity_unique
    unique (
      id,
      model_registry_id,
      training_run_id,
      organization_id
    )
);

create index route_risk_shadow_evidence_cycles_org_started_idx
  on public.route_risk_shadow_evidence_cycles (
    organization_id,
    started_at desc
  );

create index route_risk_shadow_evidence_cycles_model_started_idx
  on public.route_risk_shadow_evidence_cycles (
    organization_id,
    model_registry_id,
    started_at desc
  );

/*
 * At most one open evidence cycle may exist for one model registry row.
 *
 * This does not start or stop a cycle; it only provides a database
 * invariant for future explicitly controlled transition authority.
 */
create unique index route_risk_shadow_evidence_cycles_one_open_per_model_idx
  on public.route_risk_shadow_evidence_cycles (
    model_registry_id
  )
  where ended_at is null;

alter table public.route_risk_shadow_evidence_cycles
enable row level security;

create policy "route_risk_shadow_evidence_cycles_select_own_org"
on public.route_risk_shadow_evidence_cycles
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
on table public.route_risk_shadow_evidence_cycles
from public, anon, authenticated, service_role;

grant select
on table public.route_risk_shadow_evidence_cycles
to authenticated;

grant select
on table public.route_risk_shadow_evidence_cycles
to service_role;

comment on table public.route_risk_shadow_evidence_cycles is
  'HarborGuard route-risk ML shadow evidence episode identity. Each row provides a bounded cycle identity for one immutable model-registry/training-run pairing so evidence from separate shadow or re-validation episodes can remain isolated. Rows do not themselves transition model lifecycle state or affect production Route Safety.';

comment on column public.route_risk_shadow_evidence_cycles.cycle_number is
  'Monotonic episode number within one model registry identity. Initial shadow is expected to be cycle 1; later controlled re-validation episodes use subsequent numbers.';

comment on column public.route_risk_shadow_evidence_cycles.cycle_kind is
  'Descriptive episode kind only. It grants no lifecycle, activation, rollback, or production inference authority.';

comment on column public.route_risk_shadow_evidence_cycles.ended_at is
  'Null while the evidence episode is open. Closing an episode requires future explicitly controlled authority not introduced by this migration.';
