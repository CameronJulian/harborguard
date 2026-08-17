-- HarborGuard Model Health B5E
--
-- Controlled machine-side registration boundary:
--
--   immutable training run -> candidate registry row
--
-- This RPC exists only to register a completed HarborGuard offline
-- route-risk training artifact for later human lifecycle review.
--
-- This migration intentionally does NOT:
--
-- - approve or reject a candidate;
-- - enter shadow mode;
-- - activate or retire a model;
-- - select a production evaluation threshold;
-- - modify Route Safety scoring;
-- - grant direct INSERT/UPDATE/DELETE access to the registry.

create or replace function public.register_route_risk_model_candidate(
  p_training_run_id uuid,
  p_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_training public.route_risk_training_runs%rowtype;
  v_registry public.route_risk_model_registry%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception
      using
        errcode = '42501',
        message =
          'route-risk candidate registration requires service role';
  end if;

  if p_training_run_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk training run id is required';
  end if;

  if p_organization_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk organization id is required';
  end if;

  select
    training.*
  into
    v_training
  from public.route_risk_training_runs as training
  where
    training.id = p_training_run_id
    and training.organization_id = p_organization_id;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message =
          'route-risk training run was not found for organization';
  end if;

  /*
   * Attempt candidate registration atomically.
   *
   * training_run_id is unique in the registry. ON CONFLICT makes
   * concurrent or repeated registration attempts retry-safe without
   * weakening the direct-table mutation boundary.
   */
  insert into public.route_risk_model_registry (
    organization_id,
    training_run_id,
    lifecycle_status
  )
  values (
    v_training.organization_id,
    v_training.id,
    'candidate'
  )
  on conflict on constraint
    route_risk_model_registry_training_run_unique
  do nothing
  returning *
  into v_registry;

  /*
   * If this invocation did not insert the row, another registration
   * already owns this immutable training-run identity.
   *
   * Return that lifecycle record unchanged. Registration must never
   * regress or otherwise mutate a later lifecycle state.
   */
  if not found then
    select
      registry.*
    into
      v_registry
    from public.route_risk_model_registry as registry
    where
      registry.training_run_id =
        v_training.id;

    if not found then
      raise exception
        using
          errcode = '55000',
          message =
            'route-risk candidate registration conflict could not be resolved';
    end if;

    if
      v_registry.organization_id <>
        v_training.organization_id
    then
      raise exception
        using
          errcode = '55000',
          message =
            'route-risk model registry organization does not match training run';
    end if;

    return to_jsonb(v_registry);
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    target,
    metadata
  )
  values (
    v_registry.organization_id,
    null,
    'route_risk_model.candidate_registered',
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
      'newLifecycleStatus',
        'candidate',
      'registrationAuthority',
        'service_role'
    )
  );

  return to_jsonb(v_registry);
end;
$$;

revoke all
on function public.register_route_risk_model_candidate(
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute
on function public.register_route_risk_model_candidate(
  uuid,
  uuid
)
to service_role;

comment on function public.register_route_risk_model_candidate(
  uuid,
  uuid
) is
  'Controlled service-role registration boundary for completed HarborGuard route-risk training artifacts. Creates at most one candidate lifecycle row per immutable training run, is retry-safe, records audit provenance, and does not approve, shadow, activate, retire, or affect Route Safety.';
