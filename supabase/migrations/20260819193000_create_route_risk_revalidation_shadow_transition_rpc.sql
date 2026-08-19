-- HarborGuard ML lifecycle recovery infrastructure
--
-- Controlled human lifecycle transition:
--
--   retired -> shadow
--
-- This transition starts a NEW revalidation shadow evidence episode for
-- one explicitly selected retired route-risk model.
--
-- Historical activation and retirement attribution is preserved.
--
-- This migration intentionally does NOT:
--
-- - clear activated_at / activated_by;
-- - clear retired_at / retired_by;
-- - reactivate the model;
-- - automatically perform rollback;
-- - select a replacement model;
-- - calculate promotion readiness;
-- - trigger retraining;
-- - select production thresholds;
-- - load the model into production Route Safety;
-- - alter Route Safety scoring, rerouting, escalation, or recommendations.
--
-- Any later reactivation remains a separate explicitly controlled lifecycle
-- decision.

create or replace function public.start_route_risk_model_revalidation_shadow(
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
  v_cycle_number integer;
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
          'route-risk revalidation shadow rationale is required';
  end if;

  /*
   * Revalidation is an explicit authenticated human lifecycle action.
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
          'route-risk revalidation shadow transition requires owner or admin role';
  end if;

  /*
   * Serialize lifecycle mutation within this organization.
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
   * This RPC owns exactly retired -> shadow.
   */
  if v_registry.lifecycle_status <> 'retired' then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model must be retired before entering revalidation shadow';
  end if;

  /*
   * Revalidation is only valid for a model with complete historical
   * approval, initial shadow, activation and retirement provenance.
   */
  if
    v_registry.approved_at is null
    or v_registry.approved_by is null
    or v_registry.shadow_started_at is null
    or v_registry.activated_at is null
    or v_registry.activated_by is null
    or v_registry.retired_at is null
    or v_registry.retired_by is null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'retired route-risk model is missing historical lifecycle attribution';
  end if;

  if
    v_registry.rejected_at is not null
    or v_registry.rejected_by is not null
  then
    raise exception
      using
        errcode = '55000',
        message =
          'retired route-risk model contains incompatible rejection attribution';
  end if;

  /*
   * There must not already be an open evidence cycle.
   */
  if exists (
    select 1
    from public.route_risk_shadow_evidence_cycles as cycle
    where
      cycle.model_registry_id =
        v_registry.id
      and cycle.ended_at is null
  ) then
    raise exception
      using
        errcode = '55000',
        message =
          'route-risk model already has an open shadow evidence cycle';
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
          'retired route-risk model training artifact is unavailable';
  end if;

  /*
   * New cycle number is monotonic for this exact model registry identity.
   */
  select
    coalesce(
      max(cycle.cycle_number),
      0
    ) + 1
  into
    v_cycle_number
  from public.route_risk_shadow_evidence_cycles as cycle
  where
    cycle.model_registry_id =
      v_registry.id;

  if v_cycle_number <= 1 then
    raise exception
      using
        errcode = '55000',
        message =
          'retired route-risk model is missing prior shadow evidence-cycle history';
  end if;

  v_shadow_started_at :=
    now();

  /*
   * Historical activated_* and retired_* fields are intentionally NOT
   * changed. They remain provenance describing the prior lifecycle episode.
   */
  update public.route_risk_model_registry
  set
    lifecycle_status = 'shadow',
    shadow_started_at =
      v_shadow_started_at,
    lifecycle_note =
      v_rationale
  where id =
    v_registry.id
  returning *
  into v_registry;

  /*
   * Create the new episode identity atomically with lifecycle re-entry.
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
    v_cycle_number,
    'revalidation_shadow',
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
    'route_risk_model.revalidation_shadow_started',
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
        'retired',
      'newLifecycleStatus',
        'shadow',
      'previousActivatedAt',
        v_registry.activated_at,
      'previousActivatedBy',
        v_registry.activated_by,
      'previousRetiredAt',
        v_registry.retired_at,
      'previousRetiredBy',
        v_registry.retired_by,
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

  return jsonb_build_object(
    'registry',
      to_jsonb(v_registry),
    'evidenceCycle',
      to_jsonb(v_cycle)
  );
end;
$$;

revoke all
on function public.start_route_risk_model_revalidation_shadow(
  uuid,
  text
)
from public;

revoke all
on function public.start_route_risk_model_revalidation_shadow(
  uuid,
  text
)
from anon;

revoke all
on function public.start_route_risk_model_revalidation_shadow(
  uuid,
  text
)
from service_role;

grant execute
on function public.start_route_risk_model_revalidation_shadow(
  uuid,
  text
)
to authenticated;

comment on function public.start_route_risk_model_revalidation_shadow(
  uuid,
  text
) is
  'Controlled HarborGuard owner/admin retired-to-shadow lifecycle transition that starts a new revalidation_shadow evidence cycle while preserving prior activation and retirement provenance. It does not reactivate the model, automatically perform rollback, select production thresholds, trigger retraining, or affect production Route Safety.';
