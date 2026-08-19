-- HarborGuard route-risk model evidence-cycle-aware activation.
--
-- Extends the existing single controlled shadow -> active authority so it can
-- distinguish:
--
--   initial_shadow      -> first activation
--   revalidation_shadow -> explicit human reactivation
--
-- The currently open evidence-cycle identity is authoritative for the shadow
-- episode being consumed.
--
-- Historical revalidation provenance is preserved in immutable audit_logs.
-- The registry row continues to describe current/latest lifecycle attribution,
-- allowing a reactivated model to be retired normally in the future.
--
-- This migration intentionally does NOT:
--
-- - permit retired -> active directly;
-- - activate a model without an open evidence cycle;
-- - infer promotion readiness;
-- - automatically select a model;
-- - automatically perform rollback;
-- - automatically promote a model;
-- - trigger retraining;
-- - select production thresholds;
-- - connect registry state to Route Safety production inference.

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
  v_cycle public.route_risk_shadow_evidence_cycles%rowtype;

  v_rationale text;
  v_activated_at timestamptz;

  v_previous_active_id uuid;
  v_previous_training_run_id uuid;

  v_previous_activated_at timestamptz;
  v_previous_activated_by uuid;
  v_previous_retired_at timestamptz;
  v_previous_retired_by uuid;

  v_activation_kind text;
  v_audit_action text;
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
   * Activation/reactivation remains an explicit authenticated human action.
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
   * Serialize lifecycle activation for the organization.
   */
  perform registry.id
  from public.route_risk_model_registry as registry
  where registry.organization_id =
    v_actor_org_id
  order by registry.id
  for update;

  select
    registry.*
  into
    v_registry
  from public.route_risk_model_registry as registry
  where
    registry.id = p_registry_id
    and registry.organization_id =
      v_actor_org_id;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message =
          'route-risk model was not found or is not accessible';
  end if;

  /*
   * Direct retired -> active remains impossible.
   */
  if v_registry.lifecycle_status <> 'shadow' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model must be in shadow lifecycle status before activation';
  end if;

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

  if
    v_registry.rejected_at is not null
    or v_registry.rejected_by is not null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow model contains incompatible rejection attribution';
  end if;

  /*
   * Resolve exactly one currently open evidence episode for this exact model.
   *
   * The unique partial index already guarantees at most one open cycle per
   * registry identity. FOR UPDATE prevents concurrent lifecycle consumption.
   */
  select
    cycle.*
  into
    v_cycle
  from public.route_risk_shadow_evidence_cycles as cycle
  where
    cycle.organization_id =
      v_registry.organization_id
    and cycle.model_registry_id =
      v_registry.id
    and cycle.training_run_id =
      v_registry.training_run_id
    and cycle.ended_at is null
  for update;

  if not found then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow model does not have an open evidence cycle';
  end if;

  /*
   * Lifecycle attribution must match the type of shadow episode.
   */
  if v_cycle.cycle_kind = 'initial_shadow' then

    if v_cycle.cycle_number <> 1 then
      raise exception
        using
          errcode = '55000',
          message =
            'initial route-risk shadow evidence cycle must be cycle 1';
    end if;

    if
      v_registry.activated_at is not null
      or v_registry.activated_by is not null
      or v_registry.retired_at is not null
      or v_registry.retired_by is not null
    then
      raise exception
        using
          errcode = '55000',
          message =
            'initial route-risk shadow model contains incompatible lifecycle attribution';
    end if;

    v_activation_kind :=
      'initial_activation';

    v_audit_action :=
      'route_risk_model.activated';

  elsif v_cycle.cycle_kind = 'revalidation_shadow' then

    if v_cycle.cycle_number <= 1 then
      raise exception
        using
          errcode = '55000',
          message =
            'route-risk revalidation shadow evidence cycle must follow the initial cycle';
    end if;

    if
      v_registry.activated_at is null
      or v_registry.activated_by is null
      or v_registry.retired_at is null
      or v_registry.retired_by is null
    then
      raise exception
        using
          errcode = '55000',
          message =
            'route-risk revalidation shadow model is missing prior lifecycle attribution';
    end if;

    /*
     * Snapshot prior registry attribution before moving current-state fields.
     * Immutable audit_logs retains this previous episode permanently.
     */
    v_previous_activated_at :=
      v_registry.activated_at;

    v_previous_activated_by :=
      v_registry.activated_by;

    v_previous_retired_at :=
      v_registry.retired_at;

    v_previous_retired_by :=
      v_registry.retired_by;

    v_activation_kind :=
      'revalidation_activation';

    v_audit_action :=
      'route_risk_model.reactivated';

  else
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow model has unsupported evidence-cycle kind';
  end if;

  /*
   * Reconfirm immutable artifact identity.
   */
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

  /*
   * Resolve incumbent.
   */
  select
    registry.*
  into
    v_previous_active
  from public.route_risk_model_registry as registry
  where
    registry.organization_id =
      v_actor_org_id
    and registry.lifecycle_status =
      'active'
    and registry.id <>
      v_registry.id;

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
   * Close the exact shadow episode being consumed by this explicit human
   * lifecycle decision.
   */
  update public.route_risk_shadow_evidence_cycles
  set
    ended_at =
      v_activated_at,
    end_reason =
      case
        when v_cycle.cycle_kind =
          'initial_shadow'
        then
          'Activated by explicit owner/admin lifecycle decision.'
        else
          'Reactivated by explicit owner/admin lifecycle decision after revalidation shadow.'
      end
  where
    id = v_cycle.id
    and ended_at is null
  returning *
  into v_cycle;

  if not found then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk shadow evidence cycle could not be closed for activation';
  end if;

  /*
   * Retire incumbent first so the one-active-model unique invariant remains
   * valid throughout the transaction.
   */
  if v_previous_active_id is not null then

    update public.route_risk_model_registry
    set
      lifecycle_status =
        'retired',
      retired_at =
        v_activated_at,
      retired_by =
        v_actor_id,
      lifecycle_note =
        'Retired atomically during activation of route-risk model ' ||
        v_registry.id::text ||
        '. Activation rationale: ' ||
        v_rationale
    where id =
      v_previous_active_id
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
        'replacementEvidenceCycleId',
          v_cycle.id,
        'replacementEvidenceCycleKind',
          v_cycle.cycle_kind,
        'rationale',
          v_rationale
      )
    );

  end if;

  /*
   * Registry attribution represents current/latest lifecycle state.
   *
   * Initial activation populates activation attribution.
   *
   * Revalidation activation creates a new current activation attribution and
   * clears the previous retirement attribution. Previous values have already
   * been captured for immutable reactivation audit provenance.
   */
  update public.route_risk_model_registry
  set
    lifecycle_status =
      'active',
    activated_at =
      v_activated_at,
    activated_by =
      v_actor_id,
    retired_at =
      null,
    retired_by =
      null,
    lifecycle_note =
      v_rationale
  where id =
    v_registry.id
  returning *
  into v_registry;

  /*
   * One immutable audit event describes the activation episode.
   *
   * For initial activation, previous activation/retirement fields are NULL.
   * For revalidation activation, they contain the historical registry
   * attribution captured above.
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
    v_audit_action,
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

      'activationKind',
        v_activation_kind,

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

      'activatedBy',
        v_actor_id,

      'evidenceCycleId',
        v_cycle.id,

      'evidenceCycleNumber',
        v_cycle.cycle_number,

      'evidenceCycleKind',
        v_cycle.cycle_kind,

      'evidenceCycleEndedAt',
        v_cycle.ended_at,

      'previousActivatedAt',
        v_previous_activated_at,

      'previousActivatedBy',
        v_previous_activated_by,

      'previousRetiredAt',
        v_previous_retired_at,

      'previousRetiredBy',
        v_previous_retired_by,

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
        else
          to_jsonb(v_previous_active)
      end,

    'evidenceCycle',
      to_jsonb(v_cycle),

    'activationKind',
      v_activation_kind
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
  'Controlled HarborGuard owner/admin evidence-cycle-aware shadow-to-active route-risk model transition. Supports initial_shadow activation and revalidation_shadow reactivation, closes the consumed shadow evidence cycle atomically, preserves prior revalidation lifecycle attribution in immutable audit provenance, retires any incumbent atomically, and grants no automatic promotion, rollback, threshold-selection, retraining, or production Route Safety authority.';
