-- B7490-07C1a
-- Single-membership and concurrent assembly-claim protection.
--
-- Invariant:
--
--   Within one organization, one immutable HSPP evidence identity
--   may belong to at most one evidence assembly.
--
-- Protection is deliberately layered:
--
--   1. UNIQUE (organization_id, evidence_id) is the authoritative
--      persisted database invariant.
--
--   2. persist_hspp_evidence_assembly acquires deterministic
--      transaction-level advisory locks for all supplied evidence
--      identities before checking existing membership.
--
--   3. After the locks are held, the RPC explicitly fails if any
--      evidence identity is already assembled.
--
--   4. Assembly creation and initial member insertion remain inside
--      the same PostgreSQL transaction.
--
-- This migration does NOT:
--
-- - decide whether evidence records belong together;
-- - perform B11A2 membership evaluation;
-- - change Reservoir eligibility;
-- - seal an evidence assembly;
-- - create an HSPP assembly decision;
-- - alter evidence trust;
-- - apply HSPP assessments;
-- - establish physical-world truth;
-- - grant Route Safety authority;
-- - grant Crowd Intelligence eligibility;
-- - grant ML training or validation eligibility.


-- ------------------------------------------------------------
-- Fail closed if historical data would violate the new invariant.
-- ------------------------------------------------------------

do $$
declare
  v_duplicate record;
begin
  select
    organization_id,
    evidence_id,
    count(*) as membership_count
  into v_duplicate
  from public.hspp_evidence_assembly_members
  group by
    organization_id,
    evidence_id
  having count(*) > 1
  order by
    organization_id,
    evidence_id
  limit 1;

  if found then
    raise exception
      'Cannot enforce HSPP single-assembly membership: organization % evidence % currently has % assembly memberships.',
      v_duplicate.organization_id,
      v_duplicate.evidence_id,
      v_duplicate.membership_count;
  end if;
end;
$$;


-- ------------------------------------------------------------
-- Authoritative persisted invariant.
-- ------------------------------------------------------------

alter table public.hspp_evidence_assembly_members
  add constraint
    hspp_evidence_assembly_members_org_evidence_single_assembly
  unique (
    organization_id,
    evidence_id
  );


-- ------------------------------------------------------------
-- Upgrade the existing atomic B07C1 persistence RPC.
-- ------------------------------------------------------------

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

  v_lock_evidence_id uuid;

  v_existing_membership record;
begin

  -- ----------------------------------------------------------
  -- Base request validation.
  -- ----------------------------------------------------------

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


  -- ----------------------------------------------------------
  -- Reject duplicate evidence identities inside this request.
  -- ----------------------------------------------------------

  select
    count(
      distinct item ->> 'evidenceId'
    )
  into v_distinct_evidence_count
  from jsonb_array_elements(
    p_members
  ) item;

  if
    v_distinct_evidence_count
      <> v_member_count
  then
    raise exception
      'HSPP evidence assembly cannot contain duplicate evidence identities';
  end if;


  -- ----------------------------------------------------------
  -- Validate every member before taking locks or writing.
  -- ----------------------------------------------------------

  for v_member in
    select value
    from jsonb_array_elements(
      p_members
    )
  loop

    if
      v_member ->> 'evidenceId' is null
      or length(
        trim(
          v_member ->> 'evidenceId'
        )
      ) = 0
    then
      raise exception
        'HSPP assembly member evidenceId is required';
    end if;

    begin
      v_evidence_id :=
        (
          v_member ->> 'evidenceId'
        )::uuid;
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

    if
      v_fingerprint
        !~ '^[0-9a-f]{64}$'
    then
      raise exception
        'HSPP assembly member integrityFingerprint must be a lowercase SHA-256 fingerprint';
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- B07C1a concurrency boundary.
  --
  -- Acquire one transaction-level advisory lock for each
  -- organization-scoped evidence identity.
  --
  -- Evidence IDs are sorted before lock acquisition so competing
  -- transactions always request the same lock set in the same order.
  -- This avoids opposite-order lock acquisition for pairs such as:
  --
  --   transaction A: [evidence-1, evidence-2]
  --   transaction B: [evidence-2, evidence-1]
  --
  -- The lock identity is:
  --
  --   harborguard:hspp-evidence-assembly-membership:
  --       organization_id:evidence_id
  --
  -- UNIQUE (organization_id, evidence_id) remains the final
  -- persisted invariant even if advisory hash collisions occur.
  -- ----------------------------------------------------------

  for v_lock_evidence_id in

    select
      distinct (
        item ->> 'evidenceId'
      )::uuid as evidence_id

    from jsonb_array_elements(
      p_members
    ) item

    order by evidence_id

  loop

    perform pg_advisory_xact_lock(
      hashtextextended(
        'harborguard:hspp-evidence-assembly-membership:' ||
        p_organization_id::text ||
        ':' ||
        v_lock_evidence_id::text,
        0
      )
    );

  end loop;


  -- ----------------------------------------------------------
  -- Re-check assembly ownership AFTER evidence locks are held.
  --
  -- Reservoir discovery may have observed this evidence as
  -- unassembled earlier. This check is intentionally performed
  -- again at the persistence boundary because another transaction
  -- may have assembled it since discovery.
  -- ----------------------------------------------------------

  select
    members.evidence_id,
    members.assembly_id

  into v_existing_membership

  from public.hspp_evidence_assembly_members
    as members

  where
    members.organization_id =
      p_organization_id

    and members.evidence_id in (
      select
        (
          item ->> 'evidenceId'
        )::uuid

      from jsonb_array_elements(
        p_members
      ) item
    )

  order by
    members.evidence_id,
    members.assembly_id

  limit 1;


  if found then
    raise exception
      'HSPP evidence % is already assembled in assembly %.',
      v_existing_membership.evidence_id,
      v_existing_membership.assembly_id;
  end if;


  -- ----------------------------------------------------------
  -- Atomic OPEN assembly creation.
  -- ----------------------------------------------------------

  insert into public.hspp_evidence_assemblies (
    organization_id,
    assembly_version,
    membership_policy_version,
    assembly_state
  )
  values (
    p_organization_id,
    trim(
      p_assembly_version
    ),
    trim(
      p_membership_policy_version
    ),
    'OPEN'
  )
  returning id
  into v_assembly_id;


  -- ----------------------------------------------------------
  -- Initial immutable membership.
  --
  -- Preserve caller order as deterministic member ordinal.
  -- ----------------------------------------------------------

  for v_member in
    select value
    from jsonb_array_elements(
      p_members
    )
  loop

    v_ordinal :=
      v_ordinal + 1;

    v_evidence_id :=
      (
        v_member ->> 'evidenceId'
      )::uuid;

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

  from public.hspp_evidence_assemblies
    as assembly

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
from
  public,
  anon,
  authenticated;


grant execute
on function public.persist_hspp_evidence_assembly(
  uuid,
  text,
  text,
  jsonb
)
to service_role;


comment on constraint
  hspp_evidence_assembly_members_org_evidence_single_assembly
on public.hspp_evidence_assembly_members
is
  'B7490-07C1a authoritative single-membership invariant. Within one organization, one immutable HSPP evidence identity may belong to at most one evidence assembly.';


comment on function
  public.persist_hspp_evidence_assembly(
    uuid,
    text,
    text,
    jsonb
  )
is
  'B7490-07C1a atomic and concurrency-safe HSPP assembly persistence boundary. It acquires deterministic organization/evidence transaction locks, rejects evidence already owned by another assembly, and relies on UNIQUE (organization_id, evidence_id) as the authoritative persisted single-membership invariant. It does not decide membership, seal assemblies, alter trust, apply assessments, or grant downstream authority.';