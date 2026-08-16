-- HarborGuard C-1E9B3B
--
-- Controlled human decision boundary for route-risk ML candidates.
--
-- Permitted transitions:
--
--   candidate -> approved
--   candidate -> rejected
--
-- This migration intentionally does NOT:
--
-- - enter shadow mode;
-- - activate a model;
-- - retire a model;
-- - select production evaluation thresholds;
-- - grant direct UPDATE access to the model registry;
-- - connect the model registry to Route Safety.
--
-- Approval requires persisted validation and test evaluations with
-- positive exampleCount values. Numeric quality thresholds are
-- intentionally deferred until representative real-world evidence
-- exists from which defensible promotion thresholds can be derived.
--
-- Rejection does not require valid evaluation evidence because an
-- invalid or unsuitable candidate must remain rejectable.

create or replace function public.decide_route_risk_model_candidate(
  p_registry_id uuid,
  p_decision text,
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

  v_decision text;
  v_rationale text;

  v_validation_example_count bigint;
  v_test_example_count bigint;

  v_now timestamptz;
  v_action text;
begin
  /*
   * Normalize only the command vocabulary and rationale whitespace.
   * No implicit lifecycle transition is inferred.
   */
  v_decision :=
    lower(
      btrim(
        coalesce(p_decision, '')
      )
    );

  v_rationale :=
    btrim(
      coalesce(p_rationale, '')
    );

  if p_registry_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk model registry id is required';
  end if;

  if v_decision not in (
    'approved',
    'rejected'
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk candidate decision must be approved or rejected';
  end if;

  if length(v_rationale) = 0 then
    raise exception
      using
        errcode = '22023',
        message =
          'route-risk candidate decision rationale is required';
  end if;

  /*
   * The authenticated Supabase identity is the lifecycle actor.
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
   * profiles is HarborGuard's authoritative organization + role source.
   *
   * Only organization owners/admins may make candidate decisions.
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
          'route-risk candidate decisions require owner or admin role';
  end if;

  /*
   * Lock the exact organization-owned registry row.
   *
   * The organization predicate prevents cross-organization lifecycle
   * mutation even though this is a SECURITY DEFINER function.
   */
  select
    registry.*
  into
    v_registry
  from public.route_risk_model_registry as registry
  where
    registry.id = p_registry_id
    and registry.organization_id = v_actor_org_id
  for update;

  if not found then
    raise exception
      using
        errcode = 'P0002',
        message =
          'route-risk candidate was not found or is not accessible';
  end if;

  /*
   * C-1E9B3B owns only the initial candidate decision.
   * Re-decisions and later lifecycle states are rejected.
   */
  if v_registry.lifecycle_status <> 'candidate' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model is no longer an undecided candidate';
  end if;

  /*
   * A candidate should not already carry historic decision attribution.
   * Fail closed instead of silently overwriting malformed lifecycle data.
   */
  if
    v_registry.approved_at is not null
    or v_registry.approved_by is not null
    or v_registry.rejected_at is not null
    or v_registry.rejected_by is not null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk candidate already contains decision attribution';
  end if;

  /*
   * The registry FK already binds training_run_id + organization_id.
   * Read the immutable training artifact explicitly so approval evidence
   * is evaluated inside the same transaction as the lifecycle decision.
   */
  select
    training.*
  into
    v_training
  from public.route_risk_training_runs as training
  where
    training.id = v_registry.training_run_id
    and training.organization_id = v_registry.organization_id;

  if not found then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk candidate training run is unavailable';
  end if;

  /*
   * Approval requires structurally valid held-out evaluation evidence.
   *
   * No numeric model-performance threshold is introduced here.
   */
  if v_decision = 'approved' then
    if
      not (
        v_training.validation_evaluation
          ? 'exampleCount'
      )
      or not (
        v_training.test_evaluation
          ? 'exampleCount'
      )
    then
      raise exception
        using
          errcode = '22023',
          message =
            'route-risk approval requires validation and test exampleCount evidence';
    end if;

    if
      coalesce(
        v_training.validation_evaluation
          ->> 'exampleCount',
        ''
      ) !~ '^[0-9]+$'
      or
      coalesce(
        v_training.test_evaluation
          ->> 'exampleCount',
        ''
      ) !~ '^[0-9]+$'
    then
      raise exception
        using
          errcode = '22023',
          message =
            'route-risk approval exampleCount evidence must be a non-negative integer';
    end if;

    v_validation_example_count :=
      (
        v_training.validation_evaluation
          ->> 'exampleCount'
      )::bigint;

    v_test_example_count :=
      (
        v_training.test_evaluation
          ->> 'exampleCount'
      )::bigint;

    if
      v_validation_example_count <= 0
      or v_test_example_count <= 0
    then
      raise exception
        using
          errcode = '22023',
          message =
            'route-risk approval requires positive validation and test example counts';
    end if;
  else
    /*
     * Rejection is intentionally possible even when evaluation evidence
     * is malformed or incomplete.
     */
    v_validation_example_count := null;
    v_test_example_count := null;
  end if;

  v_now :=
    now();

  if v_decision = 'approved' then
    update public.route_risk_model_registry
    set
      lifecycle_status = 'approved',
      approved_at = v_now,
      approved_by = v_actor_id,
      lifecycle_note = v_rationale
    where id = v_registry.id
    returning *
    into v_registry;

    v_action :=
      'route_risk_model.candidate_approved';
  else
    update public.route_risk_model_registry
    set
      lifecycle_status = 'rejected',
      rejected_at = v_now,
      rejected_by = v_actor_id,
      lifecycle_note = v_rationale
    where id = v_registry.id
    returning *
    into v_registry;

    v_action :=
      'route_risk_model.candidate_rejected';
  end if;

  /*
   * Audit insertion happens in this same database transaction.
   * If the audit record cannot be written, the lifecycle UPDATE rolls back.
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
    v_action,
    'route_risk_model_registry:' || v_registry.id::text,
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
        'candidate',
      'newLifecycleStatus',
        v_registry.lifecycle_status,
      'rationale',
        v_rationale,
      'validationExampleCount',
        v_validation_example_count,
      'testExampleCount',
        v_test_example_count
    )
  );

  return to_jsonb(v_registry);
end;
$$;

revoke all
on function public.decide_route_risk_model_candidate(
  uuid,
  text,
  text
)
from public;

revoke all
on function public.decide_route_risk_model_candidate(
  uuid,
  text,
  text
)
from anon;

revoke all
on function public.decide_route_risk_model_candidate(
  uuid,
  text,
  text
)
from service_role;

grant execute
on function public.decide_route_risk_model_candidate(
  uuid,
  text,
  text
)
to authenticated;

comment on function public.decide_route_risk_model_candidate(
  uuid,
  text,
  text
) is
  'C-1E9B3B controlled owner/admin decision boundary for route-risk ML candidates. Permits candidate-to-approved or candidate-to-rejected only, requires a nonblank rationale, requires positive validation/test example counts for approval, records immutable audit provenance, and does not activate models or affect Route Safety.';
