-- B7490-07C1
-- Atomic HSPP evidence-assembly persistence.
--
-- This function creates one OPEN evidence assembly together with
-- its initial immutable member identities in one PostgreSQL
-- transaction boundary.
--
-- PostgreSQL functions execute atomically with the calling statement:
-- if any validation, assembly insert, member insert, trigger,
-- foreign-key constraint, or check constraint fails, the complete
-- function call fails and its writes are rolled back.
--
-- This function does NOT:
--
-- - decide whether evidence belongs together;
-- - perform B11A2 membership evaluation;
-- - seal the assembly;
-- - create an HSPP assembly decision;
-- - alter evidence trust;
-- - apply HSPP assessments;
-- - establish physical-world truth;
-- - grant Route Safety authority;
-- - grant Crowd Intelligence eligibility;
-- - grant ML training or validation eligibility.

create or replace function public.persist_hspp_evidence_assembly(
  p_organization_id uuid,
  p_assembly_version text,
  p_membership_policy_version text,
  p_members jsonb
)
returns table (
  assembly_id uuid,
  organization_id uuid,
  assembly_version text,
  membership_policy_version text,
  assembly_state text,
  persisted_member_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_assembly_id uuid;
  v_member_count integer;
  v_distinct_evidence_count integer;
  v_member jsonb;
  v_ordinal integer := 0;
  v_evidence_id uuid;
  v_fingerprint text;
begin
  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if
    p_assembly_version is null
    or length(trim(p_assembly_version)) = 0
  then
    raise exception
      'p_assembly_version is required';
  end if;

  if
    p_membership_policy_version is null
    or length(trim(p_membership_policy_version)) = 0
  then
    raise exception
      'p_membership_policy_version is required';
  end if;

  if
    p_members is null
    or jsonb_typeof(p_members) <> 'array'
  then
    raise exception
      'p_members must be a JSON array';
  end if;

  v_member_count :=
    jsonb_array_length(p_members);

  if v_member_count < 2 then
    raise exception
      'HSPP evidence assembly requires at least two members';
  end if;

  select count(distinct item ->> 'evidenceId')
  into v_distinct_evidence_count
  from jsonb_array_elements(p_members) item;

  if v_distinct_evidence_count <> v_member_count then
    raise exception
      'HSPP evidence assembly cannot contain duplicate evidence identities';
  end if;

  -- Validate the complete member input before creating the assembly.
  for v_member in
    select value
    from jsonb_array_elements(p_members)
  loop
    if
      v_member ->> 'evidenceId' is null
      or length(trim(v_member ->> 'evidenceId')) = 0
    then
      raise exception
        'HSPP assembly member evidenceId is required';
    end if;

    begin
      v_evidence_id :=
        (v_member ->> 'evidenceId')::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'HSPP assembly member evidenceId must be a UUID';
    end;

    v_fingerprint :=
      trim(
        coalesce(
          v_member ->> 'integrityFingerprint',
          ''
        )
      );

    if v_fingerprint !~ '^[0-9a-f]{64}$' then
      raise exception
        'HSPP assembly member integrityFingerprint must be a lowercase SHA-256 fingerprint';
    end if;
  end loop;

  insert into public.hspp_evidence_assemblies (
    organization_id,
    assembly_version,
    membership_policy_version,
    assembly_state
  )
  values (
    p_organization_id,
    trim(p_assembly_version),
    trim(p_membership_policy_version),
    'OPEN'
  )
  returning id
  into v_assembly_id;

  for v_member in
    select value
    from jsonb_array_elements(p_members)
  loop
    v_ordinal := v_ordinal + 1;

    v_evidence_id :=
      (v_member ->> 'evidenceId')::uuid;

    v_fingerprint :=
      trim(
        v_member ->> 'integrityFingerprint'
      );

    insert into public.hspp_evidence_assembly_members (
      organization_id,
      assembly_id,
      evidence_id,
      evidence_integrity_fingerprint,
      member_ordinal
    )
    values (
      p_organization_id,
      v_assembly_id,
      v_evidence_id,
      v_fingerprint,
      v_ordinal
    );
  end loop;

  return query
  select
    assembly.id,
    assembly.organization_id,
    assembly.assembly_version,
    assembly.membership_policy_version,
    assembly.assembly_state,
    v_member_count
  from public.hspp_evidence_assemblies assembly
  where
    assembly.organization_id =
      p_organization_id
    and assembly.id =
      v_assembly_id;
end;
$$;

revoke all
on function public.persist_hspp_evidence_assembly(
  uuid,
  text,
  text,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.persist_hspp_evidence_assembly(
  uuid,
  text,
  text,
  jsonb
)
to service_role;

comment on function
  public.persist_hspp_evidence_assembly(
    uuid,
    text,
    text,
    jsonb
  )
is
  'B7490-07C1 atomic persistence boundary. Creates one OPEN HSPP evidence assembly and its initial immutable evidence members in one PostgreSQL transaction. Failure rolls back the complete function call. It does not decide membership, seal the assembly, alter trust, apply assessments, or grant downstream authority.';