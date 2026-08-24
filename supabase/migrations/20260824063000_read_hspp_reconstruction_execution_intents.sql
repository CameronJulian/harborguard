-- ============================================================================
-- Q14ag31E
-- Durable reconstruction execution-intent discovery authority.
--
-- Purpose:
-- - discover already-claimed immutable reconstruction execution intents after
--   process loss without rerunning mutable Reservoir / B07B selection;
-- - derive Q14h persistence state from canonical child/reconstruction state;
-- - preserve immutable intent provenance;
-- - support bounded deterministic keyset pagination.
--
-- This migration does NOT:
-- - mutate durable intent rows;
-- - execute Q14h reconstruction;
-- - seal or assess HSPP assemblies;
-- - mutate trust / Reservoir state;
-- - create API, cron, queue or scheduler activation.
-- ============================================================================

begin;


create index if not exists
  hspp_recon_intent_org_created_id_desc_idx
on
  public.hspp_reconstruction_execution_intents (
    organization_id,
    created_at desc,
    id desc
  );


create or replace function
  public.read_hspp_reconstruction_execution_intents(
    p_organization_id uuid,
    p_limit integer default 100,
    p_before_created_at timestamptz default null,
    p_before_intent_id uuid default null
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


  /*
   * Inspect only the requested bounded intent page.
   *
   * An intent is valid in one of two observable states:
   *
   * CLAIMED_NOT_PERSISTED
   *   - no HSPP child assembly exists;
   *   - no reconstruction provenance exists.
   *
   * RECONSTRUCTION_PERSISTED
   *   - child assembly exists;
   *   - reconstruction provenance exists;
   *   - durable policy identity agrees with the immutable intent.
   *
   * Any partial or identity-conflicting state fails closed.
   */
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

end;
$$;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid
  )
from public;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid
  )
from anon;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid
  )
from authenticated;


revoke all
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid
  )
from service_role;


grant execute
on function
  public.read_hspp_reconstruction_execution_intents(
    uuid,
    integer,
    timestamptz,
    uuid
  )
to service_role;


commit;
