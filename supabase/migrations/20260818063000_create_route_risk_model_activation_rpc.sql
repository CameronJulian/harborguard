-- HarborGuard B5N
--
-- Controlled human lifecycle transition:
--
--   shadow -> active
--
-- If another model is already active for the same organization:
--
--   active -> retired
--
-- Both lifecycle mutations and their immutable audit provenance occur
-- atomically in the same database transaction.
--
-- This migration intentionally does NOT:
--
-- - decide whether a model is statistically ready for production;
-- - calculate promotion readiness;
-- - select or invent production thresholds;
-- - trigger retraining;
-- - schedule activation;
-- - automatically invoke activation;
-- - load the active model into Route Safety;
-- - alter Route Safety scoring, rerouting, escalation, or recommendations;
-- - grant direct UPDATE access to the model registry.
--
-- Activation therefore remains an explicit authenticated human lifecycle
-- action. Registry state alone still has no production inference authority.

create or replace function public.activate_route_risk_model(
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
  v_previous_active public.route_risk_model_registry%rowtype;

  v_rationale text;
  v_activated_at timestamptz;

  v_previous_active_id uuid;
  v_previous_training_run_id uuid;
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
          'route-risk model activation rationale is required';
  end if;

  /*
   * Activation is an authenticated human lifecycle action.
   */
  v_actor_id :=
    auth.uid();

  if v_actor_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'authenticated route-risk lifecycle actor is required';
  end if;

  /*
   * profiles remains HarborGuard's authoritative organization + role
   * source for lifecycle authority.
   */
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
          'route-risk model activation requires owner or admin role';
  end if;

  /*
   * Serialize lifecycle activation for this organization.
   *
   * Locking every registry record owned by the organization prevents
   * concurrent activation attempts from racing the one-active-model
   * invariant.
   */
  perform registry.id
  from public.route_risk_model_registry as registry
  where registry.organization_id = v_actor_org_id
  order by registry.id
  for update;

  /*
   * Resolve the exact requested model inside the authenticated
   * organization after acquiring the organization lifecycle locks.
   */
  select
    registry.*
  into
    v_registry
  from public.route_risk_model_registry as registry
  where
    registry.id = p_registry_id
    and registry.organization_id = v_actor_org_id;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message =
          'route-risk model was not found or is not accessible';
  end if;

  /*
   * This RPC owns exactly shadow -> active.
   */
  if v_registry.lifecycle_status <> 'shadow' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model must be in shadow lifecycle status before activation';
  end if;

  /*
   * All prerequisite lifecycle provenance must already exist.
   */
  if
    v_registry.approved_at is null
    or v_registry.approved_by is null
    or v_registry.shadow_started_at is null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow model is missing prerequisite lifecycle attribution';
  end if;

  /*
   * Fail closed on contradictory historical state.
   */
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
          'route-risk shadow model contains incompatible lifecycle attribution';
  end if;

  /*
   * Reconfirm immutable artifact identity before lifecycle advancement.
   */
  select
    training.*
  into
    v_training
  from public.route_risk_training_runs as training
  where
    training.id = v_registry.training_run_id
    and training.organization_id =
      v_registry.organization_id;

  if not found then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow model training artifact is unavailable';
  end if;

  /*
   * Resolve the current incumbent, if one exists.
   *
   * The partial unique index guarantees at most one row can satisfy this
   * predicate.
   */
  select
    registry.*
  into
    v_previous_active
  from public.route_risk_model_registry as registry
  where
    registry.organization_id = v_actor_org_id
    and registry.lifecycle_status = 'active'
    and registry.id <> v_registry.id;

  if found then
    if
      v_previous_active.activated_at is null
      or v_previous_active.activated_by is null
    then
      raise exception
        using
          errcode = '55000',
          message =
            'existing active route-risk model is missing activation attribution';
    end if;

    if
      v_previous_active.retired_at is not null
      or v_previous_active.retired_by is not null
    then
      raise exception
        using
          errcode = '55000',
          message =
            'existing active route-risk model contains retirement attribution';
    end if;

    v_previous_active_id :=
      v_previous_active.id;

    v_previous_training_run_id :=
      v_previous_active.training_run_id;
  else
    v_previous_active_id :=
      null;

    v_previous_training_run_id :=
      null;
  end if;

  v_activated_at :=
    now();

  /*
   * Retire the incumbent before activating the challenger so the partial
   * unique index remains valid throughout the transaction.
   */
  if v_previous_active_id is not null then
    update public.route_risk_model_registry
    set
      lifecycle_status = 'retired',
      retired_at = v_activated_at,
      retired_by = v_actor_id,
      lifecycle_note =
        'Retired atomically during activation of route-risk model ' ||
        v_registry.id::text ||
        '. Activation rationale: ' ||
        v_rationale
    where id = v_previous_active_id
    returning *
    into v_previous_active;

    insert into public.audit_logs (
      organization_id,
      user_id,
      action,
      target,
      metadata
    )
    values (
      v_actor_org_id,
      v_actor_id,
      'route_risk_model.retired_for_activation',
      'route_risk_model_registry:' ||
        v_previous_active.id::text,
      jsonb_build_object(
        'registryId',
          v_previous_active.id,
        'trainingRunId',
          v_previous_training_run_id,
        'previousLifecycleStatus',
          'active',
        'newLifecycleStatus',
          'retired',
        'retiredAt',
          v_activated_at,
        'replacementRegistryId',
          v_registry.id,
        'replacementTrainingRunId',
          v_registry.training_run_id,
        'rationale',
          v_rationale
      )
    );
  end if;

  /*
   * Activate only the explicitly requested shadow model.
   */
  update public.route_risk_model_registry
  set
    lifecycle_status = 'active',
    activated_at = v_activated_at,
    activated_by = v_actor_id,
    lifecycle_note = v_rationale
  where id = v_registry.id
  returning *
  into v_registry;

  /*
   * Activation audit provenance is atomic with every lifecycle mutation.
   */
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
    'route_risk_model.activated',
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
        'shadow',
      'newLifecycleStatus',
        'active',
      'approvedAt',
        v_registry.approved_at,
      'approvedBy',
        v_registry.approved_by,
      'shadowStartedAt',
        v_registry.shadow_started_at,
      'activatedAt',
        v_activated_at,
      'previousActiveRegistryId',
        v_previous_active_id,
      'previousActiveTrainingRunId',
        v_previous_training_run_id,
      'rationale',
        v_rationale
    )
  );

  return jsonb_build_object(
    'activated',
      to_jsonb(v_registry),
    'retired',
      case
        when v_previous_active_id is null
          then null
        else to_jsonb(v_previous_active)
      end
  );
end;
$$;

revoke all
on function public.activate_route_risk_model(
  uuid,
  text
)
from public;

revoke all
on function public.activate_route_risk_model(
  uuid,
  text
)
from anon;

revoke all
on function public.activate_route_risk_model(
  uuid,
  text
)
from service_role;

grant execute
on function public.activate_route_risk_model(
  uuid,
  text
)
to authenticated;

comment on function public.activate_route_risk_model(
  uuid,
  text
) is
  'Controlled HarborGuard owner/admin shadow-to-active route-risk model lifecycle transition. Atomically retires the organization''s previous active model when present, records immutable audit provenance, and does not itself establish statistical readiness, select production thresholds, trigger retraining, schedule activation, or connect registry state to Route Safety inference.';
