-- HarborGuard B5Q
--
-- Controlled human lifecycle transition:
--
--   active -> retired
--
-- This primitive exists so HarborGuard can explicitly remove an active
-- route-risk model from lifecycle service without requiring a replacement
-- model to be activated at the same time.
--
-- This migration intentionally does NOT:
--
-- - select a replacement model;
-- - reactivate a previously retired model;
-- - automatically perform rollback;
-- - calculate promotion readiness;
-- - trigger retraining;
-- - schedule retirement;
-- - load or unload a model inside Route Safety;
-- - alter production Route Safety scoring, rerouting, escalation, or
--   recommendations;
-- - grant direct UPDATE access to the registry.
--
-- Production Route Safety remains independent of lifecycle registry state.

create or replace function public.retire_route_risk_model(
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

  v_rationale text;
  v_retired_at timestamptz;
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
          'route-risk model retirement rationale is required';
  end if;

  /*
   * Retirement is an explicit authenticated human lifecycle action.
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
          'route-risk model retirement requires owner or admin role';
  end if;

  /*
   * Serialize model lifecycle mutation within the organization.
   */
  perform registry.id
  from public.route_risk_model_registry as registry
  where registry.organization_id = v_actor_org_id
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
   * This RPC owns exactly active -> retired.
   */
  if v_registry.lifecycle_status <> 'active' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model must be active before retirement';
  end if;

  /*
   * An active model must have complete activation provenance.
   */
  if
    v_registry.approved_at is null
    or v_registry.approved_by is null
    or v_registry.shadow_started_at is null
    or v_registry.activated_at is null
    or v_registry.activated_by is null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'active route-risk model is missing prerequisite lifecycle attribution';
  end if;

  /*
   * Contradictory retirement state fails closed.
   */
  if
    v_registry.rejected_at is not null
    or v_registry.rejected_by is not null
    or v_registry.retired_at is not null
    or v_registry.retired_by is not null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'active route-risk model contains incompatible lifecycle attribution';
  end if;

  /*
   * Reconfirm immutable training artifact identity before lifecycle change.
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
          'active route-risk model training artifact is unavailable';
  end if;

  v_retired_at :=
    now();

  update public.route_risk_model_registry
  set
    lifecycle_status = 'retired',
    retired_at = v_retired_at,
    retired_by = v_actor_id,
    lifecycle_note = v_rationale
  where id = v_registry.id
  returning *
  into v_registry;

  /*
   * Immutable retirement audit provenance is committed atomically with
   * the registry lifecycle mutation.
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
    'route_risk_model.retired',
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
        'active',
      'newLifecycleStatus',
        'retired',
      'activatedAt',
        v_registry.activated_at,
      'activatedBy',
        v_registry.activated_by,
      'retiredAt',
        v_retired_at,
      'retiredBy',
        v_actor_id,
      'rationale',
        v_rationale
    )
  );

  return to_jsonb(v_registry);
end;
$$;

revoke all
on function public.retire_route_risk_model(
  uuid,
  text
)
from public;

revoke all
on function public.retire_route_risk_model(
  uuid,
  text
)
from anon;

revoke all
on function public.retire_route_risk_model(
  uuid,
  text
)
from service_role;

grant execute
on function public.retire_route_risk_model(
  uuid,
  text
)
to authenticated;

comment on function public.retire_route_risk_model(
  uuid,
  text
) is
  'Controlled HarborGuard owner/admin active-to-retired route-risk model lifecycle transition with immutable audit provenance. Does not select a replacement, reactivate retired models, perform automatic rollback, trigger retraining, or connect registry state to Route Safety inference.';
