-- HarborGuard HSPP provider assessment batch persistence.
--
-- This boundary preserves the generic single-row assessment invariants while
-- allowing provider ingestion to persist a bounded set of decisions in one
-- PostgreSQL transaction and one client/database round trip.
--
-- It does not replace applyHsppAssessmentDecision().
-- It does not perform assessment calculation.
-- It does not create evidence.
-- It does not grant downstream authority.

create or replace function
public.apply_hspp_assessment_decisions_batch(
  p_organization_id uuid,
  p_decisions jsonb
)
returns table (
  evidence_id uuid,
  trust_state text,
  operational_eligible boolean,
  crowd_eligible boolean,
  training_eligible boolean,
  validation_eligible boolean,
  assessment_policy_version text,
  assessment_reason text,
  assessed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_decision jsonb;

  v_expected_count integer;
  v_distinct_count integer;
  v_applied_count integer := 0;

  v_evidence_id uuid;
  v_integrity_fingerprint text;

  v_trust_state text;

  v_operational_eligible boolean;
  v_crowd_eligible boolean;
  v_training_eligible boolean;
  v_validation_eligible boolean;

  v_policy_version text;
  v_reason text;

  v_assessed_at timestamptz;

  v_lock_evidence_id uuid;

  v_applied public.hspp_evidence%rowtype;
begin

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if
    p_decisions is null
    or jsonb_typeof(p_decisions) <> 'array'
  then
    raise exception
      'p_decisions must be a JSON array';
  end if;

  v_expected_count :=
    jsonb_array_length(p_decisions);

  if v_expected_count = 0 then
    return;
  end if;

  select
    count(
      distinct item.value ->> 'evidenceId'
    )::integer
  into
    v_distinct_count
  from
    jsonb_array_elements(p_decisions)
      as item(value);

  if v_distinct_count <> v_expected_count then
    raise exception
      'HSPP assessment batch cannot contain duplicate evidence identities';
  end if;

  -- Validate the complete batch before any mutation.
  for v_decision in
    select value
    from jsonb_array_elements(p_decisions)
  loop

    if jsonb_typeof(v_decision) <> 'object' then
      raise exception
        'Every HSPP assessment batch decision must be a JSON object';
    end if;

    begin
      v_evidence_id :=
        (
          v_decision ->> 'evidenceId'
        )::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Every HSPP assessment batch evidenceId must be a UUID';
    end;

    if v_evidence_id is null then
      raise exception
        'Every HSPP assessment batch decision requires evidenceId';
    end if;

    v_integrity_fingerprint :=
      trim(
        coalesce(
          v_decision ->> 'integrityFingerprint',
          ''
        )
      );

    if
      v_integrity_fingerprint !~
        '^[0-9a-f]{64}$'
    then
      raise exception
        'Every HSPP assessment batch integrityFingerprint must be a lowercase SHA-256 fingerprint';
    end if;

    v_trust_state :=
      trim(
        coalesce(
          v_decision ->> 'trustState',
          ''
        )
      );

    if
      v_trust_state not in (
        'UNASSESSED',
        'PLAUSIBLE',
        'CORROBORATED',
        'VERIFIED'
      )
    then
      raise exception
        'Every HSPP assessment batch trustState is invalid';
    end if;

    if not (
      v_decision ? 'operationalEligible'
      and jsonb_typeof(
        v_decision -> 'operationalEligible'
      ) = 'boolean'
    ) then
      raise exception
        'Every HSPP assessment batch operationalEligible must be boolean';
    end if;

    if not (
      v_decision ? 'crowdEligible'
      and jsonb_typeof(
        v_decision -> 'crowdEligible'
      ) = 'boolean'
    ) then
      raise exception
        'Every HSPP assessment batch crowdEligible must be boolean';
    end if;

    if not (
      v_decision ? 'trainingEligible'
      and jsonb_typeof(
        v_decision -> 'trainingEligible'
      ) = 'boolean'
    ) then
      raise exception
        'Every HSPP assessment batch trainingEligible must be boolean';
    end if;

    if not (
      v_decision ? 'validationEligible'
      and jsonb_typeof(
        v_decision -> 'validationEligible'
      ) = 'boolean'
    ) then
      raise exception
        'Every HSPP assessment batch validationEligible must be boolean';
    end if;

    v_policy_version :=
      trim(
        coalesce(
          v_decision ->> 'policyVersion',
          ''
        )
      );

    if v_policy_version = '' then
      raise exception
        'Every HSPP assessment batch policyVersion is required';
    end if;

    v_reason :=
      trim(
        coalesce(
          v_decision ->> 'reason',
          ''
        )
      );

    if v_reason = '' then
      raise exception
        'Every HSPP assessment batch reason is required';
    end if;

    begin
      v_assessed_at :=
        (
          v_decision ->> 'assessedAt'
        )::timestamptz;
    exception
      when invalid_datetime_format then
        raise exception
          'Every HSPP assessment batch assessedAt must be a valid timestamp';
    end;

    if v_assessed_at is null then
      raise exception
        'Every HSPP assessment batch assessedAt is required';
    end if;

  end loop;

  -- Lock evidence identities in deterministic order.
  for v_lock_evidence_id in
    select
      distinct (
        item.value ->> 'evidenceId'
      )::uuid
    from
      jsonb_array_elements(p_decisions)
        as item(value)
    order by
      1
  loop

    perform
      pg_advisory_xact_lock(
        hashtextextended(
          'harborguard:hspp-assessment:' ||
          p_organization_id::text ||
          ':' ||
          v_lock_evidence_id::text,
          0
        )
      );

  end loop;

  -- Apply each decision inside this one PostgreSQL transaction.
  for v_decision in
    select value
    from jsonb_array_elements(p_decisions)
  loop

    v_evidence_id :=
      (
        v_decision ->> 'evidenceId'
      )::uuid;

    v_integrity_fingerprint :=
      trim(
        v_decision ->> 'integrityFingerprint'
      );

    v_trust_state :=
      trim(
        v_decision ->> 'trustState'
      );

    v_operational_eligible :=
      (
        v_decision ->> 'operationalEligible'
      )::boolean;

    v_crowd_eligible :=
      (
        v_decision ->> 'crowdEligible'
      )::boolean;

    v_training_eligible :=
      (
        v_decision ->> 'trainingEligible'
      )::boolean;

    v_validation_eligible :=
      (
        v_decision ->> 'validationEligible'
      )::boolean;

    v_policy_version :=
      trim(
        v_decision ->> 'policyVersion'
      );

    v_reason :=
      trim(
        v_decision ->> 'reason'
      );

    v_assessed_at :=
      (
        v_decision ->> 'assessedAt'
      )::timestamptz;

    update
      public.hspp_evidence as evidence
    set
      trust_state =
        v_trust_state,

      operational_eligible =
        v_operational_eligible,

      crowd_eligible =
        v_crowd_eligible,

      training_eligible =
        v_training_eligible,

      validation_eligible =
        v_validation_eligible,

      assessment_policy_version =
        v_policy_version,

      assessment_reason =
        v_reason,

      assessed_at =
        v_assessed_at

    where
      evidence.organization_id =
        p_organization_id

      and evidence.id =
        v_evidence_id

      and evidence.integrity_fingerprint =
        v_integrity_fingerprint

    returning
      evidence.*
    into
      v_applied;

    if not found then
      raise exception
        'HSPP evidence assessment batch target was not found or no longer matched its integrity identity';
    end if;

    v_applied_count :=
      v_applied_count + 1;

    return query
    select
      v_applied.id,
      v_applied.trust_state,
      v_applied.operational_eligible,
      v_applied.crowd_eligible,
      v_applied.training_eligible,
      v_applied.validation_eligible,
      v_applied.assessment_policy_version,
      v_applied.assessment_reason,
      v_applied.assessed_at;

  end loop;

  if v_applied_count <> v_expected_count then
    raise exception
      'HSPP assessment batch applied row count did not match requested row count';
  end if;

end;
$$;

revoke all
on function
public.apply_hspp_assessment_decisions_batch(
  uuid,
  jsonb
)
from
  public,
  anon,
  authenticated,
  service_role;

grant execute
on function
public.apply_hspp_assessment_decisions_batch(
  uuid,
  jsonb
)
to
  service_role;

comment on function
public.apply_hspp_assessment_decisions_batch(
  uuid,
  jsonb
)
is
  'Atomic HSPP assessment batch persistence boundary for trusted provider ingestion. Validates the complete decision set before mutation, acquires deterministic organization/evidence transaction locks, preserves organization/id/integrity-fingerprint fencing, applies assessment provenance inside one PostgreSQL transaction, and fails closed so any invalid or missing evidence identity rolls back the complete batch. It does not calculate assessments, create evidence or grant downstream authority.';
