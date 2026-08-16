-- HarborGuard C-1E9B4B
--
-- Controlled lifecycle transition:
--
--   approved -> shadow
--
-- This migration intentionally does NOT:
--
-- - perform ML shadow inference;
-- - write shadow prediction observations;
-- - activate a model;
-- - retire a model;
-- - alter production Route Safety scoring;
-- - grant direct UPDATE access to the model registry.
--
-- Entering shadow means only that an explicitly approved model has
-- entered the lifecycle phase in which future parallel observation
-- infrastructure may evaluate it without affecting production routing.

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

  /*
   * Human lifecycle actor.
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
   * profiles remains HarborGuard's authoritative organization and
   * application-role source.
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
          'route-risk shadow transitions require owner or admin role';
  end if;

  /*
   * Lock the exact organization-owned lifecycle record so concurrent
   * attempts cannot race the same approved model into later states.
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
          'route-risk model was not found or is not accessible';
  end if;

  /*
   * C-1E9B4B owns exactly one transition.
   */
  if v_registry.lifecycle_status <> 'approved' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model must be approved before entering shadow';
  end if;

  /*
   * Approval provenance must already exist.
   */
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

  /*
   * Fail closed on incompatible historical lifecycle attribution.
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
   * Reconfirm the immutable training artifact still exists and belongs
   * to the same organization before lifecycle advancement.
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

  v_shadow_started_at :=
    now();

  update public.route_risk_model_registry
  set
    lifecycle_status = 'shadow',
    shadow_started_at = v_shadow_started_at,
    lifecycle_note = v_rationale
  where id = v_registry.id
  returning *
  into v_registry;

  /*
   * Lifecycle mutation and immutable provenance are atomic.
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
  'C-1E9B4B controlled owner/admin approved-to-shadow lifecycle transition. It records shadow lifecycle provenance atomically but does not perform shadow inference, activate a model, or modify production Route Safety.';
