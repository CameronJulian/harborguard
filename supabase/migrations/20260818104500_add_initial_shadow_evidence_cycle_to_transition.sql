-- HarborGuard B5W
--
-- Extend the controlled approved -> shadow transition so the initial
-- immutable shadow evidence cycle is created atomically with lifecycle entry.
--
-- This migration does NOT:
--
-- - perform ML inference;
-- - persist shadow predictions;
-- - calculate promotion readiness;
-- - activate or retire a model;
-- - create revalidation/recovery cycles;
-- - modify production Route Safety decisions.

create or replace function public.start_route_risk_model_shadow(
  p_registry_id uuid,
  p_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_org_id uuid;
  v_actor_role text;

  v_registry public.route_risk_model_registry%rowtype;
  v_training public.route_risk_training_runs%rowtype;
  v_cycle public.route_risk_shadow_evidence_cycles%rowtype;

  v_rationale text;
  v_shadow_started_at timestamptz;
begin
  v_rationale :=
    btrim(
      coalesce(
        p_rationale,
        ''
      )
    );

  if p_registry_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk model registry id is required';
  end if;

  if length(v_rationale) = 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk shadow transition rationale is required';
  end if;

  v_actor_id :=
    auth.uid();

  if v_actor_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'authenticated route-risk lifecycle actor is required';
  end if;

  select
    profiles.organization_id,
    profiles.role
  into
    v_actor_org_id,
    v_actor_role
  from public.profiles
  where profiles.id = v_actor_id;

  if not found then
    raise exception
      using
        errcode = '42501',
        message =
          'route-risk lifecycle actor profile was not found';
  end if;

  if v_actor_org_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'route-risk lifecycle actor has no organization';
  end if;

  if v_actor_role not in (
    'owner',
    'admin'
  ) then
    raise exception
      using
        errcode = '42501',
        message =
          'route-risk shadow transitions require owner or admin role';
  end if;

  /*
   * Lock the exact organization-owned lifecycle row. This lock also
   * serializes initial-cycle creation for this model.
   */
  select
    registry.*
  into
    v_registry
  from public.route_risk_model_registry as registry
  where
    registry.id = p_registry_id
    and registry.organization_id =
      v_actor_org_id
  for update;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message =
          'route-risk model was not found or is not accessible';
  end if;

  if v_registry.lifecycle_status <> 'approved' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model must be approved before entering shadow';
  end if;

  if
    v_registry.approved_at is null
    or v_registry.approved_by is null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk approved model is missing approval attribution';
  end if;

  if
    v_registry.rejected_at is not null
    or v_registry.rejected_by is not null
    or v_registry.activated_at is not null
    or v_registry.activated_by is not null
    or v_registry.retired_at is not null
    or v_registry.retired_by is not null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk approved model contains incompatible lifecycle attribution';
  end if;

  if v_registry.shadow_started_at is not null then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow lifecycle has already started';
  end if;

  /*
   * No evidence cycle may already exist for an initial approved -> shadow
   * transition. Fail closed rather than silently reuse or overwrite one.
   */
  if exists (
    select 1
    from public.route_risk_shadow_evidence_cycles as cycle
    where
      cycle.model_registry_id =
        v_registry.id
  ) then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model already has shadow evidence-cycle history';
  end if;

  select
    training.*
  into
    v_training
  from public.route_risk_training_runs as training
  where
    training.id =
      v_registry.training_run_id
    and training.organization_id =
      v_registry.organization_id;

  if not found then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow model training artifact is unavailable';
  end if;

  v_shadow_started_at :=
    now();

  update public.route_risk_model_registry
  set
    lifecycle_status =
      'shadow',
    shadow_started_at =
      v_shadow_started_at,
    lifecycle_note =
      v_rationale
  where id =
    v_registry.id
  returning *
  into v_registry;

  /*
   * The initial cycle is created in the same transaction as lifecycle
   * entry. Any failure below rolls back the registry update too.
   */
  insert into public.route_risk_shadow_evidence_cycles (
    organization_id,
    model_registry_id,
    training_run_id,
    cycle_number,
    cycle_kind,
    started_at,
    started_by,
    rationale
  )
  values (
    v_registry.organization_id,
    v_registry.id,
    v_training.id,
    1,
    'initial_shadow',
    v_shadow_started_at,
    v_actor_id,
    v_rationale
  )
  returning *
  into v_cycle;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    target,
    metadata
  )
  values (
    v_registry.organization_id,
    v_actor_id,
    'route_risk_model.shadow_started',
    'route_risk_model_registry:' ||
      v_registry.id::text,
    jsonb_build_object(
      'registryId',
        v_registry.id,
      'trainingRunId',
        v_training.id,
      'runVersion',
        v_training.run_version,
      'datasetFingerprint',
        v_training.dataset_fingerprint,
      'previousLifecycleStatus',
        'approved',
      'newLifecycleStatus',
        'shadow',
      'approvedAt',
        v_registry.approved_at,
      'approvedBy',
        v_registry.approved_by,
      'shadowStartedAt',
        v_shadow_started_at,
      'evidenceCycleId',
        v_cycle.id,
      'evidenceCycleNumber',
        v_cycle.cycle_number,
      'evidenceCycleKind',
        v_cycle.cycle_kind,
      'rationale',
        v_rationale
    )
  );

  return to_jsonb(v_registry);
end;
$$;

revoke all
on function public.start_route_risk_model_shadow(
  uuid,
  text
)
from public;

revoke all
on function public.start_route_risk_model_shadow(
  uuid,
  text
)
from anon;

revoke all
on function public.start_route_risk_model_shadow(
  uuid,
  text
)
from service_role;

grant execute
on function public.start_route_risk_model_shadow(
  uuid,
  text
)
to authenticated;

comment on function public.start_route_risk_model_shadow(
  uuid,
  text
) is
  'Controlled owner/admin approved-to-shadow lifecycle transition. Registry lifecycle mutation, initial shadow evidence-cycle creation, and audit provenance occur atomically. It does not perform inference, activate a model, or modify production Route Safety.';
