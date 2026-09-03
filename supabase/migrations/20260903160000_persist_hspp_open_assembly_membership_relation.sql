-- B7490-Q14AG35AS26A
--
-- Persist one already-computed B11A2 membership relation against an
-- already-existing OPEN two-member HSPP evidence assembly.
--
-- This authority exists for reconstructed child assemblies whose immutable
-- members are created by Q14h before their new child-specific B11A2 relation
-- can be evaluated.
--
-- It deliberately does NOT:
--
-- - execute B11A2;
-- - choose evidence;
-- - add, remove or replace assembly members;
-- - create or reconstruct an assembly;
-- - seal an assembly;
-- - scan or assess a SEALED assembly;
-- - alter trust;
-- - grant Route Safety, Crowd Intelligence, ML or validation authority.
--
-- Exact immutable retries recover the existing relation.
-- Conflicting retries fail closed.

create or replace function
  public.persist_hspp_open_assembly_membership_relation(
    p_organization_id uuid,
    p_assembly_id uuid,
    p_membership_relation jsonb
  )
returns table (
  organization_id uuid,
  assembly_id uuid,
  first_evidence_id uuid,
  second_evidence_id uuid,
  membership_eligible boolean,
  membership_policy_version text,
  membership_reason text,
  distance_meters double precision,
  time_delta_ms bigint,
  idempotent_recovery boolean
)
language plpgsql
set search_path = public
as $$
declare
  v_assembly
    public.hspp_evidence_assemblies%rowtype;

  v_member_count integer;

  v_first_evidence_id uuid;
  v_second_evidence_id uuid;

  v_relation_policy_version text;
  v_relation_reason text;

  v_relation_distance double precision;
  v_relation_time_delta bigint;

  v_existing
    public.hspp_evidence_assembly_membership_relations%rowtype;
begin

  if p_organization_id is null then
    raise exception
      'p_organization_id is required';
  end if;

  if p_assembly_id is null then
    raise exception
      'p_assembly_id is required';
  end if;

  if
    p_membership_relation is null
    or jsonb_typeof(p_membership_relation) <> 'object'
  then
    raise exception
      'p_membership_relation must be a JSON object';
  end if;


  -- ------------------------------------------------------------
  -- Lock the exact assembly first.
  --
  -- This serializes relation persistence against sealing because B07C3
  -- also locks the assembly before OPEN -> SEALED mutation.
  -- ------------------------------------------------------------

  select
    *
  into
    v_assembly
  from
    public.hspp_evidence_assemblies
  where
    organization_id =
      p_organization_id
    and id =
      p_assembly_id
  for update;

  if not found then
    raise exception
      'Referenced HSPP evidence assembly does not exist.';
  end if;


  -- ------------------------------------------------------------
  -- Existing immutable relation recovery.
  --
  -- The existing fact wins over a retry, but only an exact byte-semantic
  -- relation retry may recover successfully.
  -- ------------------------------------------------------------

  select
    *
  into
    v_existing
  from
    public.hspp_evidence_assembly_membership_relations
  where
    organization_id =
      p_organization_id
    and assembly_id =
      p_assembly_id;

  -- Parse the caller-owned already-computed relation before either
  -- recovery comparison or new insertion.

  begin
    v_first_evidence_id :=
      (
        p_membership_relation
          ->> 'firstEvidenceId'
      )::uuid;

    v_second_evidence_id :=
      (
        p_membership_relation
          ->> 'secondEvidenceId'
      )::uuid;

  exception
    when invalid_text_representation then
      raise exception
        'HSPP membership relation evidence IDs must be UUIDs';
  end;

  if
    v_first_evidence_id is null
    or v_second_evidence_id is null
  then
    raise exception
      'HSPP membership relation requires both evidence identities';
  end if;

  if
    v_first_evidence_id =
      v_second_evidence_id
  then
    raise exception
      'HSPP membership relation requires distinct evidence identities';
  end if;


  if
    p_membership_relation
      -> 'membershipEligible'
    is distinct from
      'true'::jsonb
  then
    raise exception
      'Persisted HSPP assembly membership relation must be eligible';
  end if;


  v_relation_policy_version :=
    trim(
      coalesce(
        p_membership_relation
          ->> 'membershipPolicyVersion',
        ''
      )
    );

  if
    not length(v_relation_policy_version) > 0
  then
    raise exception
      'Membership relation policy version is required';
  end if;

  if
    v_relation_policy_version <>
      trim(
        v_assembly.membership_policy_version
      )
  then
    raise exception
      'Membership relation policy version must match assembly policy version';
  end if;


  v_relation_reason :=
    trim(
      coalesce(
        p_membership_relation
          ->> 'membershipReason',
        ''
      )
    );

  if v_relation_reason <> 'ELIGIBLE' then
    raise exception
      'Eligible membership relation must preserve reason ELIGIBLE';
  end if;


  if
    p_membership_relation ? 'distanceMeters'
    and
    p_membership_relation
      -> 'distanceMeters'
      <> 'null'::jsonb
  then
    begin
      v_relation_distance :=
        (
          p_membership_relation
            ->> 'distanceMeters'
        )::double precision;

    exception
      when invalid_text_representation then
        raise exception
          'Membership relation distanceMeters must be numeric or null';
    end;

    if
      not isfinite(v_relation_distance)
      or v_relation_distance < 0
    then
      raise exception
        'Membership relation distanceMeters must be a non-negative finite number or null';
    end if;
  else
    v_relation_distance := null;
  end if;


  if
    p_membership_relation ? 'timeDeltaMs'
    and
    p_membership_relation
      -> 'timeDeltaMs'
      <> 'null'::jsonb
  then
    begin
      v_relation_time_delta :=
        (
          p_membership_relation
            ->> 'timeDeltaMs'
        )::bigint;

    exception
      when invalid_text_representation
        or numeric_value_out_of_range
      then
        raise exception
          'Membership relation timeDeltaMs must be an integer or null';
    end;

    if v_relation_time_delta < 0 then
      raise exception
        'Membership relation timeDeltaMs cannot be negative';
    end if;
  else
    v_relation_time_delta := null;
  end if;


  -- ------------------------------------------------------------
  -- Exact immutable retry.
  --
  -- Recovery is permitted even if the assembly has since become SEALED:
  -- the relation already existed while OPEN, so this call creates no new
  -- provenance and performs no lifecycle mutation.
  -- ------------------------------------------------------------

  if v_existing.id is not null then

    if
      v_existing.first_evidence_id
        is distinct from v_first_evidence_id
      or
      v_existing.second_evidence_id
        is distinct from v_second_evidence_id
      or
      v_existing.membership_eligible
        is distinct from true
      or
      v_existing.membership_policy_version
        is distinct from v_relation_policy_version
      or
      v_existing.membership_reason
        is distinct from v_relation_reason
      or
      v_existing.distance_meters
        is distinct from v_relation_distance
      or
      v_existing.time_delta_ms
        is distinct from v_relation_time_delta
    then
      raise exception
        'Existing HSPP assembly membership relation conflicts with this retry.';
    end if;

    return query
    select
      v_existing.organization_id,
      v_existing.assembly_id,
      v_existing.first_evidence_id,
      v_existing.second_evidence_id,
      v_existing.membership_eligible,
      v_existing.membership_policy_version,
      v_existing.membership_reason,
      v_existing.distance_meters,
      v_existing.time_delta_ms,
      true;

    return;
  end if;


  -- New provenance may be created only while OPEN.

  if v_assembly.assembly_state <> 'OPEN' then
    raise exception
      'Cannot add membership provenance to a non-OPEN HSPP evidence assembly.';
  end if;

  if v_assembly.sealed_at is not null then
    raise exception
      'OPEN HSPP evidence assembly must not already contain sealed_at.';
  end if;


  -- ------------------------------------------------------------
  -- This boundary currently supports the same B11A2 v1 pair model
  -- already enforced by B7490-07K5: exactly two immutable members.
  -- ------------------------------------------------------------

  select
    count(*)
  into
    v_member_count
  from
    public.hspp_evidence_assembly_members
  where
    organization_id =
      p_organization_id
    and assembly_id =
      p_assembly_id;

  if v_member_count <> 2 then
    raise exception
      'B7490 open-assembly membership provenance currently requires exactly two assembly members';
  end if;


  -- Both relation identities must be assembly members.

  if not exists (
    select 1
    from
      public.hspp_evidence_assembly_members
    where
      organization_id =
        p_organization_id
      and assembly_id =
        p_assembly_id
      and evidence_id =
        v_first_evidence_id
  ) then
    raise exception
      'First membership relation evidence is not a member of the assembly.';
  end if;


  if not exists (
    select 1
    from
      public.hspp_evidence_assembly_members
    where
      organization_id =
        p_organization_id
      and assembly_id =
        p_assembly_id
      and evidence_id =
        v_second_evidence_id
  ) then
    raise exception
      'Second membership relation evidence is not a member of the assembly.';
  end if;


  -- With exactly two members and two distinct proven member identities,
  -- the supplied pair is necessarily the exact complete child pair.


  insert into
    public.hspp_evidence_assembly_membership_relations (
      organization_id,
      assembly_id,
      first_evidence_id,
      second_evidence_id,
      membership_eligible,
      membership_policy_version,
      membership_reason,
      distance_meters,
      time_delta_ms
    )
  values (
    p_organization_id,
    p_assembly_id,
    v_first_evidence_id,
    v_second_evidence_id,
    true,
    v_relation_policy_version,
    v_relation_reason,
    v_relation_distance,
    v_relation_time_delta
  )
  returning
    public.hspp_evidence_assembly_membership_relations.*
  into
    v_existing;


  return query
  select
    v_existing.organization_id,
    v_existing.assembly_id,
    v_existing.first_evidence_id,
    v_existing.second_evidence_id,
    v_existing.membership_eligible,
    v_existing.membership_policy_version,
    v_existing.membership_reason,
    v_existing.distance_meters,
    v_existing.time_delta_ms,
    false;

end;
$$;


revoke all
on function
  public.persist_hspp_open_assembly_membership_relation(
    uuid,
    uuid,
    jsonb
  )
from
  public,
  anon,
  authenticated;


grant execute
on function
  public.persist_hspp_open_assembly_membership_relation(
    uuid,
    uuid,
    jsonb
  )
to
  service_role;


comment on function
  public.persist_hspp_open_assembly_membership_relation(
    uuid,
    uuid,
    jsonb
  )
is
  'B7490-Q14AG35AS26A service-role-only immutable B11A2 persistence boundary for an already-existing HSPP evidence assembly. PostgreSQL locks the exact organization-scoped assembly, validates one caller-computed eligible B11A2 relation against the assembly policy and its exact two immutable members, inserts new provenance only while OPEN, recovers an identical immutable retry, and fails closed on conflicting retries. It does not execute B11A2, choose evidence, modify membership, seal or assess the assembly, alter trust, or grant downstream authority.';