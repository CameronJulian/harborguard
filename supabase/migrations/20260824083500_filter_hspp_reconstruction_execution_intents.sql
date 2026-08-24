-- ============================================================================
-- Q14ag31O
-- Starvation-safe persistence-state filtering for the canonical durable
-- reconstruction execution-intent discovery authority.
--
-- This successor migration deliberately leaves the deployed Q14ag31E migration
-- immutable.
--
-- null p_persistence_state:
--   preserves the existing bounded generic both-state discovery behavior.
--
-- non-null p_persistence_state:
--   observes and derives lifecycle state before applying the bounded LIMIT so
--   persisted rows cannot consume a CLAIMED_NOT_PERSISTED runnable page.
--
-- This migration does NOT:
-- - claim or mutate execution intents;
-- - execute Q14ag31M;
-- - execute Q14h;
-- - create or seal H2;
-- - mutate trust / Reservoir state;
-- - create API, cron, queue or scheduler activation.
-- ============================================================================

begin;


-- Remove the deployed four-argument signature so PostgREST/Supabase never sees
-- ambiguous same-name overloads after the successor authority is installed.
drop function if exists
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid
  );


create or replace function
  public.read_hspp_reconstruction_execution_intents(
    p_organization_id uuid,
    p_limit integer default 100,
    p_before_created_at timestamptz default null,
    p_before_intent_id uuid default null,
    p_persistence_state text default null
  )
returns table (
  intent_id uuid,
  organization_id uuid,
  child_assembly_id uuid,

  selected_first_evidence_id uuid,
  selected_second_evidence_id uuid,

  historical_evidence_id uuid,
  historical_evidence_integrity_fingerprint text,

  replacement_evidence_id uuid,
  replacement_evidence_integrity_fingerprint text,

  discovery_policy_version text,
  reevaluation_policy_version text,
  membership_policy_version text,
  reconstruction_policy_version text,
  reconstruction_reason text,

  intent_version text,
  created_at timestamptz,

  persistence_state text,

  reconstruction_id uuid,
  parent_assembly_id uuid,

  assembly_state text,
  sealed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_contradiction boolean;
begin

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;


  if
    p_limit is null
    or p_limit < 1
    or p_limit > 100
  then
    raise exception
      'p_limit must be between 1 and 100';
  end if;


  if
    (
      p_before_created_at is null
      and p_before_intent_id is not null
    )
    or
    (
      p_before_created_at is not null
      and p_before_intent_id is null
    )
  then
    raise exception
      'Reconstruction intent discovery cursor requires both created_at and intent_id';
  end if;


  if
    p_persistence_state is not null
    and p_persistence_state not in (
      'CLAIMED_NOT_PERSISTED',
      'RECONSTRUCTION_PERSISTED'
    )
  then
    raise exception
      'p_persistence_state must be null, CLAIMED_NOT_PERSISTED, or RECONSTRUCTION_PERSISTED';
  end if;


  /*
   * Q14ag31O GENERIC NULL-FILTER COMPATIBILITY BRANCH
   *
   * Preserve Q14ag31E semantics exactly when no state filter is supplied:
   * bound the page first, observe that page, fail closed on contradictions,
   * then return both lifecycle states.
   */
  if p_persistence_state is null then

    with intent_page as (

      select
        intent.id
          as intent_id,

        intent.organization_id
          as intent_organization_id,

        intent.child_assembly_id,

        intent.selected_first_evidence_id,
        intent.selected_second_evidence_id,

        intent.historical_evidence_id,
        intent.historical_evidence_integrity_fingerprint,

        intent.replacement_evidence_id,
        intent.replacement_evidence_integrity_fingerprint,

        intent.discovery_policy_version,
        intent.reevaluation_policy_version,
        intent.membership_policy_version,
        intent.reconstruction_policy_version,
        intent.reconstruction_reason,

        intent.intent_version,
        intent.created_at

      from
        public.hspp_reconstruction_execution_intents
          as intent

      where
        intent.organization_id =
          p_organization_id

        and (
          p_before_created_at is null

          or intent.created_at <
            p_before_created_at

          or (
            intent.created_at =
              p_before_created_at

            and intent.id <
              p_before_intent_id
          )
        )

      order by
        intent.created_at desc,
        intent.id desc

      limit p_limit
    ),

    observed as (

      select
        intent_page.*,

        child_assembly.id
          as observed_child_id,

        child_assembly.organization_id
          as observed_child_organization_id,

        child_assembly.membership_policy_version
          as observed_child_membership_policy_version,

        child_assembly.assembly_state
          as observed_assembly_state,

        child_assembly.sealed_at
          as observed_sealed_at,

        reconstruction.id
          as observed_reconstruction_id,

        reconstruction.organization_id
          as observed_reconstruction_organization_id,

        reconstruction.parent_assembly_id
          as observed_parent_assembly_id,

        reconstruction.reconstruction_policy_version
          as observed_reconstruction_policy_version,

        reconstruction.reconstruction_reason
          as observed_reconstruction_reason

      from
        intent_page

      left join
        public.hspp_evidence_assemblies
          as child_assembly
        on
          child_assembly.id =
            intent_page.child_assembly_id

      left join
        public.hspp_evidence_assembly_reconstructions
          as reconstruction
        on
          reconstruction.child_assembly_id =
            intent_page.child_assembly_id
    )

    select
      exists (
        select
          1
        from
          observed
        where

          (
            observed.observed_child_id is null
          ) <> (
            observed.observed_reconstruction_id is null
          )

          or (
            observed.observed_child_id is not null

            and (
              observed.observed_child_organization_id
                is distinct from
                observed.intent_organization_id

              or
              observed.observed_reconstruction_organization_id
                is distinct from
                observed.intent_organization_id

              or
              observed.observed_child_membership_policy_version
                is distinct from
                observed.membership_policy_version

              or
              observed.observed_reconstruction_policy_version
                is distinct from
                observed.reconstruction_policy_version

              or
              observed.observed_reconstruction_reason
                is distinct from
                observed.reconstruction_reason

              or
              observed.observed_assembly_state
                not in (
                  'OPEN',
                  'SEALED'
                )

              or (
                observed.observed_assembly_state =
                  'OPEN'

                and observed.observed_sealed_at
                  is not null
              )

              or (
                observed.observed_assembly_state =
                  'SEALED'

                and observed.observed_sealed_at
                  is null
              )
            )
          )
      )
    into
      v_has_contradiction;


    if v_has_contradiction then
      raise exception
        'Durable reconstruction intent has contradictory child/reconstruction persistence state';
    end if;


    return query

    with intent_page as (

      select
        intent.id
          as intent_id,

        intent.organization_id
          as intent_organization_id,

        intent.child_assembly_id,

        intent.selected_first_evidence_id,
        intent.selected_second_evidence_id,

        intent.historical_evidence_id,
        intent.historical_evidence_integrity_fingerprint,

        intent.replacement_evidence_id,
        intent.replacement_evidence_integrity_fingerprint,

        intent.discovery_policy_version,
        intent.reevaluation_policy_version,
        intent.membership_policy_version,
        intent.reconstruction_policy_version,
        intent.reconstruction_reason,

        intent.intent_version,
        intent.created_at

      from
        public.hspp_reconstruction_execution_intents
          as intent

      where
        intent.organization_id =
          p_organization_id

        and (
          p_before_created_at is null

          or intent.created_at <
            p_before_created_at

          or (
            intent.created_at =
              p_before_created_at

            and intent.id <
              p_before_intent_id
          )
        )

      order by
        intent.created_at desc,
        intent.id desc

      limit p_limit
    ),

    observed as (

      select
        intent_page.*,

        child_assembly.id
          as observed_child_id,

        child_assembly.organization_id
          as observed_child_organization_id,

        child_assembly.membership_policy_version
          as observed_child_membership_policy_version,

        child_assembly.assembly_state
          as observed_assembly_state,

        child_assembly.sealed_at
          as observed_sealed_at,

        reconstruction.id
          as observed_reconstruction_id,

        reconstruction.organization_id
          as observed_reconstruction_organization_id,

        reconstruction.parent_assembly_id
          as observed_parent_assembly_id,

        reconstruction.reconstruction_policy_version
          as observed_reconstruction_policy_version,

        reconstruction.reconstruction_reason
          as observed_reconstruction_reason

      from
        intent_page

      left join
        public.hspp_evidence_assemblies
          as child_assembly
        on
          child_assembly.id =
            intent_page.child_assembly_id

      left join
        public.hspp_evidence_assembly_reconstructions
          as reconstruction
        on
          reconstruction.child_assembly_id =
            intent_page.child_assembly_id
    )

    select
      observed.intent_id,
      observed.intent_organization_id,
      observed.child_assembly_id,

      observed.selected_first_evidence_id,
      observed.selected_second_evidence_id,

      observed.historical_evidence_id,
      observed.historical_evidence_integrity_fingerprint,

      observed.replacement_evidence_id,
      observed.replacement_evidence_integrity_fingerprint,

      observed.discovery_policy_version,
      observed.reevaluation_policy_version,
      observed.membership_policy_version,
      observed.reconstruction_policy_version,
      observed.reconstruction_reason,

      observed.intent_version,
      observed.created_at,

      case
        when observed.observed_child_id is null then
          'CLAIMED_NOT_PERSISTED'::text
        else
          'RECONSTRUCTION_PERSISTED'::text
      end,

      observed.observed_reconstruction_id,
      observed.observed_parent_assembly_id,

      observed.observed_assembly_state,
      observed.observed_sealed_at

    from
      observed

    order by
      observed.created_at desc,
      observed.intent_id desc;


    return;
  end if;


  /*
   * Q14ag31O STARVATION-SAFE FILTERED BRANCH
   *
   * Observe and validate every intent in the organization/cursor scope before
   * applying the lifecycle-state filter and bounded LIMIT.
   *
   * This prevents already-persisted rows from occupying a runnable
   * CLAIMED_NOT_PERSISTED page.
   */
  with candidate_scope as (

    select
      intent.id
        as intent_id,

      intent.organization_id
        as intent_organization_id,

      intent.child_assembly_id,

      intent.selected_first_evidence_id,
      intent.selected_second_evidence_id,

      intent.historical_evidence_id,
      intent.historical_evidence_integrity_fingerprint,

      intent.replacement_evidence_id,
      intent.replacement_evidence_integrity_fingerprint,

      intent.discovery_policy_version,
      intent.reevaluation_policy_version,
      intent.membership_policy_version,
      intent.reconstruction_policy_version,
      intent.reconstruction_reason,

      intent.intent_version,
      intent.created_at

    from
      public.hspp_reconstruction_execution_intents
        as intent

    where
      intent.organization_id =
        p_organization_id

      and (
        p_before_created_at is null

        or intent.created_at <
          p_before_created_at

        or (
          intent.created_at =
            p_before_created_at

          and intent.id <
            p_before_intent_id
        )
      )
  ),

  observed as (

    select
      candidate_scope.*,

      child_assembly.id
        as observed_child_id,

      child_assembly.organization_id
        as observed_child_organization_id,

      child_assembly.membership_policy_version
        as observed_child_membership_policy_version,

      child_assembly.assembly_state
        as observed_assembly_state,

      child_assembly.sealed_at
        as observed_sealed_at,

      reconstruction.id
        as observed_reconstruction_id,

      reconstruction.organization_id
        as observed_reconstruction_organization_id,

      reconstruction.parent_assembly_id
        as observed_parent_assembly_id,

      reconstruction.reconstruction_policy_version
        as observed_reconstruction_policy_version,

      reconstruction.reconstruction_reason
        as observed_reconstruction_reason

    from
      candidate_scope

    left join
      public.hspp_evidence_assemblies
        as child_assembly
      on
        child_assembly.id =
          candidate_scope.child_assembly_id

    left join
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
      on
        reconstruction.child_assembly_id =
          candidate_scope.child_assembly_id
  )

  select
    exists (
      select
        1
      from
        observed
      where

        (
          observed.observed_child_id is null
        ) <> (
          observed.observed_reconstruction_id is null
        )

        or (
          observed.observed_child_id is not null

          and (
            observed.observed_child_organization_id
              is distinct from
              observed.intent_organization_id

            or
            observed.observed_reconstruction_organization_id
              is distinct from
              observed.intent_organization_id

            or
            observed.observed_child_membership_policy_version
              is distinct from
              observed.membership_policy_version

            or
            observed.observed_reconstruction_policy_version
              is distinct from
              observed.reconstruction_policy_version

            or
            observed.observed_reconstruction_reason
              is distinct from
              observed.reconstruction_reason

            or
            observed.observed_assembly_state
              not in (
                'OPEN',
                'SEALED'
              )

            or (
              observed.observed_assembly_state =
                'OPEN'

              and observed.observed_sealed_at
                is not null
            )

            or (
              observed.observed_assembly_state =
                'SEALED'

              and observed.observed_sealed_at
                is null
            )
          )
        )
    )
  into
    v_has_contradiction;


  if v_has_contradiction then
    raise exception
      'Durable reconstruction intent has contradictory child/reconstruction persistence state';
  end if;


  /*
   * Q14ag31O FILTERED RETURN PAGE
   *
   * State derivation and filtering occur before LIMIT.
   */
  return query

  with candidate_scope as (

    select
      intent.id
        as intent_id,

      intent.organization_id
        as intent_organization_id,

      intent.child_assembly_id,

      intent.selected_first_evidence_id,
      intent.selected_second_evidence_id,

      intent.historical_evidence_id,
      intent.historical_evidence_integrity_fingerprint,

      intent.replacement_evidence_id,
      intent.replacement_evidence_integrity_fingerprint,

      intent.discovery_policy_version,
      intent.reevaluation_policy_version,
      intent.membership_policy_version,
      intent.reconstruction_policy_version,
      intent.reconstruction_reason,

      intent.intent_version,
      intent.created_at

    from
      public.hspp_reconstruction_execution_intents
        as intent

    where
      intent.organization_id =
        p_organization_id

      and (
        p_before_created_at is null

        or intent.created_at <
          p_before_created_at

        or (
          intent.created_at =
            p_before_created_at

          and intent.id <
            p_before_intent_id
        )
      )
  ),

  observed as (

    select
      candidate_scope.*,

      child_assembly.id
        as observed_child_id,

      child_assembly.organization_id
        as observed_child_organization_id,

      child_assembly.membership_policy_version
        as observed_child_membership_policy_version,

      child_assembly.assembly_state
        as observed_assembly_state,

      child_assembly.sealed_at
        as observed_sealed_at,

      reconstruction.id
        as observed_reconstruction_id,

      reconstruction.organization_id
        as observed_reconstruction_organization_id,

      reconstruction.parent_assembly_id
        as observed_parent_assembly_id,

      reconstruction.reconstruction_policy_version
        as observed_reconstruction_policy_version,

      reconstruction.reconstruction_reason
        as observed_reconstruction_reason

    from
      candidate_scope

    left join
      public.hspp_evidence_assemblies
        as child_assembly
      on
        child_assembly.id =
          candidate_scope.child_assembly_id

    left join
      public.hspp_evidence_assembly_reconstructions
        as reconstruction
      on
        reconstruction.child_assembly_id =
          candidate_scope.child_assembly_id
  ),

  classified as (

    select
      observed.*,

      case
        when observed.observed_child_id is null then
          'CLAIMED_NOT_PERSISTED'::text
        else
          'RECONSTRUCTION_PERSISTED'::text
      end
        as derived_persistence_state

    from
      observed
  )

  select
    classified.intent_id,
    classified.intent_organization_id,
    classified.child_assembly_id,

    classified.selected_first_evidence_id,
    classified.selected_second_evidence_id,

    classified.historical_evidence_id,
    classified.historical_evidence_integrity_fingerprint,

    classified.replacement_evidence_id,
    classified.replacement_evidence_integrity_fingerprint,

    classified.discovery_policy_version,
    classified.reevaluation_policy_version,
    classified.membership_policy_version,
    classified.reconstruction_policy_version,
    classified.reconstruction_reason,

    classified.intent_version,
    classified.created_at,

    classified.derived_persistence_state,

    classified.observed_reconstruction_id,
    classified.observed_parent_assembly_id,

    classified.observed_assembly_state,
    classified.observed_sealed_at

  from
    classified

  where
    classified.derived_persistence_state =
      p_persistence_state

  order by
    classified.created_at desc,
    classified.intent_id desc

  limit p_limit;

end;
$$;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from public;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from anon;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from authenticated;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
from service_role;


grant execute
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid,
    text
  )
to service_role;


commit;